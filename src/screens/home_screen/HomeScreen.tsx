import { useTranslation } from 'react-i18next';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, Text, View, FlatList,
  TouchableOpacity, Dimensions, ActivityIndicator,
  RefreshControl, Modal, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { tmdbApi } from '../../api/tmdb';
import { authApi } from '../../api/authApi';
import { useToast } from '../../context/ToastContext';
import { commentsApi } from '../../api/commentsApi';
import { roomApi } from '../../api/roomApi';
import LongPressMoviePopup from '../../components/LongPressMoviePopup';
import WatchlistButton from '../../components/WatchlistButton';
import ScrollToTopButton from '../../components/ScrollToTopButton';

// ─── Local imports ───────────────────────────────────────────────────────────
import { styles } from './homeStyles';
import { TOP_CAST_DATA } from './utils';
import SideMenu from './SideMenu';
import HomeScreenSkeleton from './HomeScreenSkeleton';
import MovieRowSection from './sections/MovieRowSection';
import Top10Section from './sections/Top10Section';
import WatchPartiesSection from './sections/WatchPartiesSection';
import TopCastSection from './sections/TopCastSection';
import ComingSoonSection from './sections/ComingSoonSection';
import AiPicksSection from './sections/AiPicksSection';
import { TopCommentsSection, RecentCommentsSection } from './sections/CommentsSection';

const { width, height } = Dimensions.get('window');
const DEFAULT_FEATURED = require('../../../assets/splash-icon.png');

