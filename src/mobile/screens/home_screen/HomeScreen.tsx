import { useTranslation } from 'react-i18next';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, Text, View, FlatList,
  TouchableOpacity, Dimensions,
  RefreshControl, Modal, Animated, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { tmdbApi } from '../../../api/tmdb';
import { authApi } from '../../../api/authApi';
import { useToast } from '../../../context/ToastContext';
import { commentsApi } from '../../../api/commentsApi';
import { roomApi } from '../../../api/roomApi';
import LongPressMoviePopup from '../../components/LongPressMoviePopup';
import WatchlistButton from '../../components/WatchlistButton';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import NotificationBell from '../../components/NotificationBell';
import CustomAlert from '../../components/CustomAlert';
import useScrollToTop from '../../../hooks/useScrollToTop';

// ─── Local imports ───────────────────────────────────────────────────────────
import { styles } from './homeStyles';
import SideMenu from './SideMenu';
import HomeScreenSkeleton from './HomeScreenSkeleton';
import MovieRowSection from './sections/MovieRowSection';
import WatchPartiesSection from './sections/WatchPartiesSection';
import ComingSoonSection from './sections/ComingSoonSection';
import { TopCommentsSection, RecentCommentsSection } from './sections/CommentsSection';
import {
  EntertainmentSection,
  FeaturedActorsSection,
  FrameRowSection,
  HomeCTASection,
  RankedPosterSection,
  AnimeHeroSection,
  Romance3DSection,
} from './sections/HomeFrameSections';

const { width, height } = Dimensions.get('window');
const DEFAULT_FEATURED = require('../../../../assets/splash-icon.png');

