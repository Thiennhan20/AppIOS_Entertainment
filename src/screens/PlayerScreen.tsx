import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Dimensions, TouchableOpacity, 
  ActivityIndicator, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';

import { phimApi } from '../api/phimapi';
import { nguoncApi } from '../api/nguonc';
import { useTheme } from '../context/ThemeContext';
import CustomAlert from '../components/CustomAlert';

const { width } = Dimensions.get('window');

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

export default function PlayerScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { item, isTV } = route.params;

  const [activePlayer, setActivePlayer] = useState<'m3u8' | 'embed' | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);

  const [selectedServer, setSelectedServer] = useState<'Server 1' | 'Server 3'>('Server 1');
  const [showServerPicker, setShowServerPicker] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{ visible: boolean, message: string }>({ visible: false, message: '' });

  // Audio track states
  const [availableAudios, setAvailableAudios] = useState<{ id: string, name: string, url: string }[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [showAudioPicker, setShowAudioPicker] = useState(false);

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  const title = item?.title || item?.name || 'Unknown Title';
  const year = item?.release_date?.substring(0,4) || item?.first_air_date?.substring(0,4) || '2023';

  useEffect(() => {
    handlePlay();
  }, [selectedServer]);

  const handlePlay = async () => {
    if (loadingStream) return;
    
    setLoadingStream(true);
    setStreamUrl(null);
    setActivePlayer(null);

    try {
      if (selectedServer === 'Server 1') {
        const audioList = await phimApi.getStreamingLink(item.id.toString(), title, parseInt(year));
        if (audioList && audioList.length > 0) {
          setAvailableAudios(audioList);
          setSelectedAudioId(audioList[0].id);
          setStreamUrl(audioList[0].url);
          setActivePlayer('m3u8');
        } else {
          setAlertConfig({ visible: true, message: t('player.stream_not_on_server_1') });
        }
      } else {
        const links = await nguoncApi.getStreamingLink(isTV, title, parseInt(year));
        
        let audios = [];
        if (links?.vietsub) audios.push({ id: 'vietsub', name: 'Subtitled', url: links.vietsub.startsWith('//') ? 'https:' + links.vietsub : links.vietsub });
        if (links?.dubbed) audios.push({ id: 'dubbed', name: 'Dubbed', url: links.dubbed.startsWith('//') ? 'https:' + links.dubbed : links.dubbed });
        if (links?.m3u8) audios.push({ id: 'm3u8', name: 'Raw (M3U8)', url: links.m3u8.startsWith('//') ? 'https:' + links.m3u8 : links.m3u8 });

        if (audios.length > 0) {
          setAvailableAudios(audios);
          setSelectedAudioId(audios[0].id);
          setStreamUrl(audios[0].url);
          setActivePlayer(audios[0].id === 'm3u8' ? 'm3u8' : 'embed');
        } else {
          setAlertConfig({ visible: true, message: t('player.stream_not_on_server_3') });
        }
      }
    } catch (e) {
      setAlertConfig({ visible: true, message: t('player.error_loading_stream') });
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

  const formatAudio = (name?: string, id?: string) => {
    if (!name && !id) return '';
    const lookup = (name || id || '').toLowerCase();
    if (lookup.includes('vietsub')) return t('player.subtitled');
    if (lookup.includes('thuyết minh') || lookup.includes('lồng tiếng') || lookup === 'dubbed') return t('player.dubbed');
    return name || id || '';
  };

  const changeAudio = (audioId: string) => {
    const target = availableAudios.find(a => a.id === audioId);
    if (target) {
       setSelectedAudioId(audioId);
       setStreamUrl(target.url);
       setShowAudioPicker(false);
       setActivePlayer(audioId === 'm3u8' || target.url.includes('.m3u8') ? 'm3u8' : 'embed');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingBottom: 0 }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>

        <View style={styles.playerWrapper}>
          {loadingStream ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColor} />
              <Text style={{color:'white', marginTop:10}}>Loading stream...</Text>
            </View>
          ) : activePlayer === 'm3u8' && streamUrl ? (
            <M3U8Player url={streamUrl} />
          ) : activePlayer === 'embed' && streamUrl ? (
            <EmbedPlayerInline url={streamUrl} />
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={{color:'gray'}}>{t('player.please_select_server')}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.controlsRow}>
          {/* Play / Reload button removed to leave space for future Choose Audio dropdown */}
          <TouchableOpacity 
            style={[styles.dropdownButton, { flex: 1, marginRight: 10 }]}
            onPress={() => setShowServerPicker(true)}
            disabled={loadingStream}
          >
            <Ionicons name="server-outline" size={16} color="white" style={{ marginRight: 8 }} />
            <Text style={[styles.dropdownText, { flex: 1 }]}>{selectedServer}</Text>
            <Ionicons name="chevron-down" size={16} color="white" />
          </TouchableOpacity>

          {/* Reserved space for Audio Dropdown - Can just put a placeholder here for layout reference */}
          <TouchableOpacity 
            style={[styles.dropdownButton, { flex: 1, opacity: availableAudios.length > 1 ? 1 : 0.5 }]}
            onPress={() => setShowAudioPicker(true)}
            disabled={loadingStream || availableAudios.length <= 1}
          >
            <Ionicons name="musical-notes-outline" size={16} color="white" style={{ marginRight: 8 }} />
            <Text style={[styles.dropdownText, { flex: 1 }]} numberOfLines={1}>
              {formatAudio(availableAudios.find(a => a.id === selectedAudioId)?.name || '', selectedAudioId || '') || t('player.language')}
            </Text>
            <Ionicons name="chevron-down" size={16} color="white" />
          </TouchableOpacity>
        </View>

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
      </ScrollView>

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 10 }]}>
        <TextInput 
          style={styles.textInput}
          placeholder="Write a comment..."
          placeholderTextColor="#666"
          value={newComment}
          onChangeText={setNewComment}
        />
        <TouchableOpacity style={[styles.sendButton, { backgroundColor: themeColor }]} onPress={addComment}>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <Modal visible={showServerPicker} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowServerPicker(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('player.select_server')}</Text>
            
            <TouchableOpacity 
              style={[styles.serverOption, selectedServer === 'Server 1' && { backgroundColor: `${themeColor}1A` }]}
              onPress={() => { setSelectedServer('Server 1'); setShowServerPicker(false); }}
            >
              <Text style={styles.serverOptionText}>{t('player.server_1')}</Text>
              {selectedServer === 'Server 1' && <Ionicons name="checkmark" size={20} color={themeColor} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.serverOption, selectedServer === 'Server 3' && { backgroundColor: `${themeColor}1A` }]}
              onPress={() => { setSelectedServer('Server 3'); setShowServerPicker(false); }}
            >
              <Text style={styles.serverOptionText}>{t('player.server_3')}</Text>
              {selectedServer === 'Server 3' && <Ionicons name="checkmark" size={20} color={themeColor} />}
            </TouchableOpacity>

            <TouchableOpacity style={{marginTop: 15, padding: 10}} onPress={() => setShowServerPicker(false)}>
              <Text style={{color: 'gray', textAlign: 'center'}}>{t('player.close')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Audio Picker Modal */}
      <Modal visible={showAudioPicker} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowAudioPicker(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('player.select_audio_sub')}</Text>
            
            {availableAudios.map((audio) => (
              <TouchableOpacity 
                key={audio.id}
                style={[styles.serverOption, selectedAudioId === audio.id && { backgroundColor: `${themeColor}1A` }]}
                onPress={() => changeAudio(audio.id)}
              >
                <Text style={styles.serverOptionText}>
                  {audio.id === 'vietsub' || audio.name.toLowerCase().includes('vietsub') ? '📝 ' : '🎙️ '}
                  {formatAudio(audio.name, audio.id)}
                </Text>
                {selectedAudioId === audio.id && <Ionicons name="checkmark" size={20} color={themeColor} />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={{marginTop: 15, padding: 10}} onPress={() => setShowAudioPicker(false)}>
              <Text style={{color: 'gray', textAlign: 'center'}}>{t('player.close')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <CustomAlert
        visible={alertConfig.visible}
        title="Failed to change Server"
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
        iconName="alert-circle-outline"
        isError={true}
      />
    </KeyboardAvoidingView>
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
  dropdownButton: {
    backgroundColor: '#262626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 4,
  },
  dropdownText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
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
  }
});
