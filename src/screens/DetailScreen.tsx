import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, ScrollView, FlatList,
  TouchableOpacity, Dimensions, ActivityIndicator, Modal, Alert
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { tmdbApi } from '../api/tmdb';
import { chatAIApi } from '../api/chatAI';
import { authApi } from '../api/authApi';
import { useTheme } from '../context/ThemeContext';
import WatchlistButton from '../components/WatchlistButton';
import LongPressMoviePopup from '../components/LongPressMoviePopup';

const { width, height } = Dimensions.get('window');

export default function DetailScreen({ route, navigation }: any) {
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

  const handlePlay = () => {
    navigation.navigate('PlayerScreen', { item, isTV });
  };

  const posterUri = details?.poster_path || item?.poster_path;
  const backdropUri = details?.backdrop_path || item?.backdrop_path;
  
  const featuredImageUri = backdropUri 
    ? `https://image.tmdb.org/t/p/w780${backdropUri}`
    : (posterUri ? `https://image.tmdb.org/t/p/w400${posterUri}` : 'https://via.placeholder.com/400x600');

  const title = details?.title || details?.name || item?.title || item?.name;
  const overview = details?.overview || item?.overview;
  const year = details?.release_date?.substring(0,4) || details?.first_air_date?.substring(0,4) || item?.release_date?.substring(0,4);
  const director = details?.credits?.crew?.find((c:any) => c.job === 'Director')?.name || '';

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
            <Text style={styles.metaText}>{details?.release_date?.substring(0,4) || details?.first_air_date?.substring(0,4)}</Text>
            <Text style={styles.ageRating}>16+</Text>
            <Text style={styles.metaText}>{details?.runtime ? `${details.runtime}m` : `1 ${t('general.season')}`}</Text>
          </View>

          {/* Player controls and quick actions */}
          <View style={styles.playControlsRow}>
            <TouchableOpacity 
              style={[styles.playButtonFull, { backgroundColor: themeColor }]}
              onPress={handlePlay}
            >
              <Ionicons name="play" size={20} color="white" />
              <Text style={[styles.playButtonText, { color: 'white' }]}>{t('general.play_now')}</Text>
            </TouchableOpacity>

            <View style={styles.actionRowMini}>
              <TouchableOpacity 
                style={styles.actionItemMini} 
                onPress={() => {
                  if (trailerKey) setShowTrailer(true);
                  else Alert.alert(t('general.notice'), t('home.cannot_load_trailer'));
                }}
              >
                <Ionicons name="film-outline" size={24} color={trailerKey ? "white" : "gray"} />
                <Text style={styles.actionItemTextMini}>{t('home.trailer')}</Text>
              </TouchableOpacity>
              <WatchlistButton movie={{ ...item, isTV }} styleType="detail" />
              <TouchableOpacity style={styles.actionItemMini}>
                <Ionicons name="thumbs-up-outline" size={24} color="white" />
                <Text style={styles.actionItemTextMini}>{t('general.like')}</Text>
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
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playButtonFull: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    marginRight: 20,
  },
  playButtonText: {
    color: 'black',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  actionRowMini: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionItemMini: {
    alignItems: 'center',
    marginLeft: 15,
  },
  actionItemTextMini: {
    color: 'gray',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
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