// ─── Main HomeScreen ─────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeColor, themeGradient } = useTheme();
  const { showToast } = useToast();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [recentlyWatched, setRecentlyWatched] = useState<any[]>([]);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [trendingTV,     setTrendingTV]     = useState<any[]>([]);
  const [upcoming,       setUpcoming]       = useState<any[]>([]);
  const [actionMovies,   setActionMovies]   = useState<any[]>([]);
  const [anime,          setAnime]          = useState<any[]>([]);
  const [horrorMovies,   setHorrorMovies]   = useState<any[]>([]);
  const [romanceMovies,  setRomanceMovies]  = useState<any[]>([]);
  const [koreanItems,    setKoreanItems]    = useState<any[]>([]);
  const [usukItems,      setUsukItems]      = useState<any[]>([]);
  const [chinaItems,     setChinaItems]     = useState<any[]>([]);
  const [topMoviesToday, setTopMoviesToday] = useState<any[]>([]);
  const [topTVToday,     setTopTVToday]     = useState<any[]>([]);
  const [featuredActors, setFeaturedActors] = useState<any[]>([]);

  // Track visible sections to pause background timers when off-screen
  const [visibleSections, setVisibleSections] = useState<string[]>([]);

  const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
    const ids = viewableItems.map((v: any) => v.item?.id).filter(Boolean);
    setVisibleSections(ids);
  }).current;

  const viewabilityConfig = React.useRef({
    viewAreaCoveragePercentThreshold: 20,
  }).current;

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
  const { handleScroll, showScrollTop } = useScrollToTop();

  const onScrollList = (event: any) => {
    handleScroll(event);
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 100 && !bottomLoadedRef.current) {
      bottomLoadedRef.current = true;
      setBottomLoaded(true);
      fetchBottomData();
    }
  };

  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [menuVisible,    setMenuVisible]    = useState(false);

  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [longPressedMovie, setLongPressedMovie] = useState<any>(null);

  const homeSectionsRef = React.useRef<any>({});
  const [bottomLoaded, setBottomLoaded] = useState(false);
  const bottomLoadedRef = React.useRef(false);

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
      showToast(t('home.cannot_load_trailer'), 'error');
    }
  };

  const handleDeleteHistory = (item: any) => {
    setItemToDelete(item);
    setDeleteAlertVisible(true);
  };

  const confirmDeleteHistory = async () => {
    if (!itemToDelete) return;
    try {
      await authApi.deleteRecentlyWatchedItem(
        itemToDelete.contentId,
        itemToDelete.isTVShow,
        itemToDelete.season,
        itemToDelete.episode
      );
      fetchUserData();
      showToast(t('general.success'), 'success');
    } catch (err) {
      showToast(t('general.error'), 'error');
    } finally {
      setDeleteAlertVisible(false);
      setItemToDelete(null);
    }
  };

  const fetchUserData = async () => {
    try {
      const histResp = await authApi.getRecentlyWatched();
      setRecentlyWatched((histResp as any)?.items || []);
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
      // Phase 1: Load top content (Featured, Continue Watching, Watch Parties, Korean, US-UK, China)
      const [movieData, tvData, homeData, regionalData] = await Promise.all([
        tmdbApi.getTrendingMovies().catch(() => ({ results: [] })),
        tmdbApi.getTrendingTV().catch(() => ({ results: [] })),
        tmdbApi.getHomeBundle().catch(() => ({ sections: {} })),
        Promise.all([
          tmdbApi.getKoreanContent().catch(() => []),
          tmdbApi.getUSUKContent().catch(() => []),
          tmdbApi.getChinaContent().catch(() => []),
        ]),
        fetchUserData(),
        fetchRoomsData(),
      ]);

      const homeSections = (homeData as any)?.sections || {};
      homeSectionsRef.current = homeSections;

      const [fallbackKorean, fallbackUSUK, fallbackChina] = regionalData as any[];
      const featuredMovies = (movieData as any)?.results || [];
      const featuredTV = (tvData as any)?.results || [];
      const movies = homeSections.trendingMovies?.length ? homeSections.trendingMovies : featuredMovies;
      const tv = homeSections.trendingTV?.length ? homeSections.trendingTV : featuredTV;
      
      setTrendingMovies(movies);
      setTrendingTV(tv);
      setKoreanItems(homeSections.korean?.length ? homeSections.korean : fallbackKorean);
      setUsukItems(homeSections.usuk?.length ? homeSections.usuk : fallbackUSUK);
      setChinaItems(homeSections.china?.length ? homeSections.china : fallbackChina);
      setTopMoviesToday(homeSections.topMovies?.length ? homeSections.topMovies.slice(0, 5) : featuredMovies.slice(0, 5));
      setTopTVToday(homeSections.topTVShows?.length ? homeSections.topTVShows.slice(0, 5) : featuredTV.slice(0, 5));

      if (featuredMovies.length >= 3 && featuredTV.length >= 2) {
        setFeaturedList([
          { ...featuredMovies[0], isTV: false },
          { ...featuredMovies[1], isTV: false },
          { ...featuredMovies[2], isTV: false },
          { ...featuredTV[0], isTV: true },
          { ...featuredTV[1], isTV: true }
        ]);
      } else if (movies.length >= 3 && tv.length >= 2) {
        setFeaturedList([
          { ...movies[0], isTV: false },
          { ...movies[1], isTV: false },
          { ...movies[2], isTV: false },
          { ...tv[0], isTV: true },
          { ...tv[1], isTV: true }
        ]);
      }
    } catch (e) {
      // Top load error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBottomData = async () => {
    try {
      const homeSections = homeSectionsRef.current || {};
      
      const frameFallbackData = await Promise.all([
        tmdbApi.getUpcomingContent().catch(() => []),
        tmdbApi.getAnimeContent().catch(() => []),
        tmdbApi.getActionContent().catch(() => []),
        tmdbApi.getHorrorContent().catch(() => []),
        tmdbApi.getRomanceContent().catch(() => []),
      ]);
      const [fallbackUpcoming, fallbackAnime, fallbackAction, fallbackHorror, fallbackRomance] = frameFallbackData;

      setUpcoming(homeSections.comingSoon?.length ? homeSections.comingSoon : fallbackUpcoming);
      setAnime(homeSections.anime?.length ? homeSections.anime : fallbackAnime);
      setActionMovies(homeSections.action?.length ? homeSections.action : fallbackAction);
      setHorrorMovies(homeSections.horror?.length ? homeSections.horror : fallbackHorror);
      setRomanceMovies(homeSections.romance?.length ? homeSections.romance : fallbackRomance);

      const actorData = homeSections.actors?.length
        ? homeSections.actors
        : await tmdbApi.getFeaturedActorsFromContent([...trendingMovies.slice(0, 3), ...trendingTV.slice(0, 2)]).catch(() => []);
      setFeaturedActors(actorData);

      // Load comments in the background
      await fetchCommentsData();
    } catch (e) {
      // Bottom load error
    }
  };

  const fetchRoomsData = async () => {
    try {
      const roomsData = await roomApi.getPublicRooms();
      setActiveRooms((roomsData as any)?.rooms || []);
    } catch (e) {
      // Rooms fetch error
    }
  };

  const startCarousel = () => {
    if (carouselTimer.current) clearInterval(carouselTimer.current);
    carouselTimer.current = setInterval(() => {
      setFeaturedIdx(prev => (prev + 1) % 5);
    }, 6000);
  };

  const enrichComments = async (items: any[]) => {
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

    return Promise.all((items || []).map(enrich));
  };

  const fetchTopCommentsData = async () => {
    try {
      const top = await commentsApi.getTopComments(10);
      const enrichedTop = await enrichComments(top || []);
      setTopComments(enrichedTop);
    } catch (e) {
      // Top comments fetch error
    }
  };

  const fetchRecentCommentsData = async () => {
    try {
      const recent = await commentsApi.getRecentComments(10);
      const enrichedRecent = await enrichComments(recent || []);
      setRecentComments(enrichedRecent);
    } catch (e) {
      // Recent comments fetch error
    }
  };

  const fetchCommentsData = async () => {
    await Promise.all([
      fetchTopCommentsData(),
      fetchRecentCommentsData(),
    ]);
  };

  useEffect(() => {
    fetchData();

    const unsubscribe = navigation.addListener('focus', () => {
      roomApi.clearPublicRoomsCache();
      fetchRoomsData();
    });

    const roomsInterval = setInterval(fetchRoomsData, 30000);
    const recentCommentsInterval = setInterval(() => {
      if (bottomLoadedRef.current) fetchRecentCommentsData();
    }, 120000);
    const topCommentsInterval = setInterval(() => {
      if (bottomLoadedRef.current) fetchTopCommentsData();
    }, 300000);

    return () => {
      unsubscribe();
      clearInterval(roomsInterval);
      clearInterval(recentCommentsInterval);
      clearInterval(topCommentsInterval);
    };
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
    tmdbApi.clearCache();
    commentsApi.clearHomeCache();
    roomApi.clearPublicRoomsCache();
    bottomLoadedRef.current = false;
    setBottomLoaded(false);
    fetchData(); 
  };

  // ─── Render helpers ────────────────────────────────────────────────────────
  const renderMovieCard = useCallback((item: any, isTV = false, isHistory = false, index = 0) => {
    const title = item.title || item.name;
    const navItem = isHistory ? {
      ...item,
      id: item.contentId || item.id,
      title: title,
      poster_path: item.poster?.replace('https://image.tmdb.org/t/p/w400', ''),
    } : item;
    const navIsTV = isHistory ? item.isTVShow : isTV;

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
        <View style={styles.historyCard}>
          <TouchableOpacity 
            style={{ flex: 1, flexDirection: 'row', width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}
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
                 <View style={{ justifyContent: 'center' }}>
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
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#E50914',
              borderColor: '#ffffff',
              borderWidth: 1.5,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.5,
              shadowRadius: 3,
              elevation: 5,
            }}
            onPress={() => handleDeleteHistory(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={14} color="white" />
          </TouchableOpacity>
        </View>
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

  const finalSections = useMemo(() => {
    const mixedLabels = {
      movieLabel: t('home.movie_label'),
      tvLabel: t('home.tv_show_label'),
    };

    const baseSections: any[] = [
      { id: 'featured', type: 'FEATURED' },
      { id: 'history', label: t('home.continue_watching'), data: recentlyWatched, type: 'MOVIE_ROW', isTV: false, isHistory: true },
      { id: 'watch_parties', label: t('home.watch_parties'), data: activeRooms, type: 'WATCH_PARTIES' },
      { id: 'korean', label: t('home.korean_title'), data: koreanItems, type: 'FRAME_ROW', accent: '#EC4899', ...mixedLabels },
      { id: 'usuk', label: t('home.usuk_title'), data: usukItems, type: 'FRAME_ROW', accent: '#4F46E5', ...mixedLabels },
      { id: 'china', label: t('home.china_title'), data: chinaItems, type: 'FRAME_ROW', accent: '#EF4444', ...mixedLabels },
      { id: 'top_comments', type: 'TOP_COMMENTS', data: topComments },
      { id: 'recent_comments', type: 'RECENT_COMMENTS', data: recentComments },
      { id: 'top_movies', label: t('home.top_movies_today'), data: topMoviesToday, type: 'RANKED_POSTERS', isTV: false, accent: '#F97316' },
      { id: 'upcoming', label: t('home.coming_soon_section'), data: upcoming, type: 'COMING_SOON', isTV: false, isHistory: false },
      { id: 'top_tv', label: t('home.top_tv_today'), data: topTVToday, type: 'RANKED_POSTERS', isTV: true, accent: '#38BDF8' },
      { id: 'anime', label: t('home.anime_title'), data: anime, type: 'ANIME_HERO', accent: '#6366F1', ...mixedLabels },
      { id: 'action', label: t('home.action_title'), data: actionMovies, type: 'FRAME_ROW', accent: '#F97316', ...mixedLabels },
      { id: 'horror', label: t('home.horror_title'), data: horrorMovies, type: 'FRAME_ROW', accent: '#71717A', ...mixedLabels },
      { id: 'romance', label: t('home.romance_title'), data: romanceMovies, type: 'ROMANCE_3D', accent: '#FB7185', ...mixedLabels },
      { id: 'actors', label: t('home.actors_title'), data: featuredActors, type: 'ACTORS', accent: '#FACC15', actorLabel: t('home.acting_label') },
      { id: 'entertainment', label: t('home.entertainment_title'), type: 'ENTERTAINMENT', accent: '#A855F7', data: { movie: topMoviesToday[0], tv: topTVToday[0] } },
      { id: 'cta', label: t('home.home_cta_title'), subtitle: t('home.home_cta_subtitle'), type: 'CTA' },
    ];

    return baseSections.filter((section) => {
      if (section.type === 'FEATURED' || section.type === 'ENTERTAINMENT' || section.type === 'CTA') return true;
      return section.data && section.data.length > 0;
    });
  }, [
    activeRooms,
    recentlyWatched,
    topComments,
    recentComments,
    koreanItems,
    usukItems,
    chinaItems,
    topMoviesToday,
    upcoming,
    topTVToday,
    anime,
    actionMovies,
    horrorMovies,
    romanceMovies,
    featuredActors,
    t,
  ]);

  // ─── Section renderer ──────────────────────────────────────────────────────
  const handleFrameLongPress = useCallback((item: any, isTV: boolean) => {
    setLongPressedMovie({ ...item, isTV });
  }, []);

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
              {currentFeatured?.isTV ? t('home.tv_show_label') : t('home.movie_label')} • {currentFeatured?.original_language === 'en' ? t('home.hollywood') : t('home.international')}
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

    if (section.type === 'MOVIE_ROW') return <MovieRowSection section={section} renderMovieCard={renderMovieCard} navigation={navigation} />;
    if (section.type === 'WATCH_PARTIES') return <WatchPartiesSection section={section} navigation={navigation} />;
    const isActive = visibleSections.includes(section.id);

    if (section.type === 'FRAME_ROW') return <FrameRowSection section={section} navigation={navigation} onLongPressMovie={handleFrameLongPress} />;
    if (section.type === 'ANIME_HERO') return <AnimeHeroSection section={section} navigation={navigation} onLongPressMovie={handleFrameLongPress} isActive={isActive} />;
    if (section.type === 'ROMANCE_3D') return <Romance3DSection section={section} navigation={navigation} onLongPressMovie={handleFrameLongPress} isActive={isActive} />;
    if (section.type === 'RANKED_POSTERS') return <RankedPosterSection section={section} navigation={navigation} onLongPressMovie={handleFrameLongPress} />;
    if (section.type === 'ACTORS') return <FeaturedActorsSection section={section} />;
    if (section.type === 'ENTERTAINMENT') return <EntertainmentSection section={section} navigation={navigation} />;
    if (section.type === 'CTA') return <HomeCTASection section={section} />;
    if (section.type === 'COMING_SOON') return <ComingSoonSection section={section} navigation={navigation} />;
    if (section.type === 'TOP_COMMENTS') return <TopCommentsSection data={section.data} navigation={navigation} />;
    if (section.type === 'RECENT_COMMENTS') return <RecentCommentsSection data={section.data} navigation={navigation} isActive={isActive} />;

    return null;
  }, [featuredList, featuredIdx, prevFeaturedIdx, fadeAnim, currentFeatured, prevFeatured, featuredImageUri, prevImageUri, themeColor, themeGradient, renderMovieCard, navigation, t, handleFrameLongPress, visibleSections]);

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
        <Image style={styles.logo} source={require('../../../../assets/icon.png')} />
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SearchScreen')}
        >
          <Ionicons name="search" size={18} color="#CCC" />
          <Text style={styles.searchText}>{t('home.search_movies')}</Text>
        </TouchableOpacity>
        <NotificationBell navigation={navigation} />
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
        onScroll={onScrollList}
        scrollEventThrottle={16}
        data={finalSections}
        keyExtractor={(item) => item.id}
        renderItem={renderHomeSection}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
        }
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={3}
        windowSize={5}
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

      <CustomAlert
        visible={deleteAlertVisible}
        title={t('profile.confirm_delete_history_title')}
        message={t('profile.confirm_delete_history_desc')}
        iconName="trash-outline"
        isError={true}
        confirmText={t('general.delete')}
        cancelText={t('general.cancel')}
        onClose={() => {
          setDeleteAlertVisible(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDeleteHistory}
      />

      <ScrollToTopButton 
        visible={showScrollTop} 
        onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
      />

    </View>
  );
}
