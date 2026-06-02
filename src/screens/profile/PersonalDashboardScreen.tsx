import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Easing, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with paddings

export default function PersonalDashboardScreen({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardsAnims = [
    useRef(new Animated.Value(30)).current,
    useRef(new Animated.Value(30)).current,
    useRef(new Animated.Value(30)).current,
    useRef(new Animated.Value(30)).current,
  ];

  useEffect(() => {
    // Fade in the screen
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.poly(3)),
      useNativeDriver: true,
    }).start();

    // Staggered slide up for the 4 cards
    const anims = cardsAnims.map((anim) => 
      Animated.spring(anim, {
        toValue: 0,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      })
    );
    Animated.stagger(80, anims).start();
  }, []);

  const menuItems = [
    {
      id: 'watchlist',
      title: t('profile.watchlist'),
      subtitle: t('general.home') === 'Home' ? 'Saved movies & shows' : 'Danh sách phim đã lưu',
      icon: 'bookmark' as const,
      iconOutline: 'bookmark-outline' as const,
      onPress: () => navigation.navigate('UserListScreen', { type: 'watchlist' }),
      gradient: ['#FF5E62', '#FF9966'] as [string, string],
    },
    {
      id: 'history',
      title: t('profile.watch_history'),
      subtitle: t('general.home') === 'Home' ? 'Recent viewing activity' : 'Lịch sử đã xem gần đây',
      icon: 'time' as const,
      iconOutline: 'time-outline' as const,
      onPress: () => navigation.navigate('UserListScreen', { type: 'history' }),
      gradient: ['#11998e', '#38ef7d'] as [string, string],
    },
    {
      id: 'comments',
      title: t('profile.my_comments'),
      subtitle: t('general.home') === 'Home' ? 'Your thoughts & replies' : 'Quản lý bình luận & góp ý',
      icon: 'chatbubbles' as const,
      iconOutline: 'chatbubbles-outline' as const,
      onPress: () => navigation.navigate('UserCommentsScreen'),
      gradient: ['#00c6ff', '#0072ff'] as [string, string],
    },
    {
      id: 'friends',
      title: t('friends.title'),
      subtitle: t('general.home') === 'Home' ? 'Your community hub' : 'Danh sách bạn bè của bạn',
      icon: 'people' as const,
      iconOutline: 'people-outline' as const,
      onPress: () => navigation.navigate('FriendsScreen'),
      gradient: ['#a8c0ff', '#3f2b96'] as [string, string],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.my_profile')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main content grid */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.introSection}>
            <Text style={styles.welcomeText}>
              {t('general.home') === 'Home' ? 'Personal Space' : 'Không gian cá nhân'}
            </Text>
            <Text style={styles.subWelcomeText}>
              {t('general.home') === 'Home' 
                ? 'Manage your watch lists, interactions, and connections in one custom place.' 
                : 'Quản lý danh sách lưu trữ, lịch sử xem phim và kết nối bạn bè ngay tại đây.'}
            </Text>
          </View>

          <View style={styles.gridContainer}>
            {menuItems.map((item, index) => (
              <Animated.View 
                key={item.id}
                style={[
                  styles.cardWrapper,
                  { transform: [{ translateY: cardsAnims[index] }] }
                ]}
              >
                <TouchableOpacity 
                  style={[styles.card, { borderColor: `${themeColor}22` }]}
                  onPress={item.onPress}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={item.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardHeaderIconContainer}
                  >
                    <Ionicons name={item.iconOutline} size={22} color="#fff" />
                  </LinearGradient>

                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  
                  <View style={styles.cardFooter}>
                    <Text style={[styles.exploreLink, { color: themeColor }]}>
                      {t('general.home') === 'Home' ? 'Explore' : 'Khám phá'}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={themeColor} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0f0f13' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  backBtn: { 
    padding: 10 
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  introSection: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  subWelcomeText: {
    fontSize: 13,
    color: '#888',
    lineHeight: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#18181f',
    borderRadius: 16,
    padding: 16,
    height: 164,
    borderWidth: 1,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeaderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#777',
    lineHeight: 15,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  exploreLink: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
});
