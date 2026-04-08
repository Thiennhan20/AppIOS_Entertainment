import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, Easing, Dimensions, TextInput, KeyboardAvoidingView, Platform, Alert, FlatList } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { roomApi } from '../api/roomApi';
import { useAuth } from '../context/AuthContext';
import CustomAlert from '../components/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function StreamingScreen() {
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { t } = useTranslation();
  
  const [roomIdInput, setRoomIdInput] = useState('');
  
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const { user } = useAuth();

  const fetchRooms = async () => {
    try {
      const res = await roomApi.getActiveRooms();
      if (res.rooms) setActiveRooms(res.rooms);
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
        <Text style={styles.headerTitle}>NTN Streaming</Text>
      </View>

      <Animated.FlatList 
         data={activeRooms}
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
             </KeyboardAvoidingView>

             <View style={styles.roomsContainerHeader}>
               <Text style={styles.roomsHeader}>{t('streaming.activeRooms')}</Text>
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
         renderItem={({ item: room }: any) => (
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
             <View style={styles.roomCardHeader}>
                <Text style={styles.roomCardTitle} numberOfLines={1}>{room.title || t('streaming.untitledRoom')}</Text>
                <View style={styles.roomCardBadge}>
                   <Text style={styles.roomCardBadgeText}>{room.status}</Text>
                </View>
                {user && (user._id === room.host_id || user.id === room.host_id) && (
                   <TouchableOpacity 
                      style={styles.deleteBtnContainer}
                      onPress={(e) => { e.stopPropagation(); handleDeleteRoom(room.room_id); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                   >
                      <Ionicons name="trash-outline" size={16} color="#ff4444" />
                   </TouchableOpacity>
                )}
             </View>
             <View style={styles.roomCardFooter}>
                <View style={styles.roomCardHost}>
                   <Ionicons name="person-circle" size={18} color="#aaa" />
                   <Text style={styles.roomCardHostText}>{room.host_name || t('streaming.host')}</Text>
                </View>
                <View style={styles.roomCardUsers}>
                   <Ionicons name="people" size={16} color="#aaa" />
                   <Text style={styles.roomCardUsersText}>{room.member_count}/{room.max_users}</Text>
                </View>
             </View>
           </TouchableOpacity>
         )}
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
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
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
  },
  roomsHeader: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 12,
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
  }
});
