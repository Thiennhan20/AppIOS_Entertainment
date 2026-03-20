import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Dimensions, TouchableOpacity, 
  ActivityIndicator, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';

import { phimApi } from '../api/phimapi';
import { nguoncApi } from '../api/nguonc';

const { width } = Dimensions.get('window');

function M3U8Player({ url }: { url: string }) {
  const player = useVideoPlayer(url, p => {
    p.play();
  });

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
  const insets = useSafeAreaInsets();
  const { item, isTV } = route.params;

  const [activePlayer, setActivePlayer] = useState<'m3u8' | 'embed' | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);

  const [selectedServer, setSelectedServer] = useState<'Server 1' | 'Server 3'>('Server 1');
  const [showServerPicker, setShowServerPicker] = useState(false);

  const [comments, setComments] = useState<any[]>([
    { id: '1', user: 'Cuồng Phim', text: 'Cùng chung đam mê cày phim, server load nhanh đấy!' },
    { id: '2', user: 'Hoa Phượng', text: 'VIBE đỉnh quá, chúc dự án thành công.' }
  ]);
  const [newComment, setNewComment] = useState('');

  const title = item?.title || item?.name || 'Unknown Title';
  const year = item?.release_date?.substring(0,4) || item?.first_air_date?.substring(0,4) || '2023';

  useEffect(() => {
    handlePlay();
  }, []);

  const handlePlay = async () => {
    if (loadingStream) return;
    
    setLoadingStream(true);
    setStreamUrl(null);
    setActivePlayer(null);

    try {
      if (selectedServer === 'Server 1') {
        const m3u8 = await phimApi.getStreamingLink(item.id.toString(), title, parseInt(year));
        if (m3u8) {
          setStreamUrl(m3u8);
          setActivePlayer('m3u8');
        } else {
          alert('Not available on Server 1 (PhimAPI). Try Server 3.');
        }
      } else {
        const links = await nguoncApi.getStreamingLink(isTV, title, parseInt(year));
        let validEmbed = links?.m3u8 || links?.vietsub || links?.dubbed;
        
        if (validEmbed) {
          if (validEmbed.startsWith('//')) {
            validEmbed = 'https:' + validEmbed;
          }
          setStreamUrl(validEmbed);
          setActivePlayer('embed');
        } else {
          alert('Not available on Server 3 (NguonC). Try Server 1.');
        }
      }
    } catch (e) {
      alert("Error finding streams.");
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
              <ActivityIndicator size="large" color="#E50914" />
              <Text style={{color:'white', marginTop:10}}>Loading stream...</Text>
            </View>
          ) : activePlayer === 'm3u8' && streamUrl ? (
            <M3U8Player url={streamUrl} />
          ) : activePlayer === 'embed' && streamUrl ? (
            <EmbedPlayerInline url={streamUrl} />
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={{color:'gray'}}>Please select a server and press Play</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.controlsRow}>
          <TouchableOpacity 
            style={styles.playButtonFull}
            onPress={handlePlay}
            disabled={loadingStream}
          >
            <Ionicons name="play" size={20} color="black" />
            <Text style={styles.playButtonText}>Play / Reload</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowServerPicker(true)}
            disabled={loadingStream}
          >
            <Text style={styles.dropdownText}>{selectedServer}</Text>
            <Ionicons name="chevron-down" size={16} color="white" style={{marginLeft: 5}} />
          </TouchableOpacity>
        </View>

        <View style={styles.commentsContainer}>
          <Text style={styles.commentsHeader}>Comments</Text>
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
        <TouchableOpacity style={styles.sendButton} onPress={addComment}>
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
            <Text style={styles.modalTitle}>Select Streaming Server</Text>
            
            <TouchableOpacity 
              style={[styles.serverOption, selectedServer === 'Server 1' && styles.serverOptionSelected]}
              onPress={() => { setSelectedServer('Server 1'); setShowServerPicker(false); handlePlay(); }}
            >
              <Text style={styles.serverOptionText}>📺 Server 1 (PhimAPI - M3U8)</Text>
              {selectedServer === 'Server 1' && <Ionicons name="checkmark" size={20} color="#E50914" />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.serverOption, selectedServer === 'Server 3' && styles.serverOptionSelected]}
              onPress={() => { setSelectedServer('Server 3'); setShowServerPicker(false); handlePlay(); }}
            >
              <Text style={styles.serverOptionText}>🚀 Server 3 (NguonC - Embed)</Text>
              {selectedServer === 'Server 3' && <Ionicons name="checkmark" size={20} color="#E50914" />}
            </TouchableOpacity>

            <TouchableOpacity style={{marginTop: 15, padding: 10}} onPress={() => setShowServerPicker(false)}>
              <Text style={{color: 'gray', textAlign: 'center'}}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  serverOptionSelected: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  serverOptionText: {
    color: 'white',
    fontSize: 16,
  }
});