// ─── Main HomeScreen ─────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeColor, themeGradient } = useTheme();
  const { showToast } = useToast();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [recentlyWatched, setRecentlyWatched] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  
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

  // ─── Data Fetching ─────────────────────────────────────────────────────────
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
      const [movieData, tvData, roomsData] = await Promise.all([
        tmdbApi.getTrendingMovies(),
        tmdbApi.getTrendingTV(),
        roomApi.getActiveRooms().catch(() => ({ rooms: [] }))
      ]);
      const movies = (movieData as any)?.results || [];
      const tv = (tvData as any)?.results || [];
      const rooms = (roomsData as any)?.rooms || [];
      
      setTrendingMovies(movies);
      setTrendingTV(tv);
      setActiveRooms(rooms);

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
    startCarousel();
  };

  const onRefresh = () => { 
    setRefreshing(true); 
    fetchData(); 
    fetchUserData(); 
    fetchCommentsData();
  };

  // ─── Render helpers ────────────────────────────────────────────────────────
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

    // History (Continue Watching)
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

    // Watchlist
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

    // Default movie card
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

  // ─── Section data ──────────────────────────────────────────────────────────
  const currentFeatured = featuredList[featuredIdx] || featuredList[0];
  const prevFeatured = featuredList[prevFeaturedIdx] || featuredList[0];

  const featuredImageUri = currentFeatured?.poster_path
    ? `https://image.tmdb.org/t/p/w780${currentFeatured.poster_path}` : null;
  const prevImageUri = prevFeatured?.poster_path
    ? `https://image.tmdb.org/t/p/w780${prevFeatured.poster_path}` : null;

  const topCast = useMemo(() => TOP_CAST_DATA, []);

  const finalSections = useMemo(() => {
    const baseSections: any[] = [
      { id: 'featured', type: 'FEATURED' },
      { id: 'watch_parties', label: '🔥 Phòng Đang Xem Chung', data: activeRooms, type: 'WATCH_PARTIES' },
      { id: 'trending_movies', label: '🍿 Top 10 Thịnh Hành Hôm Nay', data: trendingMovies.slice(0, 10), type: 'TOP_10', isTV: false, isHistory: false, isWatchlist: false },
      { id: 'history', label: `▶️ ${t('home.continue_watching')}`, data: recentlyWatched, type: 'MOVIE_ROW', isTV: false, isHistory: true, isWatchlist: false },
      { id: 'top_cast', label: '⭐ Diễn Viên Được Yêu Thích', data: topCast, type: 'TOP_CAST' },
      { id: 'ai_picks', label: '✨ AI Đề Xuất Riêng Cho Bạn', data: topRated.slice(0, 10), type: 'AI_PICKS', isTV: false },
      { id: 'trending_tv', label: t('home.top_tv_shows'), data: trendingTV.slice(0, 10), type: 'MOVIE_ROW', isTV: true, isHistory: false, isWatchlist: false },
      { id: 'watchlist_row', label: t('home.your_watchlist'), data: watchlist, type: 'MOVIE_ROW', isTV: false, isHistory: false, isWatchlist: true },
      { id: 'top_comments', type: 'TOP_COMMENTS', data: topComments },
      { id: 'recent_comments', type: 'RECENT_COMMENTS', data: recentComments },
    ];

    if (phase2Loaded) {
      baseSections.push(
        { id: 'upcoming', label: '⏳ Sắp Ra Mắt (Đặt Lịch Theo Dõi)', data: upcoming, type: 'COMING_SOON', isTV: false, isHistory: false, isWatchlist: false },
        { id: 'action', label: '💥 Đẩy Cao Trào, Xả Stress Mới Phê', data: actionMovies, type: 'MOVIE_ROW', isTV: false, isHistory: false, isWatchlist: false },
        { id: 'anime', label: '👺 Lặn Sâu Vào Thế Giới Wibu', data: anime, type: 'MOVIE_ROW', isTV: true, isHistory: false, isWatchlist: false },
        { id: 'horror', label: '👻 Dành Riêng Cho Đêm Khuya Không Ngủ', data: horrorMovies, type: 'MOVIE_ROW', isTV: false, isHistory: false, isWatchlist: false },
        { id: 'romance', label: '☔ Khóc Thêm Chút Nữa Mưa Rơi', data: romanceMovies, type: 'MOVIE_ROW', isTV: false, isHistory: false, isWatchlist: false }
      );
    }

    return baseSections.filter(s => s.type === 'FEATURED' || (s.data && s.data.length > 0));
  }, [trendingMovies, trendingTV, recentlyWatched, watchlist, topComments, recentComments, upcoming, actionMovies, anime, horrorMovies, romanceMovies, topRated, phase2Loaded, t]);

  // ─── Section renderer ──────────────────────────────────────────────────────
  const renderHomeSection = useCallback(({ item: section }: any) => {
    if (section.type === 'FEATURED') {
      return (
        <View style={styles.featuredContainer}>
          {prevImageUri ? (
            <Image source={{ uri: prevImageUri }} style={styles.featuredImage} />
          ) : (
            <Image source={DEFAULT_FEATURED} style={styles.featuredImage} />
          )}
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

    if (section.type === 'MOVIE_ROW') return <MovieRowSection section={section} renderMovieCard={renderMovieCard} />;
    if (section.type === 'TOP_10') return <Top10Section section={section} navigation={navigation} />;
    if (section.type === 'WATCH_PARTIES') return <WatchPartiesSection section={section} navigation={navigation} />;
    if (section.type === 'TOP_CAST') return <TopCastSection section={section} />;
    if (section.type === 'COMING_SOON') return <ComingSoonSection section={section} navigation={navigation} />;
    if (section.type === 'AI_PICKS') return <AiPicksSection section={section} renderMovieCard={renderMovieCard} />;
    if (section.type === 'TOP_COMMENTS') return <TopCommentsSection data={section.data} navigation={navigation} />;
    if (section.type === 'RECENT_COMMENTS') return <RecentCommentsSection data={section.data} navigation={navigation} />;

    return null;
  }, [featuredList, featuredIdx, prevFeaturedIdx, fadeAnim, currentFeatured, prevFeatured, featuredImageUri, prevImageUri, themeColor, themeGradient, renderMovieCard, navigation, t]);

  // ─── Render ────────────────────────────────────────────────────────────────
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
        <Image style={styles.logo} source={require('../../../assets/icon.png')} />
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SearchScreen')}
        >
          <Ionicons name="search" size={18} color="#CCC" />
          <Text style={styles.searchText}>{t('home.search_movies')}</Text>
        </TouchableOpacity>
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

      {/* Trailer Modal */}
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

      {/* Long Press Detail Popup */}
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
