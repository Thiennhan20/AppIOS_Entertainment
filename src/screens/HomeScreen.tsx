import { useTranslation } from 'react-i18next';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, Text, View, Image, ScrollView, FlatList,
  TouchableOpacity, Dimensions, ActivityIndicator,
  RefreshControl, Modal, TouchableWithoutFeedback, Animated, Vibration
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { tmdbApi } from '../api/tmdb';
import { authApi } from '../api/authApi';
import { useToast } from '../context/ToastContext';
import { commentsApi } from '../api/commentsApi';
import LongPressMoviePopup from '../components/LongPressMoviePopup';
import WatchlistButton from '../components/WatchlistButton';
import ScrollToTopButton from '../components/ScrollToTopButton';
const { width, height } = Dimensions.get('window');
const DEFAULT_FEATURED = require('../../assets/splash-icon.png');

// ─── Utility ──────────────────────────────────────────────────────────────────
const getTimeSince = (dateString: string, t: any) => {
  if (!dateString) return t('home.just_now');
  const diff = Math.max(0, Date.now() - new Date(dateString).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('home.just_now');
  if (minutes < 60) return `${minutes} ${t('home.mins_ago')}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${t('home.hours_ago')}`;
  const days = Math.floor(hours / 24);
  return `${days} ${t('home.days_ago')}`;
};

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
  const { t } = useTranslation();
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
  const { themeColor } = useTheme();

  if (!visible) return null;

  const NavItem = ({ icon, label, active = false, onPress, chevron = false, expanded = false }: any) => (
    <TouchableOpacity
      style={[
        ms.navItem, 
        active && { backgroundColor: `${themeColor}24`, borderLeftWidth: 2, borderLeftColor: themeColor }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={15} color={active ? '#fff' : '#888'} style={ms.navIcon} />
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
       <Ionicons name={icon} size={16} color={danger ? themeColor : '#666'} style={ms.navIcon} />
       <Text style={[ms.subLabel, danger && { color: themeColor, fontWeight: '500' }]}>{label}</Text>
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
                  <NavItem icon="home"             label={t('general.home')}     active />
                  <NavItem icon="film-outline"     label={t('filter.movie')}    onPress={() => { onClose(); navigation.navigate('ListScreen', { type: 'movie' }); }} />
                  <NavItem icon="tv-outline"       label={t('filter.tv_show')}  onPress={() => { onClose(); navigation.navigate('ListScreen', { type: 'tv' }); }} />
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
});

const SKELETON_COLOR_1 = '#1c1c24';
const SKELETON_COLOR_2 = '#2a2a35';

function SkeletonRow({ titleWidth = 100 }: { titleWidth?: number }) {
  return (
    <View style={{ paddingBottom: 15 }}>
      <View style={{ width: titleWidth, height: 20, backgroundColor: SKELETON_COLOR_1, marginLeft: 18, marginTop: 22, marginBottom: 10, borderRadius: 4 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18 }}>
        {[1,2,3,4].map(i => (
          <View key={i} style={{ width: 108, height: 158, backgroundColor: SKELETON_COLOR_1, borderRadius: 9, marginRight: 12 }} />
        ))}
      </ScrollView>
    </View>
  );
}

function HomeScreenSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <View style={[styles.featuredContainer, { backgroundColor: SKELETON_COLOR_1 }]} />
      <SkeletonRow titleWidth={150} />
      <SkeletonRow titleWidth={120} />
      <SkeletonRow titleWidth={180} />
    </View>
  );
}

