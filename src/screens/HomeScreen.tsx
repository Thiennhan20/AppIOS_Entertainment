import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, Text, View, Image, ScrollView, 
  TouchableOpacity, Dimensions, ActivityIndicator,
  RefreshControl, Modal, TouchableWithoutFeedback, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { tmdbApi } from '../api/tmdb';

const { width, height } = Dimensions.get('window');
const DEFAULT_FEATURED = require('../../assets/movies.webp');

// ─── Dark glass menu ────────────────────────────────────────────────────────
function SideMenu({
  visible,
  onClose,
  insets,
  navigation,
}: {
  visible: boolean;
  onClose: () => void;
  insets: any;
  navigation: any;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(true);
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim  = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, friction: 20, tension: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  if (!visible) return null;

  const NavItem = ({ icon, label, active = false, onPress, chevron = false, expanded = false }: any) => (
    <TouchableOpacity
      style={[ms.navItem, active && ms.navItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color={active ? '#fff' : '#888'} style={ms.navIcon} />
      <Text style={[ms.navLabel, active && ms.navLabelActive]}>{label}</Text>
      {chevron && (
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color="#555"
        />
      )}
    </TouchableOpacity>
  );

  const SubItem = ({ icon, label, danger = false, badge = '' }: any) => (
    <TouchableOpacity style={ms.subItem} activeOpacity={0.7}>
      <Ionicons name={icon} size={16} color={danger ? '#E50914' : '#666'} style={ms.navIcon} />
      <Text style={[ms.subLabel, danger && { color: '#E50914', fontWeight: '500' }]}>{label}</Text>
      {badge ? (
        <View style={ms.badge}>
          <Text style={ms.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[ms.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                ms.menu,
                { marginTop: insets.top + 58 },
                { opacity: fadeAnim, transform: [{ translateX }] },
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={{ paddingBottom: 12 }}
              >
                {/* Nav links */}
                <View style={ms.section}>
                  <NavItem icon="home"             label="Home"     active />
                  <NavItem icon="film-outline"      label="Movies"   onPress={() => { onClose(); navigation.navigate('ListScreen', { type: 'movie' }); }} />
                  <NavItem icon="tv-outline"        label="TV Shows" onPress={() => { onClose(); navigation.navigate('ListScreen', { type: 'tv' }); }} />
                  <NavItem
                    icon="grid-outline"
                    label="More"
                    chevron
                    expanded={moreOpen}
                    onPress={() => { setMoreOpen(v => !v); setProfileOpen(false); }}
                  />
                  {moreOpen && (
                    <View style={ms.subGroup}>
                      <SubItem icon="newspaper-outline"   label="News" />
                      <SubItem icon="people-outline"      label="About" />
                      <SubItem icon="help-circle-outline" label="FAQ" />
                      <SubItem icon="mail-outline"        label="Contact" />
                      <SubItem icon="play-outline"        label="Streaming" />
                    </View>
                  )}
                </View>

                <View style={ms.divider} />

                {/* Profile block */}
                <View style={ms.section}>
                  <TouchableOpacity
                    style={ms.profileHeader}
                    onPress={() => { setProfileOpen(v => !v); setMoreOpen(false); }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: 'https://i.pravatar.cc/100?img=33' }}
                      style={ms.avatar}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={ms.profileName} numberOfLines={1}>Nguyễn Thiện Nhân</Text>
                      <Text style={ms.profileSub}>5904 • Member</Text>
                    </View>
                    <Ionicons
                      name={profileOpen ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color="#555"
                    />
                  </TouchableOpacity>

                  {profileOpen && (
                    <View style={ms.subGroup}>
                      <SubItem icon="bookmark-outline"  label="Watchlist" badge="11" />
                      <SubItem icon="person-outline"    label="Profile" />
                      <SubItem icon="settings-outline"  label="Settings" />
                      <View style={ms.thinDivider} />
                      <SubItem icon="log-out-outline"   label="Logout" danger />
                    </View>
                  )}
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  menu: {
    width: width * 0.62,
    maxWidth: 250,
    maxHeight: height * 0.72,
    backgroundColor: '#16161e',
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  section: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 16,
    marginVertical: 2,
  },
  thinDivider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 4,
    marginHorizontal: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 9,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: 'rgba(229,9,20,0.14)',
    borderLeftWidth: 2,
    borderLeftColor: '#E50914',
  },
  navIcon: {
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
    color: '#888',
    fontWeight: '400',
  },
  navLabelActive: {
    color: '#fff',
    fontWeight: '500',
  },
  subGroup: {
    paddingLeft: 14,
    paddingTop: 2,
    paddingBottom: 2,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  subLabel: {
    flex: 1,
    fontSize: 13,
    color: '#777',
  },
  badge: {
    backgroundColor: 'rgba(229,9,20,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '600',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 11,
    padding: 10,
    gap: 10,
    marginBottom: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: 'rgba(229,9,20,0.5)',
  },
  profileName: {
    color: '#e0e0e0',
    fontSize: 13,
    fontWeight: '500',
  },
  profileSub: {
    color: '#555',
    fontSize: 11,
    marginTop: 1,
  },
});

// ─── Main HomeScreen ─────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [trendingTV,     setTrendingTV]     = useState<any[]>([]);
  const [topRated,       setTopRated]       = useState<any[]>([]);
  const [featured,       setFeatured]       = useState<any>(null);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [menuVisible,    setMenuVisible]    = useState(false);

  const fetchData = async () => {
    try {
      const [movieData, tvData, topData] = await Promise.all([
        tmdbApi.getTrendingMovies(),
        tmdbApi.getTrendingTV(),
        tmdbApi.getTopRatedMovies(),
      ]);
      const movies = (movieData as any)?.results || [];
      const tv     = (tvData   as any)?.results || [];
      const top    = (topData  as any)?.results || [];
      setTrendingMovies(movies);
      setTrendingTV(tv);
      setTopRated(top);
      if (movies.length > 0) setFeatured(movies[0]);
    } catch (e) {
      console.warn('Backend might be down/slow:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const renderMovieCard = (item: any, isTV = false) => {
    const title    = item.title || item.name;
    const imageUrl = item.poster_path
      ? `https://image.tmdb.org/t/p/w400${item.poster_path}` : null;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.movieCard}
        onPress={() => navigation.navigate('DetailScreen', { item, isTV })}
        activeOpacity={0.8}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.moviePoster} />
        ) : (
          <View style={[styles.moviePoster, styles.placeholderCard]}>
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12 }}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  const featuredImageUri = featured?.poster_path
    ? `https://image.tmdb.org/t/p/w780${featured.poster_path}` : null;

  return (
    <View style={styles.container}>

      {/* ── Floating header ── */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + 10 }]}>
        {/* Logo */}
        <Image style={styles.logo} source={require('../../assets/icon.png')} />

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SearchScreen')}
        >
          <Ionicons name="search" size={16} color="#555" />
          <Text style={styles.searchText}>Tìm kiếm phim...</Text>
        </TouchableOpacity>

        {/* Menu button */}
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={22} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* ── Side menu ── */}
      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        insets={insets}
        navigation={navigation}
      />

      {/* ── Scrollable content ── */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E50914" />
        }
      >
        {/* Featured */}
        <View style={styles.featuredContainer}>
          {featuredImageUri ? (
            <Image source={{ uri: featuredImageUri }} style={styles.featuredImage} />
          ) : (
            <Image source={DEFAULT_FEATURED} style={styles.featuredImage} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(15,15,19,0.8)', '#0f0f13']}
            style={styles.gradient}
          />
          <View style={styles.featuredContent}>
            <Text style={styles.featuredCategory}>
              {featured?.original_language === 'en' ? 'Hollywood' : 'International'} • Trending
            </Text>
            <View style={styles.featuredActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="add" size={22} color="white" />
                <Text style={styles.actionText}>My List</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => navigation.navigate('DetailScreen', { item: featured })}
              >
                <Ionicons name="play" size={22} color="black" />
                <Text style={styles.playButtonText}>Play</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('DetailScreen', { item: featured })}
              >
                <Ionicons name="information-circle-outline" size={22} color="white" />
                <Text style={styles.actionText}>Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Rows */}
        <View style={styles.listContainer}>
          {[
            { label: 'Trending Movies', data: trendingMovies, isTV: false },
            { label: 'Trending TV Shows', data: trendingTV, isTV: true },
            { label: 'Top Rated', data: topRated, isTV: false },
          ].map(({ label, data, isTV }) => (
            <View key={label}>
              <Text style={styles.sectionTitle}>{label}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {data.map(item => renderMovieCard(item, isTV))}
              </ScrollView>
            </View>
          ))}
          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },

  // Header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: 'rgba(15,15,19,0.82)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchText: { color: '#555', marginLeft: 8, fontSize: 14 },
  menuBtn: {
    marginLeft: 12,
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // Featured
  featuredContainer: { height: height * 0.7, width: '100%' },
  featuredImage:     { width: '100%', height: '100%', resizeMode: 'cover' },
  gradient:          { position: 'absolute', left: 0, right: 0, bottom: 0, height: 300 },
  featuredContent:   { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', paddingBottom: 22 },
  featuredCategory:  { color: 'white', fontSize: 13, fontWeight: '600', marginBottom: 18, textShadowColor: 'black', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  featuredActions:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '80%' },
  actionButton:      { alignItems: 'center' },
  actionText:        { color: 'white', fontSize: 12, marginTop: 5, fontWeight: '500' },
  playButton:        { backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 5 },
  playButtonText:    { color: 'black', fontSize: 15, fontWeight: 'bold', marginLeft: 6 },

  // Lists
  listContainer: { paddingBottom: 50 },
  sectionTitle:  { color: 'white', fontSize: 17, fontWeight: '700', marginLeft: 18, marginTop: 22, marginBottom: 10 },
  row:           { paddingHorizontal: 18 },
  movieCard:     { marginRight: 12 },
  moviePoster:   { width: 108, height: 158, borderRadius: 9, resizeMode: 'cover' },
  placeholderCard: { backgroundColor: '#222230', justifyContent: 'center', alignItems: 'center', padding: 10 },
});