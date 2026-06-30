import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, FlatList, BackHandler, Modal, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import YoutubePlayer from 'react-native-youtube-iframe';
import { tmdbApi } from '../../api/tmdb';
import { phimApi } from '../../api/phimapi';
import { nguoncApi } from '../../api/nguonc';
import { authApi } from '../../api/authApi';
import { commentsApi } from '../../api/commentsApi';

interface TVDetailScreenProps {
  route: any;
  navigation: any;
}

export default function TVDetailScreen({ route, navigation }: TVDetailScreenProps) {
  const { t } = useTranslation();
  const { themeColor } = useTheme();
  const { item, isTV } = route.params;

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const [cast, setCast] = useState<any[]>([]);
  const [similar, setSimilar] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);

  // TV Show Season & Episodes
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  // Modal selector visibilities
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [audioModalVisible, setAudioModalVisible] = useState(false);

  // BackHandler to close overlays on TV remote Back press
  useEffect(() => {
    if (serverModalVisible || audioModalVisible) {
      const backAction = () => {
        setServerModalVisible(false);
        setAudioModalVisible(false);
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );
      return () => backHandler.remove();
    }
  }, [serverModalVisible, audioModalVisible]);

  // Streaming Options
  const [selectedServer, setSelectedServer] = useState<'Server 1' | 'Server 3'>('Server 1');
  const [selectedAudio, setSelectedAudio] = useState<'vietsub' | 'dubbed'>('vietsub');
  const [inWatchlist, setInWatchlist] = useState(false);
  const [checkingWatchlist, setCheckingWatchlist] = useState(false);
  
  // Streaming availability
  const [s1Available, setS1Available] = useState<('vietsub' | 'dubbed')[]>([]);
  const [s3Available, setS3Available] = useState<('vietsub' | 'dubbed')[]>([]);
  const [s1LinksData, setS1LinksData] = useState<any>(null);
  const [s3LinksData, setS3LinksData] = useState<any>(null);
  const [checkingStreams, setCheckingStreams] = useState(false);
  const [savedWatchUrl, setSavedWatchUrl] = useState<string>('');
  const apiLinksFetched = useRef(false);

  // Dropdown selector states
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const [audioDropdownOpen, setAudioDropdownOpen] = useState(false);
  const [focusedDropdownOpt, setFocusedDropdownOpt] = useState<string | null>(null);

  // Reset states when item.id or selectedSeason changes
  useEffect(() => {
    apiLinksFetched.current = false;
    setS1LinksData(null);
    setS3LinksData(null);
    setS1Available([]);
    setS3Available([]);
    setSavedWatchUrl('');
  }, [item.id, selectedSeason]);

  const [focusedActionBtn, setFocusedActionBtn] = useState<string | null>(null);

  // Trailer states
  const [showTrailerPopup, setShowTrailerPopup] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isTrailerLoading, setIsTrailerLoading] = useState(false);
  const [focusedCloseBtn, setFocusedCloseBtn] = useState(false);

  const [focusedSeasonNumber, setFocusedSeasonNumber] = useState<number | null>(null);
  const [focusedEpisodeNumber, setFocusedEpisodeNumber] = useState<number | null>(null);
  const [focusedCastIndex, setFocusedCastIndex] = useState<number | null>(null);
  const [focusedSimilarIndex, setFocusedSimilarIndex] = useState<number | null>(null);
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  // Fetch Details
  useEffect(() => {
    const fetchAllDetails = async () => {
      try {
        let detailsRes, creditsRes, similarRes;
        if (isTV) {
          [detailsRes, creditsRes, similarRes] = await Promise.all([
            tmdbApi.getTVDetail(item.id),
            tmdbApi.getTVCredits(item.id),
            tmdbApi.getSimilarTV(item.id)
          ]);
        } else {
          [detailsRes, creditsRes, similarRes] = await Promise.all([
            tmdbApi.getMovieDetail(item.id),
            tmdbApi.getMovieCredits(item.id),
            tmdbApi.getSimilarMovies(item.id)
          ]);
        }
        setDetails(detailsRes);
        setCast((creditsRes as any)?.cast || []);
        setSimilar((similarRes as any)?.results?.filter((i: any) => i.poster_path) || []);

        // Load comments
        const commentsData = await commentsApi.getComments(item.id.toString(), isTV ? 'tvshow' : 'movie', 'likes', 1, 15);
        setComments(commentsData?.data || []);

        // Check Watchlist status
        checkWatchlistStatus();
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchAllDetails();
  }, [item.id, isTV]);

  // Load episodes when season changes
  useEffect(() => {
    if (!isTV) return;
    const fetchSeasonEpisodes = async () => {
      setLoadingEpisodes(true);
      try {
        const seasonDetails: any = await tmdbApi.getTVSeasonDetail(item.id, selectedSeason);
        const eps = seasonDetails?.episodes || [];
        if (eps.length === 0) {
          throw new Error('No episodes found');
        }
        setEpisodes(eps);
      } catch (err) {
        // Fallback: populate fake episodes based on season count if API fails
        const currentSeason = details?.seasons?.find((s: any) => s.season_number === selectedSeason);
        const epCount = currentSeason?.episode_count || 10;
        const fallbackEps = Array.from({ length: epCount }, (_, idx) => ({
          episode_number: idx + 1,
          name: `${t('general.episode') || 'Episode'} ${idx + 1}`,
          overview: ''
        }));
        setEpisodes(fallbackEps);
      } finally {
        setLoadingEpisodes(false);
      }
    };
    
    if (details) {
      fetchSeasonEpisodes();
    }
  }, [selectedSeason, details, isTV]);

  // Check streaming availability
  const title = details?.title || details?.name || item?.title || item?.name;
  const releaseDateRaw = details?.release_date || details?.first_air_date || item?.release_date;
  const year = releaseDateRaw?.substring(0, 4) || '2026';
  const director = details?.credits?.crew?.find((c: any) => c.job === 'Director')?.name || '';

  useEffect(() => {
    if (!title || !details) return;
    let isMounted = true;

    const checkAvailableStreams = async () => {
      if (isMounted) {
        setCheckingStreams(true);
        setSavedWatchUrl('');
      }

      // Step 1: Check database first
      try {
        const dbResult = await authApi.getRecentlyWatchedItem(
          item.id.toString(), selectedServer, selectedAudio, isTV, selectedSeason, 1
        ).catch(() => null);

        if (!isMounted) return;

        if (dbResult?.item?.watchUrl) {
          setSavedWatchUrl(dbResult.item.watchUrl);
          // If API streams aren't fetched yet, default to both tracks to let user select
          setS1Available(prev => prev.length > 0 ? prev : ['vietsub', 'dubbed']);
          setS3Available(prev => prev.length > 0 ? prev : ['vietsub', 'dubbed']);
          setCheckingStreams(false);
          return; // Skip APIs, we have a DB link
        }
      } catch (err) {
        console.log('Error checking DB:', err);
      }

      // Step 2: Check APIs if not in DB and not fetched yet
      if (!apiLinksFetched.current) {
        try {
          const [s1Tracks, s3Links] = await Promise.all([
            phimApi.getStreamingLink(item.id.toString(), title, parseInt(year), 1, isTV, selectedSeason).catch(() => null),
            nguoncApi.getStreamingLink(isTV, title, parseInt(year), director, selectedSeason, 1).catch(() => null)
          ]);

          if (!isMounted) return;

          apiLinksFetched.current = true;

          // Process API results
          const s1: ('vietsub' | 'dubbed')[] = [];
          if (s1Tracks) {
            if (s1Tracks.some((a: any) => {
              const low = a.name.toLowerCase();
              return low.includes('vietsub') || low.includes('phụ đề') || low.includes('sub');
            })) s1.push('vietsub');
            if (s1Tracks.some((a: any) => {
              const low = a.name.toLowerCase();
              return low.includes('thuyết minh') || low.includes('dub') || low.includes('lồng tiếng');
            })) s1.push('dubbed');
          }

          const s3: ('vietsub' | 'dubbed')[] = [];
          if (s3Links) {
            if (s3Links.vietsub) s3.push('vietsub');
            if (s3Links.dubbed) s3.push('dubbed');
          }

          // Update all states together for smooth UI
          setS1LinksData(s1Tracks);
          setS3LinksData(s3Links);
          setS1Available(s1);
          setS3Available(s3);

          const activeList = selectedServer === 'Server 1' ? s1 : s3;
          if (activeList.length > 0 && !activeList.includes(selectedAudio)) {
            setSelectedAudio(activeList[0]);
          }
        } catch (err) {
          console.log('Error checking APIs:', err);
        }
      }

      if (isMounted) {
        setCheckingStreams(false);
      }
    };

    checkAvailableStreams();
    return () => { isMounted = false; };
  }, [title, details, selectedSeason]);

  // Clear saved URL when server/audio changes (without re-fetching APIs)
  useEffect(() => {
    setSavedWatchUrl('');
  }, [selectedServer, selectedAudio]);

  const checkWatchlistStatus = async () => {
    try {
      const resp = await authApi.getWatchlist();
      const list = (resp as any)?.items || [];
      const found = list.some((w: any) => w.id === item.id.toString() || w.contentId === item.id.toString());
      setInWatchlist(found);
    } catch (e) {
      // ignore
    }
  };

  const handleWatchlistPress = async () => {
    if (checkingWatchlist) return;
    setCheckingWatchlist(true);
    try {
      if (inWatchlist) {
        await authApi.removeFromWatchlist(item.id.toString());
        setInWatchlist(false);
      } else {
        await authApi.addToWatchlist(
          item.id.toString(),
          title,
          item.poster_path || '',
          isTV ? 'tv' : 'movie'
        );
        setInWatchlist(true);
      }
    } catch (e) {
      // ignore
    } finally {
      setCheckingWatchlist(false);
    }
  };

  const handleEpisodePlay = async (episodeNumber: number) => {
    try {
      // Priority: use saved watchUrl if available (only for the saved episode)
      if (savedWatchUrl && episodeNumber === 1) {
        const finalUrl = savedWatchUrl.startsWith('//') ? 'https:' + savedWatchUrl : savedWatchUrl;
        const activePlayer = finalUrl.includes('.m3u8') ? 'm3u8' : 'embed';
        navigation.navigate('TVPlayer', {
          item,
          isTV,
          streamUrl: finalUrl,
          activePlayer,
          title: isTV ? `${title} - S${selectedSeason} E${episodeNumber}` : title,
          selectedServer,
          selectedAudio,
          seasons: details?.seasons,
          initialSeason: selectedSeason,
          initialEpisode: episodeNumber
        });
        return;
      }

      let finalUrl = '';
      let activePlayer: 'm3u8' | 'embed' = 'embed';

      if (selectedServer === 'Server 1') {
        const audioTracks = await phimApi.getStreamingLink(item.id.toString(), title, parseInt(year), episodeNumber, isTV, selectedSeason);
        if (audioTracks && audioTracks.length > 0) {
          let streamObj = audioTracks.find((a: any) => {
            const name = a.name.toLowerCase();
            if (selectedAudio === 'vietsub') return name.includes('vietsub') || name.includes('sub');
            return name.includes('thuyết') || name.includes('lồng') || name.includes('dub');
          });
          if (!streamObj) streamObj = audioTracks[0];
          finalUrl = streamObj.url;
        }
      } else {
        const links = await nguoncApi.getStreamingLink(isTV, title, parseInt(year), director, selectedSeason, episodeNumber);
        if (links) {
          finalUrl = links[selectedAudio];
        }
      }

      if (finalUrl) {
        finalUrl = finalUrl.startsWith('//') ? 'https:' + finalUrl : finalUrl;
        activePlayer = finalUrl.includes('.m3u8') ? 'm3u8' : 'embed';
        navigation.navigate('TVPlayer', {
          item,
          isTV,
          streamUrl: finalUrl,
          activePlayer,
          title: isTV ? `${title} - S${selectedSeason} E${episodeNumber}` : title,
          selectedServer,
          selectedAudio,
          seasons: details?.seasons,
          initialSeason: selectedSeason,
          initialEpisode: episodeNumber
        });
      }
    } catch (e) {
      // ignore
    }
  };

  const handleTrailerPress = async () => {
    setIsTrailerLoading(true);
    setShowTrailerPopup(true);
    try {
      const videos = isTV
        ? await tmdbApi.getTVVideos(item.id.toString())
        : await tmdbApi.getMovieVideos(item.id.toString());
      const vidList = (videos as any)?.results || [];
      const ytTrailer = vidList.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ||
                        vidList.find((v: any) => v.type === 'Teaser' && v.site === 'YouTube') ||
                        vidList.find((v: any) => v.type === 'Clip' && v.site === 'YouTube') ||
                        vidList.find((v: any) => v.site === 'YouTube');
      if (ytTrailer) {
        setTrailerKey(ytTrailer.key);
      } else {
        setTrailerKey(null);
      }
    } catch (e) {
      setTrailerKey(null);
    } finally {
      setIsTrailerLoading(false);
    }
  };

  const handlePlayMovie = async () => {
    await handleEpisodePlay(1);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  const posterUri = details?.poster_path || item?.poster_path;
  const backdropUri = details?.backdrop_path || item?.backdrop_path;
  const featuredImageUri = backdropUri 
    ? `https://image.tmdb.org/t/p/w1280${backdropUri}`
    : (posterUri ? `https://image.tmdb.org/t/p/w780${posterUri}` : null);
  const rating = details?.vote_average ? details.vote_average.toFixed(1) : '8.5';
  const durationText = isTV 
    ? `${details?.number_of_seasons || 1} ${t('general.season') || 'Seasons'}`
    : `${details?.runtime || 120}m`;
  const genres = details?.genres?.map((g: any) => g.name).join(' • ') || '';

  const { width: screenWidth } = Dimensions.get('window');
  const trailerWidth = Math.min(screenWidth * 0.9, 960);
  const trailerHeight = trailerWidth * (9 / 16);

  return (
    <View style={styles.container}>
      {/* Background Banner */}
      <View style={styles.backdropWrapper}>
        {featuredImageUri ? (
          <Image
            source={{ uri: featuredImageUri }}
            style={styles.backdropImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.backdropPlaceholder} />
        )}
        {/* Left-to-right fade for text readability */}
        <LinearGradient
          colors={['#050609', 'rgba(5, 6, 9, 0.8)', 'rgba(5, 6, 9, 0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Top-to-bottom fade to blend with page background */}
        <LinearGradient
          colors={['transparent', 'rgba(5, 6, 9, 0.3)', '#050609']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Info Column */}
        <View style={styles.detailSection}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>

          <View style={styles.metaRow}>
            <View style={[styles.ratingBadge, { backgroundColor: themeColor }]}>
              <Ionicons name="star" size={13} color="#ffffff" />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
            <Text style={styles.metaText}>{year}</Text>
            <Text style={styles.metaText}>{durationText}</Text>
            {details?.original_language && (
              <Text style={styles.metaText}>{details.original_language.toUpperCase()}</Text>
            )}
          </View>

          {genres ? <Text style={styles.genresText}>{genres}</Text> : null}

          <Text style={styles.overviewText}>
            {details?.overview || item?.overview || t('detail.no_overview') || 'No description available.'}
          </Text>

          {/* Inline Action Selectors Row */}
          <View style={styles.actionRow}>
            {/* Play Button */}
            <Pressable
              onPress={isTV ? () => handleEpisodePlay(selectedEpisode) : handlePlayMovie}
              focusable={true}
              onFocus={() => setFocusedActionBtn('play')}
              onBlur={() => setFocusedActionBtn(null)}
              style={() => {
                const showFocused = focusedActionBtn === 'play';
                return [
                  styles.actionBtn,
                  showFocused && styles.actionBtnFocused,
                  { backgroundColor: showFocused ? '#ffffff' : '#e50914' }
                ];
              }}
            >
              {() => {
                const showFocused = focusedActionBtn === 'play';
                return (
                  <>
                    <Ionicons name="play" size={18} color={showFocused ? '#e50914' : '#ffffff'} />
                    <Text style={[styles.actionBtnText, { color: showFocused ? '#e50914' : '#ffffff' }]}>
                      {isTV 
                        ? `${t('general.play_now') || 'Play'} (S${selectedSeason} E${selectedEpisode})`
                        : t('general.play_now') || 'Play'
                      }
                    </Text>
                  </>
                );
              }}
            </Pressable>

            {/* Trailer Button */}
            <Pressable
              onPress={handleTrailerPress}
              focusable={true}
              onFocus={() => setFocusedActionBtn('trailer')}
              onBlur={() => setFocusedActionBtn(null)}
              style={() => {
                const showFocused = focusedActionBtn === 'trailer';
                return [
                  styles.actionBtn,
                  showFocused && styles.actionBtnFocused,
                  { backgroundColor: showFocused ? '#ffffff' : 'rgba(255,255,255,0.15)' }
                ];
              }}
            >
              {() => {
                const showFocused = focusedActionBtn === 'trailer';
                return (
                  <>
                    <Ionicons name="film-outline" size={18} color={showFocused ? '#000000' : '#ffffff'} />
                    <Text style={[styles.actionBtnText, { color: showFocused ? '#000000' : '#ffffff' }]}>
                      Trailer
                    </Text>
                  </>
                );
              }}
            </Pressable>

            {/* Toggle Server Button */}
            <Pressable
              onPress={() => {
                setServerDropdownOpen(!serverDropdownOpen);
                setAudioDropdownOpen(false);
              }}
              focusable={true}
              onFocus={() => setFocusedActionBtn('server')}
              onBlur={() => setFocusedActionBtn(null)}
              style={() => {
                const showFocused = focusedActionBtn === 'server';
                return [
                  styles.actionBtn,
                  showFocused && styles.actionBtnFocused,
                  { backgroundColor: showFocused ? '#ffffff' : 'rgba(255,255,255,0.15)' }
                ];
              }}
            >
              {() => {
                const showFocused = focusedActionBtn === 'server';
                return (
                  <>
                    <Ionicons name="server-outline" size={18} color={showFocused ? '#000000' : '#ffffff'} />
                    <Text style={[styles.actionBtnText, { color: showFocused ? '#000000' : '#ffffff' }]}>
                      {selectedServer}
                    </Text>
                  </>
                );
              }}
            </Pressable>

            {/* Toggle Audio Track Button */}
            <Pressable
              onPress={() => {
                setAudioDropdownOpen(!audioDropdownOpen);
                setServerDropdownOpen(false);
              }}
              focusable={true}
              onFocus={() => setFocusedActionBtn('audio')}
              onBlur={() => setFocusedActionBtn(null)}
              style={() => {
                const showFocused = focusedActionBtn === 'audio';
                return [
                  styles.actionBtn,
                  showFocused && styles.actionBtnFocused,
                  { backgroundColor: showFocused ? '#ffffff' : 'rgba(255,255,255,0.15)' }
                ];
              }}
            >
              {() => {
                const showFocused = focusedActionBtn === 'audio';
                return (
                  <>
                    <Ionicons name="musical-notes-outline" size={18} color={showFocused ? '#000000' : '#ffffff'} />
                    <Text style={[styles.actionBtnText, { color: showFocused ? '#000000' : '#ffffff' }]}>
                      {selectedAudio === 'vietsub' ? t('player.subtitled') || 'Vietsub' : t('player.dubbed') || 'Dubbed'}
                    </Text>
                  </>
                );
              }}
            </Pressable>

            {/* Watchlist Toggle */}
            <Pressable
              onPress={handleWatchlistPress}
              focusable={true}
              onFocus={() => setFocusedActionBtn('watchlist')}
              onBlur={() => setFocusedActionBtn(null)}
              style={() => {
                const showFocused = focusedActionBtn === 'watchlist';
                return [
                  styles.actionBtn,
                  showFocused && styles.actionBtnFocused,
                  { backgroundColor: showFocused ? '#ffffff' : 'rgba(255,255,255,0.15)' }
                ];
              }}
            >
              {() => {
                const showFocused = focusedActionBtn === 'watchlist';
                return (
                  <>
                    <Ionicons 
                      name={inWatchlist ? "checkmark-circle" : "add-circle-outline"} 
                      size={18} 
                      color={showFocused ? '#000000' : inWatchlist ? themeColor : '#ffffff'} 
                    />
                    <Text style={[styles.actionBtnText, { color: showFocused ? '#000000' : '#ffffff' }]}>
                      {inWatchlist ? t('detail.in_watchlist') || 'In List' : t('detail.add_watchlist') || 'My List'}
                    </Text>
                  </>
                );
              }}
            </Pressable>

            {/* Back Button */}
            <Pressable
              onPress={() => navigation.goBack()}
              focusable={true}
              onFocus={() => setFocusedActionBtn('close')}
              onBlur={() => setFocusedActionBtn(null)}
              style={() => {
                const showFocused = focusedActionBtn === 'close';
                return [
                  styles.actionBtn,
                  showFocused && styles.actionBtnFocused,
                  { backgroundColor: showFocused ? '#ffffff' : 'rgba(255,255,255,0.15)' }
                ];
              }}
            >
              {() => {
                const showFocused = focusedActionBtn === 'close';
                return (
                  <>
                    <Ionicons name="arrow-back" size={18} color={showFocused ? '#000000' : '#ffffff'} />
                    <Text style={[styles.actionBtnText, { color: showFocused ? '#000000' : '#ffffff' }]}>
                      {t('general.close') || 'Back'}
                    </Text>
                  </>
                );
              }}
            </Pressable>
          </View>

          {/* Inline Dropdown for Server Selection */}
          {serverDropdownOpen && (
            <View style={styles.dropdownSubRow}>
              <Text style={styles.dropdownLabel}>Chọn Server:</Text>
              {['Server 1', 'Server 3'].map((serverOption) => {
                const isSelected = selectedServer === serverOption;
                const optId = `server-${serverOption}`;
                const isFocused = focusedDropdownOpt === optId;
                return (
                  <Pressable
                    key={serverOption}
                    focusable={true}
                    onFocus={() => setFocusedDropdownOpt(optId)}
                    onBlur={() => setFocusedDropdownOpt(null)}
                    onPress={() => {
                      setSelectedServer(serverOption as any);
                      setServerDropdownOpen(false);
                    }}
                    style={() => [
                      styles.dropdownOptionBtn,
                      isSelected && { borderColor: themeColor },
                      isFocused && styles.dropdownOptionBtnFocused
                    ]}
                  >
                    <Text style={styles.dropdownOptionText}>{serverOption}</Text>
                    {isSelected && <Ionicons name="checkmark" size={14} color={themeColor} style={{ marginLeft: 6 }} />}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Inline Dropdown for Audio Selection */}
          {audioDropdownOpen && (
            <View style={styles.dropdownSubRow}>
              <Text style={styles.dropdownLabel}>Chọn Ngôn ngữ:</Text>
              {['vietsub', 'dubbed'].map((audioOption) => {
                const isSelected = selectedAudio === audioOption;
                const displayLabel = audioOption === 'vietsub' ? 'Vietsub' : 'Thuyết minh';
                const optId = `audio-${audioOption}`;
                const isFocused = focusedDropdownOpt === optId;
                return (
                  <Pressable
                    key={audioOption}
                    focusable={true}
                    onFocus={() => setFocusedDropdownOpt(optId)}
                    onBlur={() => setFocusedDropdownOpt(null)}
                    onPress={() => {
                      setSelectedAudio(audioOption as any);
                      setAudioDropdownOpen(false);
                    }}
                    style={() => [
                      styles.dropdownOptionBtn,
                      isSelected && { borderColor: themeColor },
                      isFocused && styles.dropdownOptionBtnFocused
                    ]}
                  >
                    <Text style={styles.dropdownOptionText}>{displayLabel}</Text>
                    {isSelected && <Ionicons name="checkmark" size={14} color={themeColor} style={{ marginLeft: 6 }} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* TV Episode Selector Layout */}
        {isTV && details?.seasons && (
          <View style={styles.episodesSection}>
            <Text style={styles.sectionTitle}>{t('general.episode') || 'Episodes'}</Text>
            
            {/* Season Selector Row */}
            <View style={styles.seasonsRow}>
              {details.seasons
                .filter((s: any) => s.season_number > 0)
                .map((season: any) => {
                  const isSelected = selectedSeason === season.season_number;
                  return (
                    <Pressable
                      key={season.season_number}
                      onPress={() => setSelectedSeason(season.season_number)}
                      focusable={true}
                      onFocus={() => setFocusedSeasonNumber(season.season_number)}
                      onBlur={() => setFocusedSeasonNumber(null)}
                      style={() => {
                        const showFocused = focusedSeasonNumber === season.season_number;
                        return [
                          styles.seasonTab,
                          isSelected && { backgroundColor: themeColor },
                          showFocused && styles.seasonTabFocused
                        ];
                      }}
                    >
                      <Text style={styles.seasonTabText}>
                        {season.name || `Season ${season.season_number}`}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>

            {/* Episode Grid Horizontal Scrolling Row */}
            {loadingEpisodes ? (
              <ActivityIndicator size="small" color={themeColor} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                horizontal
                data={episodes}
                keyExtractor={(item) => `ep-${item.episode_number}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.episodesList}
                style={{ overflow: 'visible' }}
                {...({ clipToPadding: false } as any)}
                renderItem={({ item: ep }) => {
                  const epBackdrop = ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null;
                  const isCurrentSelected = selectedEpisode === ep.episode_number;
                  return (
                    <Pressable
                      onPress={() => {
                        setSelectedEpisode(ep.episode_number);
                        handleEpisodePlay(ep.episode_number);
                      }}
                      focusable={true}
                      onFocus={() => setFocusedEpisodeNumber(ep.episode_number)}
                      onBlur={() => setFocusedEpisodeNumber(null)}
                      style={() => {
                        const showFocused = focusedEpisodeNumber === ep.episode_number;
                        return [
                          styles.episodeCard,
                          isCurrentSelected && { borderColor: themeColor, borderWidth: 2 },
                          showFocused && [styles.episodeCardFocused, { borderColor: themeColor }]
                        ];
                      }}
                    >
                      {epBackdrop ? (
                        <Image source={{ uri: epBackdrop }} style={styles.epCardBackdrop} contentFit="cover" />
                      ) : (
                        <View style={styles.epCardPlaceholder}>
                          <Ionicons name="play-circle" size={32} color="#ffffff" />
                        </View>
                      )}
                      <View style={styles.epCardInfo}>
                        <Text style={styles.epCardNumber}>
                          {t('general.episode') || 'Episode'} {ep.episode_number}
                        </Text>
                        <Text style={styles.epCardTitle} numberOfLines={1}>
                          {ep.name || `Episode ${ep.episode_number}`}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        )}

        {/* Cast List Row */}
        {cast.length > 0 && (
          <View style={styles.tvSection}>
            <Text style={styles.sectionTitle}>{t('general.cast') || 'Top Cast'}</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              style={{ overflow: 'visible' }}
              {...({ clipToPadding: false } as any)}
              data={cast.slice(0, 15)}
              keyExtractor={(c, idx) => `cast-${c.id}-${idx}`}
              renderItem={({ item: c, index }) => {
                const isFocused = focusedCastIndex === index;
                return (
                  <Pressable
                    focusable={true}
                    onFocus={() => setFocusedCastIndex(index)}
                    onBlur={() => setFocusedCastIndex(null)}
                    style={[
                      styles.castItem,
                      isFocused && styles.castItemFocused
                    ]}
                  >
                    <Image
                      source={{ uri: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : 'https://via.placeholder.com/200x300?text=Actor' }}
                      style={[
                        styles.castAvatar,
                        isFocused && { borderColor: '#ffffff', borderWidth: 2 }
                      ]}
                      contentFit="cover"
                    />
                    <Text style={[styles.castName, isFocused && { color: themeColor }]} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.castRole} numberOfLines={1}>{c.character}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        {/* Similar Items Row */}
        {similar.length > 0 && (
          <View style={styles.tvSection}>
            <Text style={styles.sectionTitle}>{t('ai.similar_overview') || 'More Like This'}</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              style={{ overflow: 'visible' }}
              {...({ clipToPadding: false } as any)}
              data={similar.slice(0, 12)}
              keyExtractor={(s, idx) => `sim-${s.id}-${idx}`}
              renderItem={({ item: s, index }) => {
                const isFocused = focusedSimilarIndex === index;
                return (
                  <Pressable
                    onPress={() => navigation.push('TVDetail', { item: s, isTV })}
                    focusable={true}
                    onFocus={() => setFocusedSimilarIndex(index)}
                    onBlur={() => setFocusedSimilarIndex(null)}
                    style={[
                      styles.similarCard,
                      isFocused && [styles.similarCardFocused, { borderColor: '#ffffff' }]
                    ]}
                  >
                    <Image
                      source={{ uri: `https://image.tmdb.org/t/p/w200${s.poster_path}` }}
                      style={styles.similarPoster}
                      contentFit="cover"
                    />
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        {/* User Comments Section (TV list layout) */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>{t('profile.user_comments') || 'Comments'}</Text>
          {comments.length === 0 ? (
            <Text style={styles.noCommentsText}>{t('detail.no_comments') || 'No comments yet. Write yours on mobile!'}</Text>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment) => {
                const isFocused = focusedCommentId === comment._id;
                return (
                  <Pressable
                    key={comment._id}
                    focusable={true}
                    onFocus={() => setFocusedCommentId(comment._id)}
                    onBlur={() => setFocusedCommentId(null)}
                    style={[
                      styles.commentRow,
                      isFocused && styles.commentRowFocused
                    ]}
                  >
                    <Image
                      source={{ uri: comment.user?.avatar || 'https://i.pravatar.cc/150' }}
                      style={styles.commentAvatar}
                    />
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUser}>{comment.user?.name || 'Anonymous'}</Text>
                        <Text style={styles.commentLikes}>👍 {comment.likes || 0}</Text>
                      </View>
                      <Text style={styles.commentText}>{comment.content}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Trailer Modal Player */}
      <Modal
        visible={showTrailerPopup}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowTrailerPopup(false);
          setTrailerKey(null);
        }}
      >
        <View style={styles.trailerOverlay}>
          <View style={[styles.trailerBox, { width: trailerWidth }]}>
            <View style={styles.trailerHeader}>
              <Text style={styles.trailerTitle} numberOfLines={1}>
                {title} - Trailer
              </Text>
              <Pressable
                focusable={true}
                onFocus={() => setFocusedCloseBtn(true)}
                onBlur={() => setFocusedCloseBtn(false)}
                onPress={() => {
                  setShowTrailerPopup(false);
                  setTrailerKey(null);
                }}
                style={() => [
                  styles.trailerCloseBtn,
                  focusedCloseBtn && styles.trailerCloseBtnFocused
                ]}
                {...{ hasTVPreferredFocus: true } as any}
              >
                <Ionicons name="close" size={24} color={focusedCloseBtn ? "#000000" : "#ffffff"} />
              </Pressable>
            </View>

            <View style={[styles.trailerVideoContainer, { width: trailerWidth, height: trailerHeight }]}>
              {isTrailerLoading ? (
                <ActivityIndicator size="large" color={themeColor} />
              ) : trailerKey ? (
                <YoutubePlayer
                  height={trailerHeight}
                  width={trailerWidth}
                  play={true}
                  videoId={trailerKey}
                  webViewProps={{
                    mediaPlaybackRequiresUserAction: false,
                    allowsInlineMediaPlayback: true,
                    scrollEnabled: false,
                    androidLayerType: 'hardware',
                  }}
                />
              ) : (
                <View style={styles.noTrailerContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color="#ff4d4d" />
                  <Text style={styles.noTrailerText}>
                    {t('player.no_trailer') || 'Không tìm thấy trailer.'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050609',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#050609',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    zIndex: 0,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  backdropPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0c0d12',
  },
  scrollContent: {
    paddingBottom: 80,
    zIndex: 10,
  },
  detailSection: {
    paddingHorizontal: 40,
    marginTop: 70,
    width: '60%', // Limit detailed info column width
  },
  title: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 10,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metaText: {
    color: '#cccccc',
    fontSize: 13,
    fontWeight: '600',
  },
  genresText: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 15,
  },
  overviewText: {
    color: '#dddddd',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 25,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  actionBtnFocused: {
    transform: [{ scale: 1.08 }],
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  episodesSection: {
    marginTop: 40,
    paddingHorizontal: 40,
  },
  seasonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  seasonTab: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  seasonTabFocused: {
    transform: [{ scale: 1.05 }],
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  seasonTabText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  episodesList: {
    gap: 18,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 12,
  },
  episodeCard: {
    width: 180,
    height: 160,
    backgroundColor: '#11131c',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  episodeCardFocused: {
    transform: [{ scale: 1.05 }],
    borderWidth: 2,
  },
  epCardBackdrop: {
    width: '100%',
    height: 95,
  },
  epCardPlaceholder: {
    width: '100%',
    height: 95,
    backgroundColor: '#1b1d28',
    justifyContent: 'center',
    alignItems: 'center',
  },
  epCardInfo: {
    padding: 8,
  },
  epCardNumber: {
    color: '#888888',
    fontSize: 10,
    fontWeight: 'bold',
  },
  epCardTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  tvSection: {
    marginTop: 40,
    paddingHorizontal: 40,
  },
  horizontalList: {
    gap: 15,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 12,
  },
  castItem: {
    width: 90,
    alignItems: 'center',
    borderRadius: 6,
  },
  castItemFocused: {
    transform: [{ scale: 1.08 }],
  },
  castAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.5,
    borderColor: '#222530',
    marginBottom: 8,
  },
  castName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  castRole: {
    color: '#888888',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  similarCard: {
    width: 110,
    height: 165,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  similarCardFocused: {
    transform: [{ scale: 1.08 }],
    borderWidth: 2,
  },
  similarPoster: {
    width: '100%',
    height: '100%',
  },
  commentsSection: {
    marginTop: 40,
    paddingHorizontal: 40,
  },
  noCommentsText: {
    color: '#666666',
    fontSize: 13,
    fontStyle: 'italic',
  },
  commentsList: {
    gap: 15,
  },
  commentRow: {
    flexDirection: 'row',
    backgroundColor: '#10121a',
    padding: 15,
    borderRadius: 8,
    gap: 15,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  commentRowFocused: {
    backgroundColor: '#1c1e29',
    borderColor: '#ffffff',
    borderWidth: 1.5,
    transform: [{ scale: 1.02 }],
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentUser: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  commentLikes: {
    color: '#888888',
    fontSize: 12,
  },
  commentText: {
    color: '#cccccc',
    fontSize: 13,
    lineHeight: 18,
  },
  dropdownSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    gap: 12,
  },
  dropdownLabel: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 8,
  },
  dropdownOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#161822',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dropdownOptionBtnFocused: {
    backgroundColor: '#262938',
    borderColor: '#ffffff',
    transform: [{ scale: 1.05 }],
  },
  dropdownOptionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  trailerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  trailerBox: {
    width: '90%',
    maxWidth: 960,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#333333',
  },
  trailerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#262626',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  trailerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 20,
  },
  trailerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  trailerCloseBtnFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
    transform: [{ scale: 1.05 }],
  },
  trailerVideoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailerWebView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  noTrailerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noTrailerText: {
    color: '#aaaaaa',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
});
