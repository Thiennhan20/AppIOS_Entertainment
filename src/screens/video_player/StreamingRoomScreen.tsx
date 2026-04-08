import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, Text, View, Dimensions, TouchableOpacity, 
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView, Animated, FlatList, Share
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../context/ThemeContext';
import CustomVideoPlayer, { CustomVideoPlayerRef } from '../../components/CustomVideoPlayer';
import { useWatchPartySocket } from '../../hooks/useWatchPartySocket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../../api/authApi';
import CustomAlert from '../../components/CustomAlert';

const { width, height } = Dimensions.get('window');

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉', '🤣', '😍', '👀', '💯'];

export default function StreamingRoomScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeColor, themeGradient } = useTheme();
  
  const { roomId, initialStreamUrl, initialTitle, isHost: initialIsHost } = route.params;

  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  
  // Local states mimicking the web's room page
  const [streamUrl, setStreamUrl] = useState(initialStreamUrl || '');
  const [roomTitle, setRoomTitle] = useState(initialTitle || 'Watch Party');
  const [roomStatus, setRoomStatus] = useState<any>(null);
  const [isHost, setIsHost] = useState(initialIsHost || false);
  const [memberCount, setMemberCount] = useState(1);
  const [forceSync, setForceSync] = useState(true);
  
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<any[]>([]);
  
  const [waitingForHost, setWaitingForHost] = useState(false);
  const [waitReason, setWaitReason] = useState<string | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);
  
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', isError: false });
  
  const playerRef = useRef<CustomVideoPlayerRef>(null);
  const flatListRef = useRef<FlatList>(null);
  const syncLockRef = useRef(false);
  const emojiIdRef = useRef(0);
  const syncPositionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef(0);

  useEffect(() => {
    const init = async () => {
      const storedToken = await AsyncStorage.getItem('@auth_token');
      setToken(storedToken);
      try {
        const profile = await authApi.getProfile();
        setUserId(profile?._id || profile?.id || '');
      } catch (e) {}
    };
    init();
  }, []);

  const {
    isConnected,
    emitPlay, emitPause, emitSeek, emitSyncToggle,
    emitChat, emitEmoji, emitSyncPosition, emitLeaveRoom,
    emitHostBuffering, emitHostBufferEnd
  } = useWatchPartySocket({
    roomId,
    token,
    onRoomStatus: (status) => {
      setRoomStatus(status);
      setIsHost(status.is_host);
      setMemberCount(status.member_count);
      setForceSync(status.force_sync);
      if (status.title) setRoomTitle(status.title);
      if (status.stream_url) setStreamUrl(status.stream_url);

      setTimeout(() => {
        if (!playerRef.current) return;
        syncLockRef.current = true;
        if (status.position_sec > 0) {
          playerRef.current.remoteSeek(status.position_sec);
        }
        if (!status.is_host && status.status === 'PLAYING') {
          playerRef.current.remotePlay(status.position_sec);
        }
        setTimeout(() => { syncLockRef.current = false; }, 500);
      }, 800);
    },
    onPlay: ({ position_sec }) => {
      setWaitingForHost(false);
      setWaitReason(null);
      syncLockRef.current = true;
      playerRef.current?.remotePlay(position_sec);
      setTimeout(() => { syncLockRef.current = false; }, 500);
    },
    onPause: ({ position_sec }) => {
      syncLockRef.current = true;
      playerRef.current?.remotePause(position_sec);
      setWaitingForHost(false);
      setWaitReason(null);
      setTimeout(() => { syncLockRef.current = false; }, 500);
    },
    onSeek: ({ position_sec }) => {
      syncLockRef.current = true;
      playerRef.current?.remoteSeek(position_sec);
      setTimeout(() => { syncLockRef.current = false; }, 500);
    },
    onSyncToggle: ({ force_sync }) => setForceSync(force_sync),
    onChange: ({ stream_url, title }) => {
      setStreamUrl(stream_url);
      if (title) setRoomTitle(title);
    },
    onUserJoined: ({ username, member_count }) => {
      setMemberCount(member_count);
      setChatMessages(prev => [...prev, { user_id: 'system', username: 'System', message: `${username} joined`, type: 'system' }]);
    },
    onUserLeft: ({ username, member_count }) => {
      setMemberCount(member_count);
      setChatMessages(prev => [...prev, { user_id: 'system', username: 'System', message: `${username} left`, type: 'system' }]);
    },
    onKick: () => {
      setAlertConfig({ visible: true, title: 'Kicked', message: 'You have been removed from the room.', isError: true });
      setTimeout(() => navigation.goBack(), 3000);
    },
    onRoomClosed: ({ message }) => {
      setRoomClosed(true);
      setAlertConfig({ visible: true, title: 'Session Ended', message, isError: false });
      setTimeout(() => navigation.goBack(), 4000);
    },
    onRoomExpired: ({ message }) => {
      setRoomClosed(true);
      setAlertConfig({ visible: true, title: 'Room Expired', message, isError: true });
      setTimeout(() => navigation.goBack(), 4000);
    },
    onChat: (msg) => {
      setChatMessages(prev => [...prev, { ...msg, type: 'user' }]);
    },
    onEmojiReaction: ({ emoji, username }) => {
      const id = ++emojiIdRef.current;
      setFloatingEmojis(prev => [...prev, { id, emoji, x: Math.random() * 60 + 20 }]);
      setTimeout(() => {
        setFloatingEmojis(prev => prev.filter(e => e.id !== id));
      }, 2000);
    },
    onHostBuffering: () => {
      if (isHost) return;
      setWaitingForHost(true);
      setWaitReason('host_buffering');
      syncLockRef.current = true;
      playerRef.current?.remotePause(0); // Time doesn't matter here
      setTimeout(() => { syncLockRef.current = false; }, 500);
    },
    onHostBufferEnd: ({ position_sec }) => {
      if (isHost) return;
      setWaitingForHost(false);
      setWaitReason(null);
      syncLockRef.current = true;
      if (roomStatus?.status === 'PLAYING') {
        playerRef.current?.remotePlay(position_sec);
      } else {
        playerRef.current?.remoteSeek(position_sec);
      }
      setTimeout(() => { syncLockRef.current = false; }, 500);
    },
    onSyncPosition: ({ position_sec }) => {
      if (isHost) return;
      // We don't have direct access to currentTime here unless passed via callback
      // But we can trigger a sync if we store the latest viewer time from onLocalSyncPosition
      const drift = lastSyncTimeRef.current - position_sec;
      if (drift > 1) {
        setWaitingForHost(true);
        setWaitReason('syncing');
        syncLockRef.current = true;
        playerRef.current?.remotePause(position_sec);
        setTimeout(() => { syncLockRef.current = false; }, 500);
      } else if (drift < -2) {
        syncLockRef.current = true;
        playerRef.current?.remoteSeek(position_sec);
        setTimeout(() => { syncLockRef.current = false; }, 500);
      } else if (waitingForHost && Math.abs(drift) <= 1) {
        setWaitingForHost(false);
        setWaitReason(null);
        if (roomStatus?.status === 'PLAYING') {
          playerRef.current?.remotePlay(position_sec);
        }
      }
    }
  });

  // Keep scroll at bottom for chat
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatMessages]);

  const handleCopyRoomId = async () => {
    await Clipboard.setStringAsync(roomId);
    setAlertConfig({ visible: true, title: 'Copied', message: 'Room ID copied to clipboard.', isError: false });
  };

  const handleShareRoom = async () => {
    try {
      await Share.share({
        message: `${t('streaming.joinMyWatchParty', { defaultValue: 'Join my Watch Party on NTN Streaming!' })} ID: ${roomId}`,
      });
    } catch (error) {
      // ignore
    }
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleLocalPlay = (time: number) => {
    if (syncLockRef.current || !isHost) return;
    emitPlay(time);
  };

  const handleLocalPause = (time: number) => {
    if (syncLockRef.current || !isHost) return;
    emitPause(time);
  };

  const handleLocalSeek = (time: number) => {
    if (syncLockRef.current || !isHost) return;
    emitSeek(time);
  };

  const handleLocalSyncPosition = useCallback((time: number) => {
    lastSyncTimeRef.current = time;
    if (isHost) {
      emitSyncPosition(time);
    }
  }, [isHost, emitSyncPosition]);
  
  const handleLocalBuffering = useCallback(() => {
    if (isHost) emitHostBuffering();
  }, [isHost, emitHostBuffering]);

  const handleLocalBufferEnd = useCallback((time: number) => {
    if (isHost) emitHostBufferEnd(time);
  }, [isHost, emitHostBufferEnd]);

  if (!token) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{roomTitle}</Text>
          <View style={styles.headerSub}>
            <Text style={styles.headerSubText}>ID: {roomId}</Text>
            <TouchableOpacity onPress={handleCopyRoomId}>
              <Ionicons name="copy-outline" size={14} color="#aaa" style={{ marginLeft: 5 }} />
            </TouchableOpacity>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#555', marginHorizontal: 8 }} />
            <Ionicons name="people" size={14} color="#aaa" />
            <Text style={styles.headerSubText}> {memberCount}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.shareBtn} 
          onPress={handleShareRoom}
        >
          <Ionicons name="share-social" size={18} color="white" />
        </TouchableOpacity>

        {isHost && (
          <TouchableOpacity 
            style={[styles.syncBtn, forceSync ? { backgroundColor: themeColor } : {}]} 
            onPress={() => emitSyncToggle(!forceSync)}
          >
            <Ionicons name={forceSync ? "lock-closed" : "lock-open"} size={16} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <View style={isFullscreen ? styles.fullscreenPlayerWrapper : styles.playerWrapper}>
        {streamUrl ? (
          <CustomVideoPlayer 
            ref={playerRef}
            url={streamUrl} 
            isFullscreen={isFullscreen} 
            onToggleFullscreen={toggleFullscreen}
            themeColor={themeColor}
            title={roomTitle}
            
            isWatchPartyViewOnly={!isHost && forceSync}
            watchPartyWaitingReason={waitingForHost ? waitReason : null}
            
            onLocalPlay={handleLocalPlay}
            onLocalPause={handleLocalPause}
            onLocalSeek={handleLocalSeek}
            onLocalSyncPosition={handleLocalSyncPosition}
            onLocalBuffering={handleLocalBuffering}
            onLocalBufferEnd={handleLocalBufferEnd}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColor} />
            <Text style={{color:'white', marginTop:10}}>Waiting for host...</Text>
          </View>
        )}

        {/* Floating emojis overlay */}
        {floatingEmojis.map((e) => (
          <Animated.Text key={e.id} style={[styles.floatingEmoji, { left: `${e.x}%`, top: '80%' }]}>
            {e.emoji}
          </Animated.Text>
        ))}
      </View>

      {!isFullscreen && (
        <View style={styles.chatContainer}>
          <FlatList 
            ref={flatListRef}
            style={styles.chatList}
            contentContainerStyle={{ padding: 15 }}
            data={chatMessages}
            keyExtractor={(_, index) => index.toString()}
            ListEmptyComponent={() => (
              <Text style={styles.systemMsgText}>No messages yet. Say hi! 👋</Text>
            )}
            renderItem={({ item: msg }) => (
              <View style={styles.chatMessageRow}>
                {msg.type === 'system' ? (
                  <Text style={styles.systemMsgText}>{msg.message}</Text>
                ) : (
                  <View style={styles.userMsgContainer}>
                    <Text style={[styles.msgUsername, msg.user_id === userId ? { color: themeColor } : {}]}>
                      {msg.username}:
                    </Text>
                    <Text style={styles.msgText}>{msg.message}</Text>
                  </View>
                )}
              </View>
            )}
          />

          {showEmojis && (
            <View style={styles.emojiPicker}>
              {EMOJIS.map(em => (
                <TouchableOpacity key={em} onPress={() => { emitEmoji(em); setShowEmojis(false); }}>
                  <Text style={{ fontSize: 24, margin: 5 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.chatInputContainer}>
            <TouchableOpacity style={styles.emojiBtn} onPress={() => setShowEmojis(!showEmojis)}>
              <Ionicons name="happy-outline" size={24} color="#888" />
            </TouchableOpacity>
            <TextInput 
              style={styles.chatInput}
              placeholder="Message..."
              placeholderTextColor="#666"
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={() => {
                if(chatInput.trim()){ emitChat(chatInput.trim()); setChatInput(''); }
              }}
              returnKeyType="send"
            />
            <TouchableOpacity 
              style={[styles.sendBtn, { backgroundColor: chatInput.trim() ? themeColor : '#333' }]}
              onPress={() => {
                if(chatInput.trim()){ emitChat(chatInput.trim()); setChatInput(''); }
              }}
            >
              <Ionicons name="send" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        isError={alertConfig.isError}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  backBtn: { padding: 10, marginRight: 5 },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  headerSub: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  headerSubText: { color: '#aaa', fontSize: 13 },
  shareBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#333',
    marginLeft: 10,
  },
  syncBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#333',
    marginLeft: 10,
  },
  playerWrapper: { width: '100%', aspectRatio: 16/9, backgroundColor: '#000', position: 'relative' },
  fullscreenPlayerWrapper: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 9999 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  floatingEmoji: { position: 'absolute', fontSize: 34, zIndex: 100 },
  chatContainer: { flex: 1, backgroundColor: '#0f0f13' },
  chatList: { flex: 1 },
  chatMessageRow: { marginBottom: 8 },
  systemMsgText: { color: '#888', fontSize: 12, textAlign: 'center', fontStyle: 'italic', marginVertical: 4 },
  userMsgContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  msgUsername: { color: '#E50914', fontWeight: 'bold', fontSize: 14, marginRight: 6 },
  msgText: { color: '#ddd', fontSize: 14, lineHeight: 20 },
  emojiPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#1a1a24',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#1a1a24',
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
  },
  emojiBtn: { padding: 5, marginRight: 5 },
  chatInput: {
    flex: 1,
    backgroundColor: '#2a2a35',
    color: 'white',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    marginRight: 10,
  },
  sendBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
