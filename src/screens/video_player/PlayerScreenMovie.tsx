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

const { width, height } = Dimensions.get('window');



function EmbedPlayerInline({ url, onToggleFullscreen, isFullscreen }: { url: string, onToggleFullscreen: () => void, isFullscreen: boolean }) {
  const [showTopBar, setShowTopBar] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const autoHideRef = useRef<NodeJS.Timeout | null>(null);
  const lastToggleRef = useRef(0);

  const startAutoHide = () => {
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
    autoHideRef.current = setTimeout(() => {
      setShowTopBar(false);
    }, 3000);
  };

  const toggleTopBar = () => {
    const now = Date.now();
    if (now - lastToggleRef.current < 400) return;
    lastToggleRef.current = now;

    setShowTopBar(prev => {
      if (prev) {
        if (autoHideRef.current) clearTimeout(autoHideRef.current);
        return false;
      } else {
        startAutoHide();
        return true;
      }
    });
  };

  useEffect(() => {
    if (isFullscreen) {
      setShowTopBar(true);
      startAutoHide();
    } else {
      setShowTopBar(false);
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
    }
    return () => { if (autoHideRef.current) clearTimeout(autoHideRef.current); };
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
        toggleTopBar();
      }
    } catch(e) {}
  };

  return (
    <View style={styles.inlinePlayerContainer}>
      {isFullscreen && showTopBar && (
        <View style={styles.webViewTopBar}>
          <TouchableOpacity onPress={onToggleFullscreen} style={{ padding: 10 }}>
            <Ionicons name="close-outline" size={30} color="white" />
          </TouchableOpacity>
        </View>
      )}
      <WebView
        ref={webViewRef}
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

export default function PlayerScreenMovie({ route, navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  
  // Now receiving pre-fetched streaming info from DetailScreen
  const { 
    item, isTV, streamUrl, activePlayer, title: routeTitle, 
    selectedServer, selectedAudio, seasons 
  } = route.params;

  const [streamUrlState, setStreamUrlState] = useState(streamUrl);
  const [activePlayerState, setActivePlayerState] = useState(activePlayer);
  const [titleState, setTitleState] = useState(routeTitle || item?.title || item?.name || 'Unknown Title');
  const [loadingStream, setLoadingStream] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);

  const handleCreateWatchParty = async () => {
    if (!streamUrlState) {
      showAlert(t('common.error', { defaultValue: 'Error' }), "No stream URL available.", true);
      return;
    }
    setCreatingRoom(true);
    try {
       const res = await roomApi.createRoom(`${titleState} ${isTV ? `(S${selectedSeason} E${selectedEpisode})` : ''}`, streamUrlState);
       if (res && res.room_id) {
           navigation.navigate('StreamingRoomScreen', {
              roomId: res.room_id,
              initialStreamUrl: streamUrlState,
              initialTitle: `${titleState} ${isTV ? `(S${selectedSeason} E${selectedEpisode})` : ''}`,
              isHost: true
           });
       }
    } catch (e: any) {
       showAlert(t('common.error', { defaultValue: 'Error' }), e?.response?.data?.error || 'Unable to create room.', true);
    } finally {
       setCreatingRoom(false);
    }
  };

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [showEpisodePicker, setShowEpisodePicker] = useState(false);

  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

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

  const [alertInfo, setAlertInfo] = useState({
    visible: false,
    title: '',
    message: '',
    isError: false,
  });

  const showAlert = (title: string, message: string, isError: boolean = false) => {
    setAlertInfo({ visible: true, title, message, isError });
  };

  const availableSeasons = seasons?.filter((s:any) => s.season_number > 0) || [{ season_number: 1, name: 'Season 1', episode_count: 50 }];
  const currentSeasonData = availableSeasons.find((s:any) => s.season_number === selectedSeason) || availableSeasons[0];
  const episodeCount = currentSeasonData?.episode_count || 50;
  const availableEpisodes = Array.from({ length: Math.max(1, episodeCount) }, (_, i) => i + 1);

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
                  isTVShow={isTV}
                  title={titleState}
                  poster={item.poster_path ? `https://image.tmdb.org/t/p/w400${item.poster_path}` : ''}
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
        </View>

        {!isFullscreen && (
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
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
                <Comments movieId={item.id} type={isTV ? 'tvshow' : 'movie'} title={titleState} />
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
  inlinePlayerContainer: {
    flex: 1,
    width: '100%',
  },
  inlinePlayer: {
    flex: 1,
    width: '100%',
  },
  webViewTopBar: {
    position: 'absolute',
    top: 5,
    left: 10,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
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

});
