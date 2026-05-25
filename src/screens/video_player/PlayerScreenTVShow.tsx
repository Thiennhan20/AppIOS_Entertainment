import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, Dimensions, TouchableOpacity, 
  ActivityIndicator, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';

import { useTheme } from '../../context/ThemeContext';
import { phimApi } from '../../api/phimapi';
import { nguoncApi } from '../../api/nguonc';
import { authApi } from '../../api/authApi';
import CustomAlert from '../../components/CustomAlert';
import CustomVideoPlayer from '../../components/CustomVideoPlayer';
import Comments from '../../components/Comments';
import { roomApi } from '../../api/roomApi';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import useScrollToTop from '../../hooks/useScrollToTop';

const { width, height } = Dimensions.get('window');



function EmbedPlayerInline({ url, onToggleFullscreen, isFullscreen }: { url: string, onToggleFullscreen: () => void, isFullscreen: boolean }) {
  const [showTopBar, setShowTopBar] = useState(true);
  const topBarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTopBarTimeout = () => {
    setShowTopBar(true);
    if (topBarTimeoutRef.current) clearTimeout(topBarTimeoutRef.current);
    topBarTimeoutRef.current = setTimeout(() => {
      setShowTopBar(false);
    }, 3000);
  };

  useEffect(() => {
    if (isFullscreen) {
      resetTopBarTimeout();
    } else {
      setShowTopBar(false);
    }
    return () => { if (topBarTimeoutRef.current) clearTimeout(topBarTimeoutRef.current); };
  }, [isFullscreen]);

  const INJECTED_JS = `
    (function() {
      var overrideFullscreen = function(v) {
        v.webkitEnterFullscreen = function() {
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'toggleFullscreen' }));
        };
        v.requestFullscreen = function() {
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'toggleFullscreen' }));
           return Promise.resolve();
        };
      };

      var checkVideo = setInterval(function() {
        var v = document.querySelector('video');
        if (v && !v._fullscreenOverridden) {
          overrideFullscreen(v);
          v._fullscreenOverridden = true;
          clearInterval(checkVideo);
        }
      }, 500);
      
      document.addEventListener('click', function(e) {
         window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'userActivity' }));
         if (e.target && e.target.className && typeof e.target.className === 'string') {
            var className = e.target.className.toLowerCase();
            if (className.includes('fullscreen') || className.includes('expand') || className.includes('fw_btn')) {
               window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'toggleFullscreen' }));
               e.preventDefault();
               e.stopPropagation();
            }
         }
      }, true);
      
      document.addEventListener('touchstart', function(e) {
         window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'userActivity' }));
      }, true);
    })();
    true;
  `;

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'toggleFullscreen') {
        onToggleFullscreen();
      } else if (data.type === 'userActivity' && isFullscreen) {
        resetTopBarTimeout();
      }
    } catch(e) {}
  };

  return (
    <View style={styles.inlinePlayerContainer}>
      {isFullscreen && showTopBar && (
        <View style={styles.webViewTopBar}>
          <TouchableOpacity onPress={onToggleFullscreen} style={{ padding: 10 }}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
        </View>
      )}
      <WebView
        source={{ uri: url }}
        style={styles.inlinePlayer}
        javaScriptEnabled
        allowsFullscreenVideo={false}
        domStorageEnabled
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScript={INJECTED_JS}
        onMessage={onMessage}
      />
    </View>
  );
}

