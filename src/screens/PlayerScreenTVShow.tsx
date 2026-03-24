import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Dimensions, TouchableOpacity, 
  ActivityIndicator, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';

import { useTheme } from '../context/ThemeContext';
import { phimApi } from '../api/phimapi';
import { nguoncApi } from '../api/nguonc';

const { width, height } = Dimensions.get('window');

function M3U8Player({ url }: { url: string }) {
  const player = useVideoPlayer(url, p => {
    p.play();
  });

  useFocusEffect(
    React.useCallback(() => {
      // Screen is focused, we can let it play or resume if needed
      // (The initializer above already plays it first time)
      
      return () => {
        // Screen is unfocused or player unmounted. Safely pause if player still exists.
        try {
          player.pause();
        } catch (e) {
          // Ignore if the native player instance was already released
        }
      };
    }, [player])
  );

  return (
    <View style={styles.inlinePlayerContainer}>
      <VideoView
        style={styles.inlinePlayer}
        player={player}
        nativeControls={true}
        // Removed allowsFullscreen to fix the deprecation warning
      />
    </View>
  );
}

function EmbedPlayerInline({ url }: { url: string }) {
  return (
    <View style={styles.inlinePlayerContainer}>
      <WebView
        source={{ uri: url }}
        style={styles.inlinePlayer}
        javaScriptEnabled
        allowsFullscreenVideo
        domStorageEnabled
      />
    </View>
  );
}

export default function PlayerScreenTVShow({ route, navigation }: any) {
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

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [showEpisodePicker, setShowEpisodePicker] = useState(false);

  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  const availableSeasons = seasons?.filter((s:any) => s.season_number > 0) || [{ season_number: 1, name: 'Season 1', episode_count: 50 }];
  const currentSeasonData = availableSeasons.find((s:any) => s.season_number === selectedSeason) || availableSeasons[0];
  const episodeCount = currentSeasonData?.episode_count || 50;
  const availableEpisodes = Array.from({ length: Math.max(1, episodeCount) }, (_, i) => i + 1);

  const formatTitle = (epNum: number, seasonNum: number, trackName?: string) => {
    const baseTitle = item?.title || item?.name || 'Unknown Title';
    if (!isTV) return trackName ? `${baseTitle} (${trackName})` : baseTitle;
    return trackName ? `${baseTitle} - S${seasonNum} E${epNum} (${trackName})` : `${baseTitle} - S${seasonNum} E${epNum}`;
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
            setActivePlayerState('m3u8');
            setTitleState(formatTitle(epNum, seasonNum, streamObj.name));
          } else {
            Alert.alert(t('general.notice'), t('player.stream_not_on_server_1', { defaultValue: 'Stream unavailable on Server 1' }));
          }
        } else {
          Alert.alert(t('general.notice'), t('player.stream_not_on_server_1', { defaultValue: 'Stream unavailable on Server 1' }));
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
             Alert.alert(t('general.notice'), t('player.stream_not_on_server_3', { defaultValue: 'Stream unavailable' }));
          }
        } else {
          Alert.alert(t('general.notice'), t('player.stream_not_on_server_3', { defaultValue: 'Stream unavailable' }));
        }
      }
    } catch(e) {
      Alert.alert(t('general.notice'), t('player.error_loading_stream', { defaultValue: 'Failed to load stream link.' }));
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
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        style={[styles.container, { paddingBottom: 0 }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{titleState}</Text>
        </View>

        <View style={styles.playerWrapper}>
          {loadingStream ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColor} />
              <Text style={{color:'white', marginTop:10}}>Loading stream...</Text>
            </View>
          ) : streamUrlState ? (
            activePlayerState === 'm3u8' ? (
              <M3U8Player url={streamUrlState} />
            ) : (
              <EmbedPlayerInline url={streamUrlState} />
            )
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={{color:'gray'}}>{t('player.error_loading_stream', { defaultValue: 'Stream unavailable' })}</Text>
            </View>
          )}
        </View>
      </View>

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

        <View style={styles.controlsRow}>
          <TouchableOpacity 
            style={styles.toggleCommentBtn} 
            onPress={() => setCommentsVisible(!commentsVisible)}
          >
            <Ionicons name={commentsVisible ? 'chatbubble-outline' : 'chatbubbles'} size={20} color="white" />
            <Text style={styles.toggleCommentText}>
              {commentsVisible ? t('player.close_comments', { defaultValue: 'Close Comments' }) : t('player.open_comments', { defaultValue: 'Open Comments' })}
            </Text>
            <Ionicons name={commentsVisible ? "chevron-up" : "chevron-down"} size={16} color="gray" style={{marginLeft: 8}} />
          </TouchableOpacity>
        </View>

        {commentsVisible && (
          <View style={styles.commentsContainer}>
            <Text style={styles.commentsHeader}>{t('player.comments')}</Text>
            {comments.map((c, i) => (
              <View key={i} style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <Text style={{color:'white', fontWeight:'bold'}}>{c.user.charAt(0)}</Text>
                </View>
                <View style={styles.commentBody}>
                  <Text style={styles.commentUser}>{c.user}</Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {commentsVisible && (
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 10 }]}>
          <TextInput 
            style={styles.textInput}
            placeholder={t('player.write_comment', { defaultValue: 'Write a comment...' })}
            placeholderTextColor="#666"
            value={newComment}
            onChangeText={setNewComment}
          />
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: themeColor }]} onPress={addComment}>
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

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
    width: width,
    aspectRatio: 16 / 9,
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
  }
});