// ─── Main HomeScreen ─────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeColor, themeGradient } = useTheme();
  const { showToast } = useToast();

  const [recentlyWatched, setRecentlyWatched] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [trendingTV,     setTrendingTV]     = useState<any[]>([]);
  const [topRated,       setTopRated]       = useState<any[]>([]);
  const [upcoming,       setUpcoming]       = useState<any[]>([]);
  const [actionMovies,   setActionMovies]   = useState<any[]>([]);
  const [anime,          setAnime]          = useState<any[]>([]);
  const [horrorMovies,   setHorrorMovies]   = useState<any[]>([]);
  const [romanceMovies,  setRomanceMovies]  = useState<any[]>([]);

  const [featuredList,   setFeaturedList]   = useState<any[]>([]);
  const [featuredIdx,    setFeaturedIdx]    = useState(0);
  const [prevFeaturedIdx, setPrevFeaturedIdx] = useState(0);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const carouselTimer = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (featuredIdx === prevFeaturedIdx) return;
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      setPrevFeaturedIdx(featuredIdx);
    });
  }, [featuredIdx]);

  const [topComments,    setTopComments]    = useState<any[]>([]);
  const [recentComments, setRecentComments] = useState<any[]>([]);

  const flatListRef = React.useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 300 && !showScrollTop) setShowScrollTop(true);
    if (offsetY <= 300 && showScrollTop) setShowScrollTop(false);
  };

  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [menuVisible,    setMenuVisible]    = useState(false);

  const [phase2Loaded,   setPhase2Loaded]   = useState(false);
  const [loadingPhase2,  setLoadingPhase2]  = useState(false);

  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [longPressedMovie, setLongPressedMovie] = useState<any>(null);

  const handleTrailerPress = async (item: any) => {
    if (!item) return;
    try {
      const videos = item.isTV || item.name || item.first_air_date
        ? await tmdbApi.getTVVideos(item.id)
        : await tmdbApi.getMovieVideos(item.id);
      const vidList = (videos as any)?.results || [];
      const ytTrailer = vidList.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      
      if (ytTrailer) {
        setActiveTrailerKey(ytTrailer.key);
        setShowTrailer(true);
      } else {
        showToast(t('home.trailer_not_available'), 'info');
      }
    } catch (err) {
      console.log(err);
      showToast(t('home.cannot_load_trailer'), 'error');
    }
  };

  const fetchUserData = async () => {
    try {
      const [histResp, watchResp] = await Promise.all([
        authApi.getRecentlyWatched(),
        authApi.getWatchlist()
      ]);
      setRecentlyWatched((histResp as any)?.items || []);
      setWatchlist((watchResp as any)?.watchlist || []);
    } catch {
      // User might not be logged in or error
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const [movieData, tvData] = await Promise.all([
        tmdbApi.getTrendingMovies(),
        tmdbApi.getTrendingTV(),
      ]);
      const movies = (movieData as any)?.results || [];
      const tv = (tvData as any)?.results || [];
      
      setTrendingMovies(movies);
      setTrendingTV(tv);

      if (movies.length >= 3 && tv.length >= 2) {
        setFeaturedList([
          { ...movies[0], isTV: false },
          { ...movies[1], isTV: false },
          { ...movies[2], isTV: false },
          { ...tv[0], isTV: true },
          { ...tv[1], isTV: true }
        ]);
      }
    } catch (e) {
      console.warn('Phase 1 err:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPhase2 = async () => {
    if (phase2Loaded || loadingPhase2) return;
    setLoadingPhase2(true);
    try {
      const [topData, upcomingData, actionData, animeData, horrorData, romanceData] = await Promise.all([
        tmdbApi.getTopRatedMovies(),
        tmdbApi.getUpcomingMovies(),
        tmdbApi.getActionMovies(),
        tmdbApi.getAnime(),
        tmdbApi.getHorrorMovies(),
        tmdbApi.getRomanceMovies(),
      ]);
      
      const top = (topData as any)?.results || [];
      const upData  = (upcomingData as any)?.results || [];
      const up = upData.filter((movie: any) => {
        if (!movie.release_date) return false;
        const movieReleaseDate = new Date(movie.release_date);
        const currentDateObj = new Date();
        currentDateObj.setHours(0,0,0,0);
        return movieReleaseDate >= currentDateObj;
      });

      const action  = (actionData as any)?.results || [];
      const ani     = (animeData  as any)?.results || [];
      const horror  = (horrorData as any)?.results || [];
      const romance = (romanceData as any)?.results || [];

      setTopRated(top);
      setUpcoming(up);
      setActionMovies(action);
      setAnime(ani);
      setHorrorMovies(horror);
      setRomanceMovies(romance);
      setPhase2Loaded(true);
    } catch (e) { console.warn('Phase 2 err:', e); } 
      finally { setLoadingPhase2(false); }
  };


  const startCarousel = () => {
    if (carouselTimer.current) clearInterval(carouselTimer.current);
    carouselTimer.current = setInterval(() => {
      setFeaturedIdx(prev => (prev + 1) % 5);
    }, 6000);
  };

  const fetchCommentsData = async () => {
    try {
      const [top, recent] = await Promise.all([
        commentsApi.getTopComments(10),
        commentsApi.getRecentComments(10)
      ]);
      
      const tItems = top || [];
      const rItems = recent || [];
      const cache = new Map();

      const enrich = async (item: any) => {
        const key = `${item.type}-${item.movieId}`;
        if (!cache.has(key)) {
          const p = item.type === 'tv' || item.type === 'tvshow' 
            ? tmdbApi.getTVDetail(item.movieId)
            : tmdbApi.getMovieDetail(item.movieId);
          cache.set(key, p.catch(() => null));
        }
        
        const detail = await cache.get(key);
        return {
          ...item,
          movieTitle: detail?.title || detail?.name || t('general.unknown'),
          moviePoster: detail?.poster_path ? `https://image.tmdb.org/t/p/w200${detail.poster_path}` : null,
        };
      };

      const [enrichedTop, enrichedRecent] = await Promise.all([
        Promise.all(tItems.map(enrich)),
        Promise.all(rItems.map(enrich))
      ]);

      setTopComments(enrichedTop);
      setRecentComments(enrichedRecent);
    } catch (e) {
      console.warn('Comments fetch err:', e);
    }
  };

  useEffect(() => {
    fetchData(); 
    fetchCommentsData();
  }, []);

  useEffect(() => {
    if (featuredList.length > 0) {
      startCarousel();
    }
    return () => {
      if (carouselTimer.current) clearInterval(carouselTimer.current);
    };
  }, [featuredList]);

  const handleDotPress = (index: number) => {
    setFeaturedIdx(index);
    startCarousel(); // Reset timer
  };

  const onRefresh = () => { 
    setRefreshing(true); 
    fetchData(); 
    fetchUserData(); 
    fetchCommentsData();
  };

  const renderMovieCard = useCallback((item: any, isTV = false, isHistory = false, isWatchlist = false, index: number) => {
    const title = item.title || item.name;
    const navItem = isHistory || isWatchlist ? {
      ...item,
      id: item.contentId || item.id,
      title: title,
      poster_path: isHistory ? item.poster?.replace('https://image.tmdb.org/t/p/w400', '') : item.poster_path,
    } : item;
    const navIsTV = isHistory ? item.isTVShow : (isWatchlist ? (item.type === 'tv') : isTV);

    const handleLongPressMovie = () => {

      setLongPressedMovie({ ...navItem, isTV: navIsTV });
    };

    // Bốc tách History (Continue Watching) thành giao diện Thẻ Nằm Ngang cực ngầu
    if (isHistory) {
      const imgUri = item.poster?.replace('w400', 'w200');
      
      const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
      };

      return (
        <TouchableOpacity 
          style={styles.historyCard}
          onPress={() => navigation.navigate('DetailScreen', { item: navItem, isTV: navIsTV })}
          onLongPress={handleLongPressMovie}
          delayLongPress={400}
          activeOpacity={0.8}
        >
          {imgUri ? (
            <Image source={{ uri: imgUri }} style={styles.historyPoster} />
          ) : (
            <View style={[styles.historyPoster, styles.placeholderCard]}>
               <Text style={{ color: '#fff', fontSize: 10 }}>{title}</Text>
            </View>
          )}
          <View style={styles.historyInfo} pointerEvents="none">
            <Text style={styles.historyTitle} numberOfLines={1}>{title}</Text>
            
            <View style={styles.historyBadgeRow}>
              {item.server && (
                <View style={[styles.historyBadge, { backgroundColor: '#E50914' }]}>
                  <Text style={styles.historyBadgeText}>
                    {item.server.toLowerCase().includes('server1') ? 'Server 1' : 
                     item.server.toLowerCase().includes('server3') ? 'Server 3' : item.server}
                  </Text>
                </View>
              )}
              {item.audio && (
                <View style={[styles.historyBadge, { backgroundColor: '#a32cc4' }]}>
                  <Text style={styles.historyBadgeText}>
                    {item.audio.toLowerCase().includes('vietsub') ? t('player.subtitled') : 
                     (item.audio.toLowerCase().includes('lồng') || item.audio.toLowerCase().includes('thuyết')) ? t('player.dubbed') : 
                     item.audio}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.historyPlayRow}>
               <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.9)" />
               <View style={{ marginLeft: 8, justifyContent: 'center' }}>
                 {(item.isTVShow || item.isTV) && item.season && item.episode ? (
                   <Text style={styles.historySubtitle}>{t('general.season')} {item.season} - {t('general.episode')} {item.episode}</Text>
                 ) : null}
                 <Text style={styles.historyTime}>
                   {formatTime(item.currentTime)} / {formatTime(item.duration)}
                 </Text>
               </View>
            </View>
            
            <View style={styles.progressContainer}>
               <View style={[styles.progressBar, { width: `${Math.min((item.currentTime / Math.max(item.duration, 1)) * 100, 100)}%` }]} />
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Bốc tách Danh Sách (Watchlist)
    if (isWatchlist) {
      const imgUri = item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null;
      return (
        <TouchableOpacity 
          style={styles.watchlistCard}
          onPress={() => navigation.navigate('DetailScreen', { item: navItem, isTV: navIsTV })}
          onLongPress={handleLongPressMovie}
          delayLongPress={400}
          activeOpacity={0.8}
        >
          {imgUri ? (
            <Image source={{ uri: imgUri }} style={styles.moviePoster} />
          ) : (
            <View style={[styles.moviePoster, styles.placeholderCard]}>
              <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12 }}>{title}</Text>
            </View>
          )}
          <View style={styles.watchlistBadge} pointerEvents="none">
             <Ionicons name="bookmark" size={16} color="#0f0f13" />
          </View>
        </TouchableOpacity>
      );
    }

    // Default phim bình thường
    const originalPoster = item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null;
    return (
      <TouchableOpacity
        style={styles.movieCard}
        onPress={() => navigation.navigate('DetailScreen', { item: navItem, isTV: navIsTV })}
        onLongPress={handleLongPressMovie}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        {originalPoster ? (
          <Image source={{ uri: originalPoster }} style={styles.moviePoster} />
        ) : (
          <View style={[styles.moviePoster, styles.placeholderCard]}>
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12 }}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [navigation, t]);

  const currentFeatured = featuredList[featuredIdx] || featuredList[0];
  const prevFeatured = featuredList[prevFeaturedIdx] || featuredList[0];

  const featuredImageUri = currentFeatured?.poster_path
    ? `https://image.tmdb.org/t/p/w780${currentFeatured.poster_path}` : null;
  const prevImageUri = prevFeatured?.poster_path
    ? `https://image.tmdb.org/t/p/w780${prevFeatured.poster_path}` : null;

  const finalSections = useMemo(() => {
    const baseSections: any[] = [
      { id: 'featured', type: 'FEATURED' },
      { id: 'trending_movies', label: t('home.trending_movies'), data: trendingMovies, type: 'MOVIE_ROW', isTV: false, isHistory: false, isWatchlist: false },
      { id: 'history', label: `▶️ ${t('home.continue_watching')}`, data: recentlyWatched, type: 'MOVIE_ROW', isTV: false, isHistory: true, isWatchlist: false },
      { id: 'trending_tv', label: t('home.top_tv_shows'), data: trendingTV, type: 'MOVIE_ROW', isTV: true, isHistory: false, isWatchlist: false },
      { id: 'watchlist_row', label: t('home.your_watchlist'), data: watchlist, type: 'MOVIE_ROW', isTV: false, isHistory: false, isWatchlist: true },
      { id: 'top_comments', type: 'TOP_COMMENTS', data: topComments },
      { id: 'recent_comments', type: 'RECENT_COMMENTS', data: recentComments },
    ];

    if (phase2Loaded) {
      baseSections.push(
        { id: 'upcoming', label: t('home.coming_soon'), data: upcoming, type: 'MOVIE_ROW', isTV: false, isHistory: false, isWatchlist: false },
        { id: 'action', label: t('home.action_thriller'), data: actionMovies, type: 'MOVIE_ROW', isTV: false, isHistory: false, isWatchlist: false },
        { id: 'anime', label: t('home.anime_animation'), data: anime, type: 'MOVIE_ROW', isTV: true, isHistory: false, isWatchlist: false },
        { id: 'horror', label: t('home.horror_thrills'), data: horrorMovies, type: 'MOVIE_ROW', isTV: false, isHistory: false, isWatchlist: false },
        { id: 'romance', label: t('home.sweet_romance'), data: romanceMovies, type: 'MOVIE_ROW', isTV: false, isHistory: false, isWatchlist: false },
        { id: 'top_rated', label: t('home.top_rated'), data: topRated, type: 'MOVIE_ROW', isTV: false, isHistory: false, isWatchlist: false }
      );
    }

    return baseSections.filter(s => s.type === 'FEATURED' || (s.data && s.data.length > 0));
  }, [trendingMovies, trendingTV, recentlyWatched, watchlist, topComments, recentComments, upcoming, actionMovies, anime, horrorMovies, romanceMovies, topRated, phase2Loaded, t]);

  const renderHomeSection = useCallback(({ item: section }: any) => {
    if (section.type === 'FEATURED') {
      return (
        <View style={styles.featuredContainer}>
          {/* Previous Image as Bottom Layer */}
          {prevImageUri ? (
            <Image source={{ uri: prevImageUri }} style={styles.featuredImage} />
          ) : (
            <Image source={DEFAULT_FEATURED} style={styles.featuredImage} />
          )}

          {/* New Image Fading In over Bottom Layer */}
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}>
            {featuredImageUri ? (
              <Image source={{ uri: featuredImageUri }} style={styles.featuredImage} />
            ) : (
              <Image source={DEFAULT_FEATURED} style={styles.featuredImage} />
            )}
          </Animated.View>

          <LinearGradient
            colors={['transparent', 'rgba(15,15,19,0.8)', '#0f0f13']}
            style={styles.gradient}
          />
          <View style={styles.featuredContent}>
            {/* Fade in new Title Text smoothly */}
            <Animated.Text style={[styles.featuredCategory, { opacity: fadeAnim }]}>
              {currentFeatured?.isTV ? 'TV Series' : 'Movie'} • {currentFeatured?.original_language === 'en' ? 'Hollywood' : 'International'}
            </Animated.Text>
            <View style={styles.featuredActions}>
              <WatchlistButton 
                movie={currentFeatured} 
                styleType="featured" 
                onWatchlistUpdated={fetchUserData}
              />
              <TouchableOpacity
                onPress={() => navigation.navigate('DetailScreen', { item: currentFeatured, isTV: currentFeatured?.isTV })}
              >
                <LinearGradient
                  colors={(themeGradient as [string, string]) || [themeColor, themeColor]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.playButton}
                >
                  <Ionicons name="play" size={22} color="white" />
                  <Text style={[styles.playButtonText, { color: 'white' }]}>{t('general.play')}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleTrailerPress(currentFeatured)}
              >
                <Ionicons name="film-outline" size={22} color="white" />
                <Text style={styles.actionText}>{t('home.trailer')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dotsContainer}>
              {featuredList.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.thumbnailDotContainer, featuredIdx === index && styles.thumbnailDotActive]}
                  onPress={() => handleDotPress(index)}
                  activeOpacity={0.8}
                >
                  <Image 
                    source={{ uri: `https://image.tmdb.org/t/p/w200${item.poster_path || item.backdrop_path}` }} 
                    style={styles.thumbnailDotImage} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      );
    }

    if (section.type === 'MOVIE_ROW') {
      return (
        <View style={{ paddingBottom: 15 }}>
          <Text style={styles.sectionTitle}>{section.label}</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            data={section.data}
            keyExtractor={(item, idx) => `${item.id || item.contentId}-${idx}`}
            renderItem={({ item, index }) => renderMovieCard(item, section.isTV, section.isHistory, section.isWatchlist, index)}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={3}
            removeClippedSubviews={true}
          />
        </View>
      );
    }

    if (section.type === 'TOP_COMMENTS') {
      return (
        <View style={{ paddingBottom: 15 }}>
          <Text style={[styles.sectionTitle, { color: '#E50914' }]}>{t('home.top_comments')}</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            data={section.data}
            keyExtractor={(item) => `top-${item._id}`}
            renderItem={({ item, index }) => (
              <TouchableOpacity 
                style={styles.topCommentCard}
                activeOpacity={0.8}
                onPress={() => {
                  navigation.navigate('DetailScreen', {
                    item: {
                      id: item.movieId,
                      title: item.movieTitle,
                      poster_path: item.moviePoster ? item.moviePoster.replace('https://image.tmdb.org/t/p/w200', '') : null
                    },
                    isTV: item.type === 'tv' || item.type === 'tvshow'
                  });
                }}
              >
                <Ionicons name="trophy" size={80} color="rgba(229, 9, 20, 0.08)" style={styles.topQuoteIcon} />
                <View style={styles.movieContextBar}>
                  {item.moviePoster && <Image source={{ uri: item.moviePoster }} style={styles.contextPoster} />}
                  <View style={{ flex: 1, paddingRight: 5 }}>
                    <Text style={styles.contextTitle} numberOfLines={1}>{item.movieTitle}</Text>
                    <Text style={styles.contextTime}>{getTimeSince(item.createdAt, t)}</Text>
                  </View>
                </View>
                <Text style={styles.topCommentContent} numberOfLines={3}>"{item.content}"</Text>
                <View style={styles.topCommentFooter}>
                  <Image source={{ uri: item.user?.avatar || 'https://i.pravatar.cc/150' }} style={styles.topCommentAvatar} />
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={styles.topCommentName} numberOfLines={1}>{item.user?.name}</Text>
                    <View style={styles.topStatsRow}>
                      <Ionicons name="heart" size={13} color="#E50914" />
                      <Text style={styles.topStatText}>{item.likes} {t('home.upvotes')}</Text>
                      {item.replyCount ? (
                        <>
                          <View style={styles.dotSeparator} />
                          <Ionicons name="chatbubbles" size={13} color="#a32cc4" />
                          <Text style={styles.topStatText}>{item.replyCount}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.topRankBadge}>
                    <Text style={styles.topRankText}>#{index + 1}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            initialNumToRender={2}
            maxToRenderPerBatch={3}
            windowSize={3}
          />
        </View>
      );
    }

    if (section.type === 'RECENT_COMMENTS') {
      return (
        <View style={{ paddingBottom: 15 }}>
          <Text style={[styles.sectionTitle, { color: '#4da6ff' }]}>{t('home.fresh_comments')}</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            data={section.data}
            keyExtractor={(item) => `recent-${item._id}`}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.recentCommentCard}
                activeOpacity={0.8}
                onPress={() => {
                  navigation.navigate('DetailScreen', {
                    item: {
                      id: item.movieId,
                      title: item.movieTitle,
                      poster_path: item.moviePoster ? item.moviePoster.replace('https://image.tmdb.org/t/p/w200', '') : null
                    },
                    isTV: item.type === 'tv' || item.type === 'tvshow'
                  });
                }}
              >
                <View style={styles.recentHeader}>
                  <View style={styles.recentAvatarContainer}>
                    <Image source={{ uri: item.user?.avatar || 'https://i.pravatar.cc/150' }} style={styles.recentAvatar} />
                    <View style={styles.recentOnlineDot} />
                  </View>
                  <View style={styles.recentMeta}>
                    <Text style={styles.recentName} numberOfLines={1}>{item.user?.name}</Text>
                    <Text style={styles.recentTime}>{getTimeSince(item.createdAt, t)}</Text>
                  </View>
                  <View style={styles.recentMovieSide}>
                     {item.moviePoster && <Image source={{ uri: item.moviePoster }} style={styles.recentSidePoster} />}
                     <Text style={styles.recentSideTitle} numberOfLines={1}>{item.movieTitle}</Text>
                  </View>
                </View>
                <View style={styles.recentContentBubble}>
                  <Text style={styles.recentContentText} numberOfLines={3}>{item.content}</Text>
                </View>
              </TouchableOpacity>
            )}
            initialNumToRender={2}
            maxToRenderPerBatch={3}
            windowSize={3}
          />
        </View>
      );
    }

    return null;
  }, [featuredList, featuredIdx, prevFeaturedIdx, fadeAnim, currentFeatured, prevFeatured, featuredImageUri, prevImageUri, themeColor, themeGradient, renderMovieCard, navigation, t]);

  if (loading) {
    return (
      <View style={styles.container}>
        <HomeScreenSkeleton />
      </View>
    );
  }

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
          <Ionicons name="search" size={18} color="#CCC" />
          <Text style={styles.searchText}>{t('home.search_movies')}</Text>
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
      <FlatList
        ref={flatListRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        data={finalSections}
        keyExtractor={(item) => item.id}
        renderItem={renderHomeSection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
        }
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={3}
        windowSize={5}
        onEndReached={fetchPhase2}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingPhase2 ? <View style={{ height: 200, justifyContent: 'center' }}><ActivityIndicator size="large" color={themeColor} /><Text style={{color: 'gray', textAlign: 'center', marginTop: 10}}>Loading more...</Text></View> : null}
      />

      {/* Trailer Modal (như trên web) */}
      <Modal visible={showTrailer} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowTrailer(false)}>
        {showTrailer && (
          <View style={styles.trailerOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowTrailer(false)} />
            <View style={styles.trailerBox}>
               <View style={styles.trailerHeader}>
                  <Text style={styles.trailerTitle}>{t('home.trailer')}</Text>
                  <TouchableOpacity onPress={() => setShowTrailer(false)}>
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
               </View>
               {activeTrailerKey && (
                 <View style={{ backgroundColor: '#000' }}>
                   <YoutubePlayer
                     height={Math.round((width * 0.9) * (9/16))}
                     width={Math.round(width * 0.9)}
                     play={true}
                     videoId={activeTrailerKey}
                     initialPlayerParams={{
                       rel: false,
                       modestbranding: true,
                       preventFullScreen: true,
                     }}
                   />
                 </View>
               )}
            </View>
          </View>
        )}
      </Modal>

      {/* Long Press Detail Popup via Reusable Component */}
      <LongPressMoviePopup 
        movie={longPressedMovie} 
        onClose={() => setLongPressedMovie(null)} 
        onWatchlistUpdated={() => fetchUserData()}
      />

      <ScrollToTopButton 
        visible={showScrollTop} 
        onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
        bottomOffset={85} 
      />


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
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  searchText: { color: '#E0E0E0', marginLeft: 8, fontSize: 14, fontWeight: '500' },
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
  featuredContent:   { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', paddingBottom: 55 },
  featuredCategory:  { color: 'white', fontSize: 13, fontWeight: '600', marginBottom: 18, textShadowColor: 'black', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  featuredActions:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '80%' },
  actionButton:      { alignItems: 'center' },
  actionText:        { color: 'white', fontSize: 12, marginTop: 5, fontWeight: '500' },
  playButton:        { backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 5 },
  playButtonText:    { color: 'black', fontSize: 15, fontWeight: 'bold', marginLeft: 6 },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: -15,
  },
  thumbnailDotContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  thumbnailDotActive: {
    borderColor: '#fff',
    transform: [{ scale: 1.15 }],
  },
  thumbnailDotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Lists
  listContainer: { paddingBottom: 50 },
  sectionTitle:  { color: 'white', fontSize: 17, fontWeight: '700', marginLeft: 18, marginTop: 22, marginBottom: 10 },
  row:           { paddingHorizontal: 18 },
  movieCard:     { marginRight: 12 },
  moviePoster:   { width: 108, height: 158, borderRadius: 9, resizeMode: 'cover' },
  placeholderCard: { backgroundColor: '#222230', justifyContent: 'center', alignItems: 'center', padding: 10 },
  
  // Custom History Card
  historyCard: {
    width: 200,
    height: 100,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    marginRight: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  historyPoster: { width: 75, height: '100%', resizeMode: 'cover' },
  historyInfo: { flex: 1, padding: 10, justifyContent: 'space-between', position: 'relative' },
  historyTitle: { color: 'white', fontSize: 13, fontWeight: '700' },
  historyBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: -2 },
  historyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 },
  historyBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  historyPlayRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 2 },
  historySubtitle: { color: '#bbb', fontSize: 10, marginBottom: 2 },
  historyTime: { color: '#888', fontSize: 10, fontWeight: '500' },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#333',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E50914',
  },

  // Custom Watchlist Card
  watchlistCard: {
    marginRight: 14,
    borderRadius: 12, // slightly rounder
    overflow: 'hidden',
  },
  watchlistBadge: {
    position: 'absolute',
    top: -2,
    right: 8,
    backgroundColor: '#E50914',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
  },

  // Unique Top Comment
  topCommentCard: {
    width: 290,
    backgroundColor: '#1E1925', // Slight reddish/purple dark tint
    borderRadius: 16,
    padding: 18,
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  topQuoteIcon: {
    position: 'absolute',
    top: -10,
    left: 10,
  },
  movieContextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 6,
    borderRadius: 8,
  },
  contextPoster: {
    width: 24,
    height: 36,
    borderRadius: 4,
    marginRight: 8,
  },
  contextTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contextTime: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },

  // Trailer Modal styles
  trailerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailerBox: {
    width: '90%',
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  trailerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    paddingHorizontal: 15,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  trailerTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  topCommentContent: {
    color: '#F0F0F0',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    minHeight: 60,
    marginTop: 6,
    zIndex: 1,
  },
  topCommentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  topCommentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#E50914',
  },
  topCommentName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  topStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  topStatText: {
    color: '#aaa',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    marginHorizontal: 8,
  },
  topRankBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topRankText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
  },

  // Unique Recent Comment (Feed Style)
  recentCommentCard: {
    width: 260,
    backgroundColor: '#151922', // Slight blueish dark tint
    borderRadius: 16,
    padding: 16,
    marginRight: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#4da6ff',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  recentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 8, // Square-ish avatar for tech/feed vibe
  },
  recentOnlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    backgroundColor: '#00FA9A',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#151922',
  },
  recentMeta: {
    flex: 1,
    paddingRight: 10,
  },
  recentName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  recentTime: {
    color: '#4da6ff',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  recentMovieSide: {
    alignItems: 'flex-end',
    maxWidth: 70,
  },
  recentSidePoster: {
    width: 20,
    height: 30,
    borderRadius: 3,
    marginBottom: 4,
  },
  recentSideTitle: {
    color: '#888',
    fontSize: 9,
    width: 60,
    textAlign: 'right',
  },
  recentContentBubble: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    borderRadius: 10,
    borderTopLeftRadius: 2, // Speech bubble effect
  },
  recentContentText: {
    color: '#D1D1D6',
    fontSize: 13,
    lineHeight: 20,
  },

});