export default function PlayerScreenTVShow({ route, navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const contentScrollRef = useRef<ScrollView>(null);
  const { handleScroll, showScrollTop } = useScrollToTop();
  
  // Now receiving pre-fetched streaming info from DetailScreen
  const { 
    item, isTV, streamUrl, activePlayer, title: routeTitle, 
    selectedServer, selectedAudio, seasons,
    initialSeason, initialEpisode
  } = route.params;

  const [streamUrlState, setStreamUrlState] = useState(streamUrl);
  const [activePlayerState, setActivePlayerState] = useState(activePlayer);
  const [titleState, setTitleState] = useState(routeTitle || item?.title || item?.name || 'Unknown Title');
  const [loadingStream, setLoadingStream] = useState(false);

  const [selectedSeason, setSelectedSeason] = useState(initialSeason || 1);
  const [selectedEpisode, setSelectedEpisode] = useState(initialEpisode || 1);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [showEpisodePicker, setShowEpisodePicker] = useState(false);



  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  
  const [creatingRoom, setCreatingRoom] = useState(false);

  // ── Auto Next Episode states ──
  const [autoNextEnabled, setAutoNextEnabled] = useState(false);
  const [showNextEpisodePopup, setShowNextEpisodePopup] = useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(5);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleCreateWatchParty = async () => {
    if (!streamUrlState) {
      showAlert(t('common.error', { defaultValue: 'Error' }), "No stream URL available.", true);
      return;
    }
    setCreatingRoom(true);
    try {
       const res = await roomApi.createRoom(`${titleState} (S${selectedSeason} E${selectedEpisode})`, streamUrlState);
       if (res && res.room_id) {
           navigation.navigate('StreamingRoomScreen', {
              roomId: res.room_id,
              initialStreamUrl: streamUrlState,
              initialTitle: `${titleState} (S${selectedSeason} E${selectedEpisode})`,
              isHost: true
           });
       }
    } catch (e: any) {
       showAlert(t('common.error', { defaultValue: 'Error' }), e?.response?.data?.error || 'Unable to create room.', true);
    } finally {
       setCreatingRoom(false);
    }
  };

  const [alertInfo, setAlertInfo] = useState({
    visible: false,
    title: '',
    message: '',
    isError: false,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: isFullscreen ? 'none' : 'flex' },
      });
      return () => {
        navigation.getParent()?.setOptions({
          tabBarStyle: { display: 'flex' },
        });
      };
    }, [navigation, isFullscreen])
  );

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
    }
  };

  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const showAlert = (title: string, message: string, isError: boolean = false) => {
    setAlertInfo({ visible: true, title, message, isError });
  };

  const availableSeasons = seasons?.filter((s:any) => s.season_number > 0) || [{ season_number: 1, name: 'Season 1', episode_count: 50 }];
  const currentSeasonData = availableSeasons.find((s:any) => s.season_number === selectedSeason) || availableSeasons[0];
  const episodeCount = currentSeasonData?.episode_count || 50;
  const availableEpisodes = Array.from({ length: Math.max(1, episodeCount) }, (_, i) => i + 1);
  const hasNextEpisode = selectedEpisode < episodeCount;

  // ── Auto Next Episode Logic ──
  const goToNextEpisode = () => {
    if (selectedEpisode >= episodeCount) return;
    const nextEp = selectedEpisode + 1;
    setShowNextEpisodePopup(false);
    setNextEpisodeCountdown(5);
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    changeEpisode(nextEp, selectedSeason);
  };

  const handleVideoEnded = () => {
    if (selectedServer !== 'Server 1') return;
    if (selectedEpisode >= episodeCount) return;
    setShowNextEpisodePopup(true);
    setNextEpisodeCountdown(5);
    if (autoNextEnabled) {
      countdownIntervalRef.current = setInterval(() => {
        setNextEpisodeCountdown(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Auto-navigate when countdown reaches 0
  useEffect(() => {
    if (autoNextEnabled && nextEpisodeCountdown === 0 && showNextEpisodePopup) {
      goToNextEpisode();
    }
  }, [autoNextEnabled, nextEpisodeCountdown, showNextEpisodePopup]);

  // Cleanup countdown and hide popup on episode change
  useEffect(() => {
    setShowNextEpisodePopup(false);
    setNextEpisodeCountdown(5);
    return () => {
      if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    };
  }, [selectedEpisode]);

  const handleDismissPopup = () => {
    setShowNextEpisodePopup(false);
    setNextEpisodeCountdown(5);
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
  };

  const formatTitle = (epNum: number, seasonNum: number, trackName?: string) => {
    const baseTitle = item?.title || item?.name || 'Unknown Title';
    if (!isTV) return baseTitle;
    return `${baseTitle} - S${seasonNum} E${epNum}`;
  };

  const changeEpisode = async (epNum: number, seasonNum: number) => {
    setSelectedEpisode(epNum);
    setSelectedSeason(seasonNum);
    setLoadingStream(true);
    
    const year = item?.release_date?.substring(0,4) || item?.first_air_date?.substring(0,4) || '2023';
    const baseTitle = item?.title || item?.name || '';
    
    try {
      if (selectedServer === 'Server 1') {
        const audioTracks = await phimApi.getStreamingLink(item.id.toString(), baseTitle, parseInt(year), epNum, isTV, seasonNum);
        if (audioTracks && audioTracks.length > 0) {
          let streamObj = audioTracks.find(a => {
            const lowerName = a.name.toLowerCase();
            if (selectedAudio === 'vietsub') return lowerName.includes('vietsub') || lowerName.includes('phụ đề') || lowerName.includes('sub');
            if (selectedAudio === 'dubbed') return lowerName.includes('thuyết minh') || lowerName.includes('lồng tiếng') || lowerName.includes('dub');
            return false;
          });
          if (!streamObj) streamObj = audioTracks[0];
          
          if (streamObj && streamObj.url) {
            setStreamUrlState(streamObj.url);
            setActivePlayerState(streamObj.url.includes('.m3u8') ? 'm3u8' : 'embed');
            setTitleState(formatTitle(epNum, seasonNum, streamObj.name));
          } else {
            showAlert(t('general.notice'), t('player.stream_not_on_server_1', { defaultValue: 'Movie not available on Server 1.\nPlease try Server 3.' }));
          }
        } else {
          showAlert(t('general.notice'), t('player.stream_not_on_server_1', { defaultValue: 'Movie not available on Server 1.\nPlease try Server 3.' }));
        }
      } else {
        const links = await nguoncApi.getStreamingLink(isTV, baseTitle, parseInt(year), '', seasonNum, epNum);
        if (links) {
          const urlStr = (links as any)[selectedAudio || 'vietsub'];
          if (urlStr) {
             const finalUrl = urlStr.startsWith('//') ? 'https:' + urlStr : urlStr;
             setStreamUrlState(finalUrl);
             setActivePlayerState(finalUrl.includes('.m3u8') ? 'm3u8' : 'embed');
             setTitleState(formatTitle(epNum, seasonNum));
          } else {
             showAlert(t('general.notice'), t('player.stream_not_on_server_3', { defaultValue: 'Movie unavailable on Server 3.\nPlease try Server 1.' }));
          }
        } else {
          showAlert(t('general.notice'), t('player.stream_not_on_server_3', { defaultValue: 'Movie unavailable on Server 3.\nPlease try Server 1.' }));
        }
      }
    } catch(e) {
      showAlert(t('general.error', { defaultValue: 'Error' }), t('player.error_loading_stream', { defaultValue: 'Failed to load movie link.\nPlease try again later.' }), true);
    } finally {
      setLoadingStream(false);
    }
  };

  const addComment = () => {
    if (newComment.trim()) {
      setComments([...comments, { id: Date.now().toString(), user: 'You', text: newComment.trim() }]);
      setNewComment('');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f13' }}>
      <StatusBar hidden={isFullscreen} />
      <KeyboardAvoidingView 
        style={[styles.container, { paddingBottom: 0 }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={{ flex: 1, paddingTop: isFullscreen ? 0 : insets.top }}>
        {!isFullscreen && (
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{titleState}</Text>
          </View>
        )}

        <View style={isFullscreen ? styles.fullscreenPlayerWrapper : styles.playerWrapper}>
          {loadingStream ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColor} />
              <Text style={{color:'white', marginTop:10}}>Loading...</Text>
            </View>
          ) : streamUrlState ? (
            <View style={{ flex: 1, width: '100%' }}>
              {activePlayerState === 'm3u8' ? (
                <CustomVideoPlayer 
                  url={streamUrlState} 
                  isFullscreen={isFullscreen} 
                  onToggleFullscreen={toggleFullscreen}
                  themeColor={themeColor}
                  movieId={item.id.toString()}
                  server={selectedServer}
                  audio={selectedAudio}
                  isTVShow={true}
                  season={selectedSeason}
                  episode={selectedEpisode}
                  title={titleState}
                  poster={item.poster_path ? `https://image.tmdb.org/t/p/w400${item.poster_path}` : ''}
                  onVideoEnded={handleVideoEnded}
                />
              ) : (
                <EmbedPlayerInline url={streamUrlState} onToggleFullscreen={toggleFullscreen} isFullscreen={isFullscreen} />
              )}
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={{color:'gray'}}>{t('player.error_loading_stream', { defaultValue: 'Movie unavailable' })}</Text>
            </View>
          )}

          {/* Next Episode Popup — inside player wrapper */}
          {showNextEpisodePopup && hasNextEpisode && (
            <View style={styles.nextEpisodeOverlay}>
              <View style={styles.nextEpisodeBox}>
                <Ionicons name="play-skip-forward" size={32} color="#10b981" style={{ marginBottom: 10 }} />
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' }}>
                  {t('player.next_episode', { defaultValue: 'Next' })}: {t('general.episode', { defaultValue: 'Episode' })} {selectedEpisode + 1}
                </Text>

                {autoNextEnabled ? (
                  <>
                    <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 12 }}>
                      {t('player.playing_next_in', { defaultValue: 'Playing next in' })}
                    </Text>
                    <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                      <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>{nextEpisodeCountdown}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={{ backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }} onPress={goToNextEpisode}>
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>{t('player.play_now', { defaultValue: 'Play Now' })}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ backgroundColor: '#333', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }} onPress={handleDismissPopup}>
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>{t('common.cancel', { defaultValue: 'Cancel' })}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity style={{ backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }} onPress={goToNextEpisode}>
                      <Ionicons name="play-skip-forward" size={16} color="white" />
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>{t('player.next_episode_btn', { defaultValue: 'Next Episode' })}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ backgroundColor: '#333', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }} onPress={handleDismissPopup}>
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>{t('common.dismiss', { defaultValue: 'Dismiss' })}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {!isFullscreen && (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            ref={contentScrollRef}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
          >
            <View style={styles.controlsRow}>
              {isTV && (
                <View style={styles.episodesRow}>
                   <TouchableOpacity style={styles.epSelectorBtn} onPress={() => setShowSeasonPicker(true)}>
                     <Text style={styles.epSelectorBtnText}>{t('general.season', { defaultValue: 'Season' })} {selectedSeason}</Text>
                     <Ionicons name="chevron-down" size={16} color="#aaa" />
                   </TouchableOpacity>

                   <TouchableOpacity style={[styles.epSelectorBtn, { marginLeft: 10 }]} onPress={() => setShowEpisodePicker(true)}>
                     <Text style={styles.epSelectorBtnText}>{t('general.episode', { defaultValue: 'Episode' })} {selectedEpisode}</Text>
                     <Ionicons name="chevron-down" size={16} color="#aaa" />
                   </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Auto Next Toggle */}
            {selectedServer === 'Server 1' && hasNextEpisode && (
              <View style={{ paddingHorizontal: 15, paddingBottom: 8 }}>
                <TouchableOpacity
                  style={[styles.toggleCommentBtn, {
                    backgroundColor: autoNextEnabled ? '#10b98133' : '#1E1E1E',
                    borderWidth: autoNextEnabled ? 1 : 0,
                    borderColor: autoNextEnabled ? '#10b981' : 'transparent',
                  }]}
                  onPress={() => setAutoNextEnabled(prev => !prev)}
                >
                  <Ionicons name="play-skip-forward-outline" size={20} color={autoNextEnabled ? '#10b981' : '#aaa'} />
                  <Text style={[styles.toggleCommentText, { color: autoNextEnabled ? '#10b981' : '#aaa', fontSize: 14 }]}>
                    {t('player.auto_next', { defaultValue: 'Auto Next' })} {autoNextEnabled ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 15, paddingBottom: 10 }}>
              {selectedServer !== 'Server 3' && (
                <TouchableOpacity 
                  style={[styles.toggleCommentBtn, { flex: 1, backgroundColor: `${themeColor}22` }]} 
                  onPress={handleCreateWatchParty}
                  disabled={creatingRoom || !streamUrlState}
                >
                  {creatingRoom ? (
                    <ActivityIndicator size="small" color={themeColor} />
                  ) : (
                    <>
                      <Ionicons name="people-outline" size={20} color={themeColor} />
                      <Text style={[styles.toggleCommentText, { color: themeColor, fontSize: 14 }]}>
                        {t('watch_party.create', { defaultValue: 'Watch Together' })}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.toggleCommentBtn, { flex: 1 }]} 
                onPress={() => setCommentsVisible(!commentsVisible)}
              >
                <Ionicons name={commentsVisible ? 'chatbubble-outline' : 'chatbubbles'} size={20} color="white" />
                <Text style={[styles.toggleCommentText, { fontSize: 13 }]}>
                  {commentsVisible ? t('player.close_comments', { defaultValue: 'Close Comments' }) : t('player.open_comments', { defaultValue: 'Open Comments' })}
                </Text>
                <Ionicons name={commentsVisible ? "chevron-up" : "chevron-down"} size={16} color="gray" style={{marginLeft: 8}} />
              </TouchableOpacity>
            </View>

            {commentsVisible && (
              <View style={styles.commentsContainer}>
                 <Comments
                   movieId={item.id}
                   onUserPress={(userId) => navigation.navigate('PublicProfileScreen', { userId })}
                   title={titleState}
                   type={isTV ? 'tvshow' : 'movie'}
                 />
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>

      <Modal visible={showSeasonPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSeasonPicker(false)}>
          <View style={[styles.modalContent, { maxHeight: height * 0.6 }]}>
            <Text style={styles.modalTitle}>{t('general.season', { defaultValue: 'Season' })}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableSeasons.map((s:any) => (
                <TouchableOpacity key={s.season_number} style={styles.serverOption} onPress={() => { setShowSeasonPicker(false); changeEpisode(1, s.season_number); }}>
                  <Text style={styles.serverOptionText}>{s.name || `${t('general.season')} ${s.season_number}`}</Text>
                  {selectedSeason === s.season_number && <Ionicons name="checkmark" size={20} color={themeColor} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showEpisodePicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEpisodePicker(false)}>
          <View style={[styles.modalContent, { maxHeight: height * 0.7 }]}>
            <Text style={styles.modalTitle}>{t('general.episode', { defaultValue: 'Episode' })} (S{selectedSeason})</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableEpisodes.map(ep => (
                <TouchableOpacity key={ep} style={styles.serverOption} onPress={() => { setShowEpisodePicker(false); changeEpisode(ep, selectedSeason); }}>
                  <Text style={styles.serverOptionText}>{t('general.episode')} {ep}</Text>
                  {selectedEpisode === ep && <Ionicons name="checkmark" size={20} color={themeColor} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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

      {!isFullscreen ? (
        <ScrollToTopButton
          onPress={() => contentScrollRef.current?.scrollTo({ animated: true, y: 0 })}
          visible={showScrollTop}
        />
      ) : null}


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f13',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  backButton: { marginRight: 15 },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  playerWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'black',
  },
  fullscreenPlayerWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: 'black',
  },
  customFsBtn: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  inlinePlayerContainer: {
    flex: 1,
    width: '100%',
  },
  inlinePlayer: { // Server 3
    flex: 1,
    width: '100%',
    backgroundColor: 'black',
  },
  webViewTopBar: {
    position: 'absolute',
    top: 5,
    left: 10,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    alignItems: 'center',
  },
  playButtonFull: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 4,
    flex: 1,
    marginRight: 10,
  },
  playButtonText: {
    color: 'black',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  toggleCommentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  toggleCommentText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  commentsContainer: {
    padding: 15,
  },
  commentsHeader: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  episodesRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
  },
  epSelectorBtn: {
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
  epSelectorBtnText: {
    color: '#ddd',
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
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
  serverOptionText: {
    color: 'white',
    fontSize: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentUser: {
    color: 'gray',
    fontSize: 13,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  commentText: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: '#16161e',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#262626',
    color: 'white',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextEpisodeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  nextEpisodeBox: {
    backgroundColor: '#1c1c1c',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    maxWidth: 320,
  },

});
