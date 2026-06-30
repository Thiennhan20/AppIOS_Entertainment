import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, Easing, Dimensions, TextInput, KeyboardAvoidingView, Platform, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { roomApi } from '../../api/roomApi';
import { useAuth } from '../../context/AuthContext';
import CustomAlert from '../components/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';
import ScrollToTopButton from '../components/ScrollToTopButton';
import useScrollToTop from '../../hooks/useScrollToTop';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';

const getAvatarBg = (id: string) => {
  const colors = [
    '#ec4899', // rose-500
    '#8b5cf6', // violet-500
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#6366f1', // indigo-500
    '#d946ef', // fuchsia-500
  ];
  if (!id) return colors[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function StreamingScreen({ route }: any) {
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { t } = useTranslation();
  
  const params = route?.params;
  const streamUrlFromParams = params?.streamUrl || '';
  const titleFromParams = params?.title || '';
  const movieIdFromParams = params?.movieId || '';
  const posterFromParams = params?.poster || '';
  const audioFromParams = params?.audio || '';
  const isTVFromParams = params?.isTV || false;
  const seasonFromParams = params?.season || '';
  const episodeFromParams = params?.episode || '';

  const [roomIdInput, setRoomIdInput] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<{ roomId: string; title: string; streamUrl: string; hostName: string } | null>(null);
  const [duplicateRoomId, setDuplicateRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [maxRooms, setMaxRooms] = useState(30);
  const { user } = useAuth();
  const scrollRef = useRef<FlatList>(null);
  const { handleScroll, showScrollTop } = useScrollToTop();

  const handleResetParams = () => {
    navigation.setParams({
      streamUrl: undefined,
      title: undefined,
      movieId: undefined,
      poster: undefined,
      audio: undefined,
      isTV: undefined,
      season: undefined,
      episode: undefined
    });
    setCreatedRoom(null);
    setDuplicateRoomId(null);
    setError(null);
  };

  const handleCreateRoom = async () => {
    if (!user) {
      setAlertInfo({
        visible: true,
        title: t('streaming.signinRequired'),
        message: t('streaming.signinDesc'),
        isError: true,
        onConfirm: () => {
          setAlertInfo(prev => ({ ...prev, visible: false }));
          navigation.navigate('Profile', { screen: 'ProfileScreen' });
        }
      });
      return;
    }
    
    setCreatingRoom(true);
    setError(null);
    setDuplicateRoomId(null);

    try {
      const res = await roomApi.createRoom(
        titleFromParams,
        streamUrlFromParams,
        movieIdFromParams,
        audioFromParams
      );

      if (res && res.room_id) {
        setCreatedRoom({
          roomId: res.room_id,
          title: titleFromParams,
          streamUrl: streamUrlFromParams,
          hostName: user?.name || 'Host'
        });
        await fetchRooms();
      } else {
        setError(t('streaming.cannotCreateRoom'));
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.code === 'DUPLICATE_ROOM' || data?.existing_room_id) {
        setDuplicateRoomId(data.existing_room_id);
        setError(data.error || t('streaming.duplicateRoomError'));
      } else {
        setError(data?.message || data?.error || t('streaming.cannotCreateRoom'));
      }
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleGoToRoom = () => {
    if (createdRoom) {
      navigation.navigate('StreamingRoomScreen', {
        roomId: createdRoom.roomId,
        initialStreamUrl: createdRoom.streamUrl,
        initialTitle: createdRoom.title,
        isHost: true
      });
      handleResetParams();
    }
  };

  const handleCopyInvite = async () => {
    if (createdRoom) {
      await Clipboard.setStringAsync(createdRoom.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await roomApi.getActiveRooms();
      if (res.rooms) setActiveRooms(res.rooms);
      if (res.max_rooms) setMaxRooms(res.max_rooms);
    } catch (e) {
      // ignore
    } finally {
      setLoadingRooms(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      const fetchWrapper = async () => {
         if (isActive) await fetchRooms();
      };
      
      setLoadingRooms(true);
      fetchWrapper();
      
      const interval = setInterval(fetchWrapper, 15000);
      return () => {
        isActive = false;
        clearInterval(interval);
      };
    }, [])
  );

  const [alertInfo, setAlertInfo] = useState<{
    visible: boolean;
    title: string;
    message: string;
    isError: boolean;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    isError: false,
  });

  const handleDeleteRoom = (roomId: string) => {
    setAlertInfo({
      visible: true,
      title: "Close Room",
      message: "Are you sure you want to close this room?",
      isError: true,
      onConfirm: async () => {
        setAlertInfo(prev => ({ ...prev, visible: false }));
        try {
          await roomApi.closeRoom(roomId);
          setActiveRooms(prev => prev.filter(r => r.room_id !== roomId));
        } catch(e) {
           setTimeout(() => {
             setAlertInfo({
               visible: true,
               title: "Error",
               message: "Could not close room",
               isError: true,
               onConfirm: undefined,
             });
           }, 500);
        }
      }
    });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.poly(3)),
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    // Infinite breathing pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

  }, []);

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0]
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {!!streamUrlFromParams && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnHeader}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Streaming</Text>
      </View>

      <Animated.FlatList 
         ref={scrollRef}
         data={activeRooms}
         onScroll={handleScroll}
         scrollEventThrottle={16}
         keyExtractor={(item: any) => item.room_id}
         style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}
         contentContainerStyle={styles.scrollContent}
         showsVerticalScrollIndicator={false}
         ListHeaderComponent={
           <View style={{ width: '100%' }}>
             <View style={styles.heroSection}>
               <View style={styles.heroIconWrapper}>
                 <Animated.View style={[styles.glowRing, { borderColor: themeColor, transform: [{ scale: pulseAnim }] }]} />
                 <View style={[styles.iconBox, { backgroundColor: `${themeColor}22` }]}>
                   <Ionicons name="videocam" size={26} color={themeColor} />
                 </View>
               </View>
               <View style={styles.heroTextWrapper}>
                  <Text style={styles.title}>{t('streaming.watchParty')}</Text>
                  <Text style={styles.subtitle}>
                     {t('streaming.watchPartyDesc')}
                  </Text>
               </View>
             </View>

             <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', marginBottom: 20 }}>
               {streamUrlFromParams ? (
                 <LinearGradient colors={['#1e1e2d', '#15151e']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.createPanel}>
                   <View style={styles.createPanelHeader}>
                     <Text style={styles.createPanelTitle}>
                       {createdRoom ? t('streaming.roomCreatedSuccessfully') : t('streaming.createWatchParty')}
                     </Text>
                     <TouchableOpacity onPress={handleResetParams} style={styles.closePanelBtn}>
                       <Ionicons name="close" size={20} color="#888" />
                     </TouchableOpacity>
                   </View>

                   {createdRoom ? (
                     <View style={styles.successContainer}>
                       <View style={styles.successIconWrapper}>
                         <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                       </View>
                       
                       <View style={styles.roomDetailsBox}>
                         <View style={styles.detailRow}>
                           <Text style={styles.detailLabel}>ID:</Text>
                           <Text style={styles.detailValueCode}>{createdRoom.roomId}</Text>
                         </View>
                         <View style={styles.detailRow}>
                           <Text style={styles.detailLabel}>{t('streaming.host')}:</Text>
                           <Text style={styles.detailValue}>{createdRoom.hostName}</Text>
                         </View>
                         <View style={styles.detailRow}>
                           <Text style={styles.detailLabel}>{t('streaming.movie')}:</Text>
                           <Text style={styles.detailValue} numberOfLines={1}>{createdRoom.title}</Text>
                         </View>
                         <View style={styles.detailRow}>
                           <Text style={styles.detailLabel}>{t('streaming.status')}:</Text>
                           <Text style={[styles.detailValue, { color: '#3b82f6' }]}>{t('streaming.waiting')}</Text>
                         </View>
                         <View style={styles.detailRow}>
                           <Text style={styles.detailLabel}>{t('streaming.expires')}:</Text>
                           <Text style={styles.detailValue}>{t('streaming.expiresIn6Hours')}</Text>
                         </View>
                       </View>

                       <View style={styles.successActions}>
                         <TouchableOpacity 
                           style={[styles.actionBtnPrimary, { backgroundColor: themeColor }]} 
                           onPress={handleGoToRoom}
                         >
                           <Ionicons name="videocam" size={18} color="white" style={{ marginRight: 6 }} />
                           <Text style={styles.actionBtnText}>{t('streaming.enterRoom')}</Text>
                         </TouchableOpacity>
                         
                         <TouchableOpacity 
                           style={styles.actionBtnSecondary} 
                           onPress={handleCopyInvite}
                         >
                           <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={copied ? "#10b981" : "white"} style={{ marginRight: 6 }} />
                           <Text style={[styles.actionBtnTextSecondary, copied ? { color: '#10b981' } : {}]}>
                             {copied ? t('streaming.copied') : t('streaming.copyInvite')}
                           </Text>
                         </TouchableOpacity>
                       </View>
                     </View>
                   ) : (
                     <View style={styles.formContainer}>
                       <View style={styles.mediaInfoRow}>
                         {posterFromParams ? (
                           <Image source={{ uri: posterFromParams }} style={styles.mediaPoster} contentFit="cover" />
                         ) : (
                           <View style={styles.mediaPosterFallback}>
                             <Ionicons name="film" size={24} color="#555" />
                           </View>
                         )}
                         
                         <View style={styles.mediaTextWrapper}>
                           <Text style={styles.mediaTitle} numberOfLines={2}>{titleFromParams}</Text>
                           <View style={styles.badgesRow}>
                             <View style={styles.badgeTV}>
                               <Text style={styles.badgeTextTV}>{isTVFromParams ? 'TV Show' : 'Movie'}</Text>
                             </View>
                             {audioFromParams ? (
                               <View style={[styles.badgeAudio, { backgroundColor: '#f43f5e' }]}>
                                 <Text style={styles.badgeTextAudio}>{audioFromParams.toUpperCase()}</Text>
                               </View>
                             ) : null}
                           </View>
                         </View>
                       </View>

                       {error ? (
                         <View style={styles.errorBox}>
                           <Ionicons name="alert-circle" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                           <Text style={styles.errorText} numberOfLines={3}>{error}</Text>
                         </View>
                       ) : null}

                       {duplicateRoomId ? (
                         <TouchableOpacity 
                           style={styles.duplicateBtn} 
                           onPress={() => {
                             navigation.navigate('StreamingRoomScreen', {
                               roomId: duplicateRoomId,
                               initialStreamUrl: streamUrlFromParams,
                               initialTitle: titleFromParams,
                               isHost: false
                             });
                           }}
                         >
                           <Ionicons name="arrow-forward-circle" size={18} color="white" style={{ marginRight: 6 }} />
                           <Text style={styles.duplicateBtnText}>
                             {t('streaming.goToExistingRoom')} ({duplicateRoomId})
                           </Text>
                         </TouchableOpacity>
                       ) : (
                         <TouchableOpacity 
                           style={[styles.createBtnSubmit, { backgroundColor: themeColor }]} 
                           onPress={handleCreateRoom}
                           disabled={creatingRoom}
                         >
                           {creatingRoom ? (
                             <ActivityIndicator size="small" color="white" />
                           ) : (
                             <>
                               <Ionicons name="add-circle" size={20} color="white" style={{ marginRight: 6 }} />
                               <Text style={styles.createBtnSubmitText}>
                                 {t('streaming.createWatchParty')}
                               </Text>
                             </>
                           )}
                         </TouchableOpacity>
                       )}
                     </View>
                   )}
                 </LinearGradient>
               ) : (
                 <>
                   <TouchableOpacity 
                     style={[styles.createRoomHelpBtn, { backgroundColor: `${themeColor}22`, borderColor: themeColor }]}
                     onPress={() => {
                       setAlertInfo({
                         visible: true,
                         title: t('streaming.howToCreateRoom'),
                         message: t('streaming.createRoomGuide'),
                         isError: false,
                         onConfirm: undefined
                       });
                     }}
                   >
                     <Ionicons name="add-circle" size={20} color={themeColor} />
                     <Text style={[styles.createRoomHelpText, { color: themeColor }]}>{t('streaming.createRoom')}</Text>
                     <Ionicons name="information-circle-outline" size={18} color={themeColor} style={{ marginLeft: 'auto' }} />
                   </TouchableOpacity>

                   <LinearGradient colors={['#1e1e2d', '#15151e']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.featureBox}>
                     <Text style={styles.featureTextJoin}>{t('streaming.joinExisting')}</Text>
                     <View style={styles.inputRow}>
                        <TextInput 
                           style={styles.roomInput} 
                           placeholder={t('streaming.enterRoomId')} 
                           placeholderTextColor="#666"
                           value={roomIdInput}
                           onChangeText={setRoomIdInput}
                           autoCapitalize="characters"
                        />
                        <TouchableOpacity 
                          style={[styles.joinBtn, { backgroundColor: roomIdInput.trim() ? themeColor : '#333' }]}
                          disabled={!roomIdInput.trim()}
                          onPress={() => {
                             if (roomIdInput.trim() && navigation) {
                                navigation.navigate('StreamingRoomScreen', {
                                   roomId: roomIdInput.trim().toUpperCase(),
                                   initialStreamUrl: '',
                                   initialTitle: t('streaming.joinRoom'),
                                   isHost: false
                                });
                             }
                          }}
                        >
                          <Text style={styles.joinBtnText}>{t('streaming.join')}</Text>
                          <Ionicons name="arrow-forward" size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </>
                )}
              </KeyboardAvoidingView>

              <View style={styles.roomsContainerHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.roomsHeader}>{t('streaming.activeRooms')}</Text>
                  <View style={{ 
                    backgroundColor: '#fbbf24', 
                    paddingHorizontal: 8, 
                    paddingVertical: 2, 
                    borderRadius: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: '#000', fontSize: 11, fontWeight: 'bold' }}>
                      {activeRooms.length}/{maxRooms}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    setLoadingRooms(true);
                    fetchRooms();
                  }}
                  disabled={loadingRooms}
                  style={{ 
                    padding: 8, 
                    borderRadius: 20, 
                    backgroundColor: 'rgba(255,255,255,0.06)', 
                    borderWidth: 1, 
                    borderColor: 'rgba(255,255,255,0.04)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {loadingRooms ? (
                    <ActivityIndicator size="small" color="#aaa" style={{ width: 16, height: 16 }} />
                  ) : (
                    <Ionicons 
                      name="refresh" 
                      size={16} 
                      color="white" 
                    />
                  )}
                </TouchableOpacity>
              </View>
           </View>
         }
         ListEmptyComponent={
           <View style={{ width: '100%', alignItems: 'center' }}>
             <Text style={styles.emptyText}>
               {loadingRooms ? t('streaming.loading') : t('streaming.noActiveRooms')}
             </Text>
           </View>
         }
         renderItem={({ item: room }: any) => {
            const memberCount = typeof room.member_count === 'number' ? room.member_count : 0;
            const maxUsers = room.max_users || 2;
            
            const formatTimeLeft = (ttlSeconds: number) => {
              if (!ttlSeconds || ttlSeconds <= 0) return '';
              const h = Math.floor(ttlSeconds / 3600);
              const m = Math.floor((ttlSeconds % 3600) / 60);
              if (h > 0) return `${h}h ${m}m`;
              return `${m}m`;
            };
            
            const timeLeft = formatTimeLeft(room.ttl_seconds);

            const isTV = room.title?.toLowerCase().includes('tập') || 
                         room.title?.toLowerCase().includes('episode') || 
                         room.title?.toLowerCase().includes('season') || 
                         room.title?.toLowerCase().includes('ss');

            return (
              <TouchableOpacity 
                style={[styles.roomCard, { width: '100%' }]}
                onPress={() => {
                   navigation.navigate('StreamingRoomScreen', {
                      roomId: room.room_id,
                      initialStreamUrl: '',
                      initialTitle: room.title || t('streaming.watchParty'),
                      isHost: false
                   });
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {room.host_avatar ? (
                    <Image 
                      source={{ uri: room.host_avatar }} 
                      style={styles.hostAvatar} 
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.hostAvatar, styles.hostAvatarPlaceholder, { backgroundColor: getAvatarBg(room.host_id) }]}>
                      <Text style={styles.hostAvatarText}>
                        {room.host_name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                      <Text style={styles.roomCardId}>#{room.room_id}</Text>
                      
                      <View style={[styles.typeBadge, { backgroundColor: isTV ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)' }]}>
                        <Text style={[styles.typeBadgeText, { color: isTV ? '#60a5fa' : '#c084fc' }]}>
                          {isTV ? '📺 PHIM BỘ' : '🎬 PHIM'}
                        </Text>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: room.status === 'PLAYING' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                        <Text style={[styles.statusBadgeText, { color: room.status === 'PLAYING' ? '#34d399' : '#fbbf24' }]}>
                          {t('streaming.' + room.status.toLowerCase(), { defaultValue: room.status })}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.roomCardTitle} numberOfLines={1}>
                      {room.title || t('streaming.untitledRoom')}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                      <Text style={styles.roomMetadataText}>
                        {t('streaming.host')}: {room.host_name || 'Host'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="people" size={12} color="#888" />
                        <Text style={styles.roomMetadataText}>{memberCount}/{maxUsers}</Text>
                      </View>
                      {!!timeLeft && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="time-outline" size={12} color="#888" />
                          <Text style={styles.roomMetadataText}>{timeLeft}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {user && (user._id === room.host_id || user.id === room.host_id) && (
                    <View style={{ marginLeft: 8, justifyContent: 'center', alignItems: 'center' }}>
                      <TouchableOpacity 
                         style={{ padding: 8, backgroundColor: 'rgba(255,68,68,0.1)', borderRadius: 8 }}
                         onPress={(e) => { e.stopPropagation(); handleDeleteRoom(room.room_id); }}
                         hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                         <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
      />

      <ScrollToTopButton
        onPress={() => scrollRef.current?.scrollToOffset({ animated: true, offset: 0 })}
        visible={showScrollTop}
      />

      <CustomAlert
        visible={alertInfo.visible}
        title={alertInfo.title}
        message={alertInfo.message}
        isError={alertInfo.isError}
        onClose={() => setAlertInfo(prev => ({ ...prev, visible: false }))}
        onConfirm={alertInfo.onConfirm}
        confirmText={alertInfo.onConfirm ? "Delete" : "OK"}
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
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
    width: '100%',
    paddingHorizontal: 5,
  },
  heroIconWrapper: {
    marginRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextWrapper: {
    flex: 1,
  },
  glowRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    opacity: 0.3,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
  },
  featureBox: {
    width: '100%',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  createRoomHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 15,
    gap: 8
  },
  createRoomHelpText: {
    fontWeight: 'bold',
    fontSize: 15
  },
  featureTextJoin: {
    color: '#ddd',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center'
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  roomInput: {
    flex: 1,
    backgroundColor: '#1a1a24',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 5
  },
  joinBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  roomsContainerHeader: {
    width: '100%',
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingRight: 5,
  },
  roomsHeader: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    paddingHorizontal: 5,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  roomCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  roomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  roomCardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  roomCardBadge: {
    backgroundColor: '#2a2a35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roomCardBadgeText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
  },
  roomCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomCardHost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  roomCardHostText: {
    color: '#aaa',
    fontSize: 13,
  },
  roomCardUsers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roomCardUsersText: {
    color: '#aaa',
    fontSize: 13,
  },
  deleteBtnContainer: {
    marginLeft: 10, 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: 'rgba(255,68,68,0.1)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  createPanel: {
    width: '100%',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  createPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  createPanelTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closePanelBtn: {
    padding: 4,
  },
  formContainer: {
    width: '100%',
  },
  mediaInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 10,
  },
  mediaPoster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  mediaPosterFallback: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaTextWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  mediaTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badgeTV: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeTextTV: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeAudio: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeTextAudio: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  createBtnSubmit: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBtnSubmitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    flex: 1,
  },
  duplicateBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 12,
  },
  duplicateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successContainer: {
    width: '100%',
    alignItems: 'center',
  },
  successIconWrapper: {
    marginBottom: 15,
  },
  roomDetailsBox: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#888',
    fontSize: 13,
  },
  detailValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '70%',
  },
  detailValueCode: {
    color: '#f59e0b',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  successActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#444',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnTextSecondary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backBtnHeader: {
    marginRight: 10,
    padding: 4,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222',
  },
  hostAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  roomCardId: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  deleteBtn: {
    marginLeft: 6,
    padding: 2,
  },
  roomMetadataText: {
    color: '#888',
    fontSize: 12,
  },
  joinBtnSmall: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinBtnSmallText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
