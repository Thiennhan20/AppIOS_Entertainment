import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, ScrollView, FlatList,
  TouchableOpacity, Dimensions, ActivityIndicator, Modal, Alert
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { tmdbApi } from '../../api/tmdb';
import { chatAIApi } from '../../api/chatAI';
import { authApi } from '../../api/authApi';
import { phimApi } from '../../api/phimapi';
import { nguoncApi } from '../../api/nguonc';
import { useTheme } from '../../context/ThemeContext';
import WatchlistButton from '../../components/WatchlistButton';
import LongPressMoviePopup from '../../components/LongPressMoviePopup';
import CustomAlert from '../../components/CustomAlert';

const { width, height } = Dimensions.get('window');

export default function DetailScreenMovie({ route, navigation }: any) {
  const { t } = useTranslation();
  const { themeColor } = useTheme();
  const { item, isTV } = route.params;
  const [details, setDetails] = useState<any>(null);
  const [cast, setCast] = useState<any[]>([]);
  const [similar, setSimilar] = useState<any[]>([]);
  
  // AI State
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);

  const [selectedMovie, setSelectedMovie] = useState<any>(null);

  const [selectedServer, setSelectedServer] = useState<'Server 1' | 'Server 3'>('Server 1');
  const [showServerPicker, setShowServerPicker] = useState(false);

  const [selectedAudio, setSelectedAudio] = useState<'vietsub'|'dubbed'>('vietsub');
  const [showAudioPicker, setShowAudioPicker] = useState(false);

  const [alertInfo, setAlertInfo] = useState({
    visible: false,
    title: '',
    message: '',
    isError: false,
  });

  const showAlert = (title: string, message: string, isError: boolean = false) => {
    setAlertInfo({ visible: true, title, message, isError });
  };

  const [s1Available, setS1Available] = useState<('vietsub'|'dubbed')[]>([]);
  const [s3Available, setS3Available] = useState<('vietsub'|'dubbed')[]>([]);
  const [s1LinksData, setS1LinksData] = useState<any>(null);
  const [s3LinksData, setS3LinksData] = useState<any>(null);
  const [checkingStreams, setCheckingStreams] = useState(true);

  const handleLongPress = (item: any, isTVItem: boolean) => {
    setSelectedMovie({ ...item, isTV: isTVItem });
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        let res, credits, sim, videos;
        if (isTV) {
          [res, credits, sim, videos] = await Promise.all([
            tmdbApi.getTVDetail(item.id),
            tmdbApi.getTVCredits(item.id),
            tmdbApi.getSimilarTV(item.id),
            tmdbApi.getTVVideos(item.id)
          ]);
        } else {
          [res, credits, sim, videos] = await Promise.all([
            tmdbApi.getMovieDetail(item.id),
            tmdbApi.getMovieCredits(item.id),
            tmdbApi.getSimilarMovies(item.id),
            tmdbApi.getMovieVideos(item.id)
          ]);
        }
        setDetails(res);
        setCast((credits as any)?.cast || []);
        setSimilar((sim as any)?.results?.filter((i:any) => i.poster_path) || []);
        
        const vidList = (videos as any)?.results || [];
        const ytTrailer = vidList.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
        if (ytTrailer) {
          setTrailerKey(ytTrailer.key);
        }
      } catch (error) {
        console.warn("Failed fetching metadata");
      }
    };
    fetchDetails();
  }, [item.id, isTV]);

  const title = details?.title || details?.name || item?.title || item?.name;
  const overview = details?.overview || item?.overview;
  const year = details?.release_date?.substring(0,4) || details?.first_air_date?.substring(0,4) || item?.release_date?.substring(0,4) || '2023';
  const director = details?.credits?.crew?.find((c:any) => c.job === 'Director')?.name || '';

  // Check available streams in background to populate Audio Picker options
  useEffect(() => {
    if (!title || !year) return;
    let isMounted = true;

    const checkTracks = async () => {
      if (isMounted) setCheckingStreams(true);
      try {
        const [s1Tracks, s3Links] = await Promise.all([
          phimApi.getStreamingLink(item.id.toString(), title, parseInt(year), 1, isTV, 1),
          nguoncApi.getStreamingLink(isTV, title, parseInt(year), director, 1, 1)
        ]);

        if (!isMounted) return;

        const s1: ('vietsub'|'dubbed')[] = [];
        if (s1Tracks) {
          if (s1Tracks.some((a: any) => {
            const low = a.name.toLowerCase();
            return low.includes('vietsub') || low.includes('phụ đề') || low.includes('sub');
          })) s1.push('vietsub');
          if (s1Tracks.some((a: any) => {
            const low = a.name.toLowerCase();
            return low.includes('thuyết minh') || low.includes('dub') || low.includes('lồng tiếng');
          })) s1.push('dubbed');
        }

        const s3: ('vietsub'|'dubbed')[] = [];
        if (s3Links) {
          if (s3Links.vietsub) s3.push('vietsub');
          if (s3Links.dubbed) s3.push('dubbed');
        }

        setS1LinksData(s1Tracks);
        setS3LinksData(s3Links);

        setS1Available(s1);
        setS3Available(s3);
        
        // Auto select first available audio if current selection is not available
        const activeList = selectedServer === 'Server 1' ? s1 : s3;
        if (activeList.length > 0 && !activeList.includes(selectedAudio)) {
          setSelectedAudio(activeList[0]);
        }
      } catch(e) {
      } finally {
        if (isMounted) setCheckingStreams(false);
      }
    };
    
    checkTracks();
    return () => { isMounted = false; };
  }, [title, year, selectedServer]);

  const activeAudioList = selectedServer === 'Server 1' ? s1Available : s3Available;

  const handlePlay = async () => {
    if (checkingStreams) return;
    
    try {
      if (selectedServer === 'Server 1') {
        let audioTracks = s1LinksData;
        if (!audioTracks) {
          audioTracks = await phimApi.getStreamingLink(item.id.toString(), title, parseInt(year), 1, isTV, 1);
        }
        
        if (audioTracks && audioTracks.length > 0) {
          
          // Match selectedAudio with Server 1 track names (Vietsub, Thuyết Minh, etc.)
          let streamObj = audioTracks.find((a: any) => {
            const lowerName = a.name.toLowerCase();
            if (selectedAudio === 'vietsub') return lowerName.includes('vietsub') || lowerName.includes('phụ đề') || lowerName.includes('sub');
            if (selectedAudio === 'dubbed') return lowerName.includes('thuyết minh') || lowerName.includes('lồng tiếng') || lowerName.includes('dub');
            return false;
          });

          // Fallback if the requested track is not available
          if (!streamObj) streamObj = audioTracks[0];

          if (streamObj && streamObj.url) {
            navigation.navigate('PlayerScreen', { 
              item, isTV, 
              streamUrl: streamObj.url, 
              activePlayer: streamObj.url.includes('.m3u8') ? 'm3u8' : 'embed',
              title: isTV ? `${title} - S1 E1` : title,
              selectedServer,
              selectedAudio,
              seasons: details?.seasons
            });
          } else {
            showAlert(t('general.notice'), t('player.stream_not_on_server_1', { defaultValue: 'Movie not available on Server 1.\nPlease try Server 3.' }));
          }
        } else {
          showAlert(t('general.notice'), t('player.stream_not_on_server_1', { defaultValue: 'Movie not available on Server 1.\nPlease try Server 3.' }));
        }
      } else {
        let links = s3LinksData;
        if (!links) {
          links = await nguoncApi.getStreamingLink(isTV, title, parseInt(year), director, 1, 1);
        }
        if (links) {
          const urlStr = links[selectedAudio];
          if (urlStr) {
             const finalUrl = urlStr.startsWith('//') ? 'https:' + urlStr : urlStr;
             navigation.navigate('PlayerScreen', {
               item, isTV,
               streamUrl: finalUrl,
               activePlayer: finalUrl.includes('.m3u8') ? 'm3u8' : 'embed',
               title: isTV ? `${title} - S1 E1` : title,
               selectedServer,
               selectedAudio,
               seasons: details?.seasons
             });
          } else {
             showAlert(t('general.notice'), t('player.stream_not_on_server_3', { defaultValue: 'Movie not available on Server 3.\nPlease try Server 1.' }));
          }
        } else {
          showAlert(t('general.notice'), t('player.stream_not_on_server_3', { defaultValue: 'Movie not available on Server 3.\nPlease try Server 1.' }));
        }
      }
    } catch (e) {
      showAlert(t('general.error', { defaultValue: 'Error' }), t('player.error_loading_stream', { defaultValue: 'Failed to load movie link.\nPlease try another Server.' }), true);
    }
  };

  const posterUri = details?.poster_path || item?.poster_path;
  const backdropUri = details?.backdrop_path || item?.backdrop_path;
  const featuredImageUri = backdropUri 
    ? `https://image.tmdb.org/t/p/w780${backdropUri}`
    : (posterUri ? `https://image.tmdb.org/t/p/w400${posterUri}` : 'https://via.placeholder.com/400x600');

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Backdrop */}
        <View style={styles.backdropContainer}>
          <Image source={{ uri: featuredImageUri }} style={styles.backdropImage} />
          <LinearGradient colors={['transparent', '#0f0f13']} style={styles.gradient} />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{title}</Text>
          
          <View style={styles.metaRow}>
            <Text style={styles.matchText}>98% {t('general.match', { defaultValue: 'Match' })}</Text>
            <Text style={styles.metaText}>{year}</Text>
            <Text style={styles.ageRating}>16+</Text>
            <Text style={styles.metaText}>{details?.runtime ? `${details.runtime}m` : `1 ${t('general.season', { defaultValue: 'Season' })}`}</Text>
          </View>

          {/* New Selector Dropdowns Container */}
          <View style={styles.selectorsBox}>
            <View style={styles.selectorsRow}>
              {/* Server Option */}
              <TouchableOpacity style={styles.selectorBtn} onPress={() => setShowServerPicker(true)}>
                <Ionicons name="server-outline" size={16} color="#aaa" style={{marginRight: 6}} />
                <Text style={styles.selectorBtnText}>{selectedServer}</Text>
                <Ionicons name="chevron-down" size={16} color="#aaa" />
              </TouchableOpacity>

              {/* Audio Selection */}
              {checkingStreams ? (
                <View style={[styles.selectorBtn, { marginLeft: 10 }]}>
                   <ActivityIndicator size="small" color="#aaa" />
                </View>
              ) : activeAudioList.length > 0 ? (
                <TouchableOpacity style={[styles.selectorBtn, { marginLeft: 10 }]} onPress={() => setShowAudioPicker(true)}>
                  <Ionicons name="musical-notes-outline" size={16} color="#aaa" style={{marginRight: 6}} />
                  <Text style={styles.selectorBtnText}>
                    {selectedAudio === 'vietsub' ? t('player.subtitled', { defaultValue: 'Subtitled' }) : t('player.dubbed', { defaultValue: 'Dubbed' })}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#aaa" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Player controls and quick actions */}
          <View style={styles.playControlsRow}>
            <TouchableOpacity 
              style={[styles.playButtonFull, { backgroundColor: checkingStreams ? '#333' : themeColor }]}
              onPress={handlePlay}
              disabled={checkingStreams}
            >
              <Ionicons name="play" size={20} color={checkingStreams ? "#888" : "white"} />
              <Text style={[styles.playButtonText, { color: checkingStreams ? '#888' : 'white' }]}>
                {t('general.play_now')}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionRowMini}>
              <TouchableOpacity 
                style={styles.actionItemMini} 
                onPress={() => {
                  if (trailerKey) setShowTrailer(true);
                  else showAlert(t('general.notice'), t('home.cannot_load_trailer'), true);
                }}
              >
                <Ionicons name="film-outline" size={24} color={trailerKey ? "white" : "gray"} />
                <Text style={styles.actionItemTextMini}>{t('home.trailer')}</Text>
              </TouchableOpacity>
              <WatchlistButton movie={{ ...item, isTV }} styleType="detail" />
              <TouchableOpacity style={styles.actionItemMini}>
                <Ionicons name="star-outline" size={24} color="white" />
                <Text style={styles.actionItemTextMini}>{t('general.rate', { defaultValue: 'Rate' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionItemMini}>
                <Ionicons name="share-social-outline" size={24} color="white" />
                <Text style={styles.actionItemTextMini}>{t('general.share')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Features */}
          <View style={styles.aiBox}>
            <TouchableOpacity 
              style={styles.aiSummaryButton}
              onPress={async () => {
                if (aiSummary) return;
                setLoadingAi(true);
                try {
                  const sum = await chatAIApi.summarizeMovie(
                    title, overview, parseInt(year)
                  );
                  setAiSummary(sum);
                } catch {
                  setAiSummary(t('ai.busy'));
                }
                setLoadingAi(false);
              }}
            >
              <Ionicons name="sparkles" size={16} color="#f59e0b" style={{marginRight: 6}} />
              <Text style={{color: '#f59e0b', fontWeight: 'bold'}}>
                {loadingAi ? t('ai.summarizing') : t('ai.ai_hub_summary')}
              </Text>
            </TouchableOpacity>
            
            {aiSummary ? (
              <Text style={styles.aiSummaryText}>{aiSummary}</Text>
            ) : null}

            <TouchableOpacity 
              style={styles.aiRecommendButton}
              onPress={() => navigation.navigate('AI')}
            >
              <Text style={{color: '#3b82f6'}}>{t('ai.similar_movies_ai')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.overview}>{overview}</Text>
          


          {/* Cast List */}
          {cast.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{t('general.cast')}</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                data={cast.slice(0, 15)}
                keyExtractor={(item, idx) => `cast-${item.id}-${idx}`}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={3}
                renderItem={({ item }) => (
                  <View style={styles.castItem}>
                    <Image 
                      source={{ uri: item.profile_path ? `https://image.tmdb.org/t/p/w200${item.profile_path}` : 'https://via.placeholder.com/200x300?text=NTN' }} 
                      style={styles.castImage} 
                    />
                    <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.castRole} numberOfLines={1}>{item.character}</Text>
                  </View>
                )}
              />
            </View>
          )}

          {/* Similar Movies */}
          {similar.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{t('ai.similar_overview')}</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                data={similar.slice(0, 10)}
                keyExtractor={(item, idx) => `sim-${item.id}-${idx}`}
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={3}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.similarItem}
                    onPress={() => navigation.push('DetailScreen', { item, isTV })}
                    onLongPress={() => handleLongPress(item, isTV)}
                  >
                    <Image 
                      source={{ uri: `https://image.tmdb.org/t/p/w200${item.poster_path}` }} 
                      style={styles.similarPoster} 
                    />
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
          
          <View style={{height: 40}} />
        </View>
      </ScrollView>

      {/* Trailer Modal (như trên web) */}
      <Modal visible={showTrailer} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowTrailer(false)}>
        {showTrailer && (
          <View style={styles.trailerOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowTrailer(false)} />
            <View style={styles.trailerBox}>
               <View style={styles.trailerHeader}>
                  <Text style={styles.trailerTitle}>{t('home.trailer')}</Text>
                  <TouchableOpacity onPress={() => setShowTrailer(false)}>
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
               </View>
               {trailerKey && (
                 <View style={{ backgroundColor: '#000' }}>
                   <YoutubePlayer
                     height={Math.round((width * 0.9) * (9/16))}
                     width={Math.round(width * 0.9)}
                     play={true}
                     videoId={trailerKey}
                     initialPlayerParams={{
                       rel: false,
                       modestbranding: true,
                       preventFullScreen: true,
                     }}
                   />
                 </View>
               )}
            </View>
          </View>
        )}
      </Modal>

      {selectedMovie && (
        <LongPressMoviePopup
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}

      {/* Selectors Modals */}
      
      {/* Server Picker */}
      <Modal visible={showServerPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowServerPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('player.select_server', { defaultValue: 'Select Server' })}</Text>
            <TouchableOpacity style={styles.serverOption} onPress={() => { setSelectedServer('Server 1'); setShowServerPicker(false); }}>
              <Text style={styles.serverOptionText}>{t('player.server_1', { defaultValue: 'Server 1' })}</Text>
              {selectedServer === 'Server 1' && <Ionicons name="checkmark" size={20} color={themeColor} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.serverOption} onPress={() => { setSelectedServer('Server 3'); setShowServerPicker(false); }}>
              <Text style={styles.serverOptionText}>{t('player.server_3', { defaultValue: 'Server 3' })}</Text>
              {selectedServer === 'Server 3' && <Ionicons name="checkmark" size={20} color={themeColor} />}
            </TouchableOpacity>
            <TouchableOpacity style={{marginTop: 15, padding: 10}} onPress={() => setShowServerPicker(false)}>
              <Text style={{color: 'gray', textAlign: 'center'}}>{t('player.close', { defaultValue: 'Close' })}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Audio Picker Modal */}
      <Modal visible={showAudioPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAudioPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('player.select_audio_sub', { defaultValue: 'Select Track' })}</Text>
            {activeAudioList.map(aid => (
               <TouchableOpacity key={aid} style={styles.serverOption} onPress={() => { setSelectedAudio(aid as any); setShowAudioPicker(false); }}>
                 <Text style={styles.serverOptionText}>
                    {aid === 'vietsub' ? `📝 ${t('player.subtitled', { defaultValue: 'Subtitled' })}` : `🎙️ ${t('player.dubbed', { defaultValue: 'Dubbed' })}`}
                 </Text>
                 {selectedAudio === aid && <Ionicons name="checkmark" size={20} color={themeColor} />}
               </TouchableOpacity>
            ))}
            <TouchableOpacity style={{marginTop: 15, padding: 10}} onPress={() => setShowAudioPicker(false)}>
              <Text style={{color: 'gray', textAlign: 'center'}}>{t('player.close', { defaultValue: 'Close' })}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertInfo.visible}
        title={alertInfo.title}
        message={alertInfo.message}
        isError={alertInfo.isError}
        onClose={() => setAlertInfo(prev => ({ ...prev, visible: false }))}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f13',
  },
  backdropContainer: {
    height: height * 0.45,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 150,
  },
  backButton: {
    position: 'absolute',
    top: 50, left: 20, zIndex: 10,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  contentContainer: {
    paddingHorizontal: 15,
    marginTop: -20,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  matchText: {
    color: '#46d369',
    fontWeight: 'bold',
    marginRight: 10,
  },
  metaText: { color: 'gray', marginRight: 10 },
  ageRating: {
    color: 'gray',
    backgroundColor: '#333',
    paddingHorizontal: 4, borderRadius: 3,
    fontSize: 12, marginRight: 10,
  },
  playControlsRow: {
    flexDirection: 'column',
    marginBottom: 25,
    width: '100%',
  },
  playButtonFull: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    width: '100%',
    marginBottom: 20,
  },
  playButtonText: {
    color: 'black',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  selectorsBox: {
    marginBottom: 15,
    backgroundColor: '#1E1E1E',
    padding: 10,
    borderRadius: 8,
  },
  selectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  selectorBtnText: {
    color: '#ddd',
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  actionRowMini: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionItemMini: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  actionItemTextMini: {
    color: '#ccc',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
  overview: {
    color: '#fff',
    lineHeight: 22,
    marginBottom: 15,
  },

  // AI Styles
  aiBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 15,
  },
  aiSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  aiSummaryText: {
    color: '#fff',
    marginTop: 10,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  aiRecommendButton: {
    marginTop: 15,
    alignSelf: 'flex-start',
  },
  
  // Trailer Modal styles
  trailerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailerBox: {
    width: '90%',
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  trailerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    paddingHorizontal: 15,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  trailerTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Existing Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1c1c1c',
    width: '85%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  serverOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  serverOptionSelected: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  serverOptionText: {
    color: 'white',
    fontSize: 16,
  },
  sectionContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  horizontalList: {
    paddingRight: 15,
  },
  castItem: {
    width: 90,
    marginRight: 15,
    alignItems: 'center',
  },
  castImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#333',
  },
  castName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  castRole: {
    color: '#aaa',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  similarItem: {
    width: 120,
    marginRight: 12,
  },
  similarPoster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    resizeMode: 'cover',
  }
});
