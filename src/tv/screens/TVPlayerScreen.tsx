import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Dimensions, AppState, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';

// TVEventHandler may not exist in standard react-native (only in react-native-tvos)
let TVEventHandler: any = null;
try {
  // @ts-ignore
  TVEventHandler = require('react-native').TVEventHandler;
} catch (_e) {
  // not available
}

import { useTheme } from '../../context/ThemeContext';
import { authApi } from '../../api/authApi';
import { phimApi } from '../../api/phimapi';
import { nguoncApi } from '../../api/nguonc';

const { width, height } = Dimensions.get('window');

interface TVPlayerScreenProps {
  route: any;
  navigation: any;
}

export default function TVPlayerScreen({ route, navigation }: TVPlayerScreenProps) {
  const { t } = useTranslation();
  const { themeColor } = useTheme();

  const {
    item,
    isTV,
    streamUrl,
    activePlayer,
    title,
    selectedServer,
    selectedAudio,
    initialSeason,
    initialEpisode,
    seasons
  } = route.params;

  const [showOverlay, setShowOverlay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [focusedControl, setFocusedControl] = useState<string | null>(null);

  // Season & Episode switching state
  const [currentSeason, setCurrentSeason] = useState(initialSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode || 1);
  const [streamUrlState, setStreamUrlState] = useState(streamUrl);
  const [activePlayerState, setActivePlayerState] = useState(activePlayer);
  const [titleState, setTitleState] = useState(title);

  // Server & Audio selection state
  const [selectedServerState, setSelectedServerState] = useState(selectedServer || 'Server 1');
  const [selectedAudioState, setSelectedAudioState] = useState(selectedAudio || 'vietsub');
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [focusedSettingItem, setFocusedSettingItem] = useState<string | null>(null);
  const isChangingServerAudioRef = useRef(false);

  // States to match mobile CustomVideoPlayer features
  const [playbackRate, setPlaybackRate] = useState(1);
  const [zoomScale, setZoomScale] = useState(1);
  const [audioEnhancement, setAudioEnhancement] = useState(true);
  const [settingsMenuView, setSettingsMenuView] = useState<'main' | 'server' | 'audio_track' | 'speed' | 'zoom' | 'audio_enhancement'>('main');
  const zoomScaleAnim = useRef(new Animated.Value(1)).current;

  // Synchronize zoom scale animations
  useEffect(() => {
    Animated.spring(zoomScaleAnim, {
      toValue: zoomScale,
      useNativeDriver: true,
      bounciness: 6,
      speed: 12,
    }).start();
  }, [zoomScale]);

  // Resume positioning state
  const [checkingResume, setCheckingResume] = useState(true);
  const [resumeSavedTime, setResumeSavedTime] = useState(0);
  const [showResumePopup, setShowResumePopup] = useState(false);
  const [focusedResumeBtn, setFocusedResumeBtn] = useState<'continue' | 'restart'>('continue');

  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const lastPolledTimeRef = useRef(-1);
  const isBufferingRef = useRef(false);
  const stallCountRef = useRef(0);
  const volumeCheckedRef = useRef(false);
  const lastUiUpdateRef = useRef({ time: 0, dur: 0, playing: true });
  const saveProgressRef = useRef<((force?: boolean) => Promise<void>) | null>(null);

  // Initialize expo-video player
  const player = useVideoPlayer(activePlayerState === 'm3u8' ? streamUrlState : null, p => {
    p.loop = false;
    p.volume = 1;
  });

  const [activePlayerObj, setActivePlayerObj] = useState<any>(null);

  useEffect(() => {
    setActivePlayerObj(player);
    return () => {
      setActivePlayerObj(null);
    };
  }, [player]);

  // Sync audio enhancement with player volume
  useEffect(() => {
    if (player && activePlayerState === 'm3u8') {
      try {
        if (audioEnhancement) {
          player.volume = 1;
          player.muted = false;
        }
      } catch (_) {}
    }
  }, [audioEnhancement, player, activePlayerState]);

  // Handle overlay auto-hide
  const resetOverlayTimeout = () => {
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    overlayTimeoutRef.current = setTimeout(() => {
      setShowOverlay(false);
    }, 3000);
  };

  // Listen to remote controller events
  useEffect(() => {
    // TVEventHandler is only available in react-native-tvos builds
    if (!TVEventHandler) return;

    let tvEventHandler: any = null;
    try {
      tvEventHandler = new TVEventHandler();
      tvEventHandler.enable(null, (cmp: any, evt: any) => {
        if (!evt) return;
        
        const { eventType } = evt;
        
        // Ignore focus/blur events to avoid self-wake loops when controls unmount
        if (eventType === 'focus' || eventType === 'blur') {
          return;
        }

        // Show overlay on any remote key press
        if (!showOverlay) {
          setShowOverlay(true);
          resetOverlayTimeout();
          return;
        }

        if (activePlayerState === 'm3u8') {
          if (eventType === 'playPause') {
            handlePlayPause();
          } else if (eventType === 'left') {
            handleRewind();
          } else if (eventType === 'right') {
            handleFastForward();
          }
        }

        resetOverlayTimeout();
      });
    } catch (err) {
      // TVEventHandler not available on this platform
    }

    return () => {
      try {
        if (tvEventHandler) tvEventHandler.disable();
      } catch (_e) {}
    };
  }, [showOverlay, activePlayerState, isPlaying, player]);

  // Check resume position on mount
  useEffect(() => {
    if (activePlayerState !== 'm3u8') {
      setCheckingResume(false);
      return;
    }

    const checkResumeProgress = async () => {
      // If we just changed server/audio, we seek directly and do not show popup
      if (isChangingServerAudioRef.current) {
        isChangingServerAudioRef.current = false;
        try {
          if (player) {
            player.currentTime = currentTimeRef.current;
            player.play();
          }
        } catch (_) {}
        setCheckingResume(false);
        return;
      }

      try {
        const res = await authApi.getRecentlyWatchedItem(
          item.id.toString(),
          selectedServerState || 'Server 1',
          selectedAudioState || 'vietsub',
          isTV,
          isTV ? currentSeason || 1 : undefined,
          isTV ? currentEpisode || 1 : undefined
        );

        if (res?.item && res.item.currentTime > 10) {
          setResumeSavedTime(res.item.currentTime);
          setShowResumePopup(true);
        } else {
          player.play();
        }
      } catch (e) {
        player.play();
      } finally {
        setCheckingResume(false);
      }
    };

    checkResumeProgress();
  }, [streamUrlState]);

  // Track player progress
  useEffect(() => {
    if (activePlayerState !== 'm3u8' || !player) {
      setLoading(false);
      return;
    }

    // Reset buffering detection on stream change
    lastPolledTimeRef.current = -1;
    isBufferingRef.current = false;
    stallCountRef.current = 0;
    volumeCheckedRef.current = false;
    setIsBuffering(false);

    const progressInterval = setInterval(() => {
      try {
        if (player) {
          const time = player.currentTime || 0;
          const dur = player.duration || 0;
          const playing = player.playing || false;

          currentTimeRef.current = time;
          durationRef.current = dur;

          // Buffering/Stall detection with debounce (avoid false positives)
          if (playing && lastPolledTimeRef.current !== -1) {
            const diff = time - lastPolledTimeRef.current;
            const isAtEnd = dur > 0 && Math.abs(dur - time) < 0.5;
            if (diff >= 0 && diff < 0.05 && !isAtEnd) {
              stallCountRef.current++;
              // Only show buffering after 3 consecutive stalls (~1.5s)
              if (stallCountRef.current >= 3 && !isBufferingRef.current) {
                isBufferingRef.current = true;
                setIsBuffering(true);
              }
            } else {
              stallCountRef.current = 0;
              if (isBufferingRef.current) {
                isBufferingRef.current = false;
                setIsBuffering(false);
              }
            }
          } else if (!playing) {
            stallCountRef.current = 0;
            if (isBufferingRef.current) {
              isBufferingRef.current = false;
              setIsBuffering(false);
            }
          }
          lastPolledTimeRef.current = time;

          // Only update UI state when values materially change (reduce re-renders)
          const last = lastUiUpdateRef.current;
          const timeChanged = Math.abs(last.time - time) > 0.3;
          const durChanged = Math.abs(last.dur - dur) > 0.5;
          const playChanged = last.playing !== playing;

          if (timeChanged || durChanged || playChanged) {
            if (timeChanged) setCurrentTime(time);
            if (durChanged) setDuration(dur);
            if (playChanged) setIsPlaying(playing);
            lastUiUpdateRef.current = { time, dur, playing };
          }

          if (player.status === 'readyToPlay') {
            setLoading(false);
            // One-time volume protection when player becomes ready
            if (!volumeCheckedRef.current) {
              volumeCheckedRef.current = true;
              try {
                if (player.volume === 0) player.volume = 1;
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        // ignore if player is released
      }
    }, 500);

    return () => clearInterval(progressInterval);
  }, [player, activePlayerState]);

  // Save progress logic (every 10s)
  const saveProgress = async (force = false) => {
    if (activePlayerState !== 'm3u8') return;
    
    const time = currentTimeRef.current;
    const dur = durationRef.current;

    if (time > 10 && dur > 0) {
      const clampedTime = Math.min(time, dur);
      // Prevent duplicate saves
      if (!force && Math.abs(clampedTime - lastSavedTimeRef.current) < 5) return;
      lastSavedTimeRef.current = clampedTime;

      try {
        await authApi.upsertRecentlyWatched({
          contentId: item.id.toString(),
          isTVShow: !!isTV,
          season: isTV ? currentSeason : null,
          episode: isTV ? currentEpisode : null,
          server: selectedServerState || 'Server 1',
          audio: selectedAudioState || 'vietsub',
          currentTime: clampedTime,
          duration: dur,
          title: item.title || item.name || '',
          poster: item.poster_path ? `https://image.tmdb.org/t/p/w400${item.poster_path}` : '',
          watchUrl: streamUrlState || ''
        });
      } catch (err) {
        // ignore
      }
    }
  };

  // Keep saveProgressRef always pointing to latest saveProgress
  saveProgressRef.current = saveProgress;

  useEffect(() => {
    resetOverlayTimeout();

    // Start progress saving interval
    saveProgressIntervalRef.current = setInterval(() => {
      saveProgressRef.current?.(false);
    }, 10000);

    // Save progress when app goes to background
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        saveProgressRef.current?.(true);
      }
    });

    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      if (saveProgressIntervalRef.current) clearInterval(saveProgressIntervalRef.current);
      appStateSub.remove();
      saveProgressRef.current?.(true); // Save on exit
    };
  }, []);

  const handlePlayPause = () => {
    if (!player) return;
    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    } catch (err) {
      // ignore
    }
    resetOverlayTimeout();
  };

  const handleRewind = () => {
    if (!player) return;
    try {
      const target = Math.max(player.currentTime - 10, 0);
      player.currentTime = target;
      currentTimeRef.current = target;
      setCurrentTime(target);
    } catch (err) {
      // ignore
    }
    resetOverlayTimeout();
  };

  const handleFastForward = () => {
    if (!player) return;
    try {
      const target = Math.min(player.currentTime + 10, player.duration || 0);
      player.currentTime = target;
      currentTimeRef.current = target;
      setCurrentTime(target);
    } catch (err) {
      // ignore
    }
    resetOverlayTimeout();
  };

  const handleResumeSelect = () => {
    try {
      if (player) {
        player.currentTime = resumeSavedTime;
        currentTimeRef.current = resumeSavedTime;
        setCurrentTime(resumeSavedTime);
        player.play();
      }
    } catch (e) {}
    setShowResumePopup(false);
    setShowOverlay(true);
    resetOverlayTimeout();
  };

  const handleResumeRestart = () => {
    try {
      if (player) {
        player.currentTime = 0;
        currentTimeRef.current = 0;
        setCurrentTime(0);
        player.play();
      }
    } catch (e) {}
    setShowResumePopup(false);
    setShowOverlay(true);
    resetOverlayTimeout();
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const loadStream = async (seasonNum: number, epNum: number, serverName: string, audioTrack: string) => {
    setLoading(true);
    setCurrentSeason(seasonNum);
    setCurrentEpisode(epNum);
    setSelectedServerState(serverName);
    setSelectedAudioState(audioTrack);

    const baseTitle = item.title || item.name || '';
    const releaseDateRaw = item.release_date || item.first_air_date;
    const year = releaseDateRaw?.substring(0, 4) || '2026';

    try {
      let finalUrl = '';
      if (serverName === 'Server 1') {
        const audioTracks = await phimApi.getStreamingLink(item.id.toString(), baseTitle, parseInt(year), epNum, isTV, seasonNum);
        if (audioTracks && audioTracks.length > 0) {
          let streamObj = audioTracks.find((a: any) => {
            const name = a.name.toLowerCase();
            if (audioTrack === 'vietsub') return name.includes('vietsub') || name.includes('sub');
            return name.includes('thuyết') || name.includes('lồng') || name.includes('dub');
          });
          if (!streamObj) streamObj = audioTracks[0];
          finalUrl = streamObj.url;
        }
      } else {
        const links = await nguoncApi.getStreamingLink(isTV, baseTitle, parseInt(year), '', seasonNum, epNum);
        if (links) {
          const audioKey = audioTrack as 'vietsub' | 'dubbed' | 'm3u8';
          finalUrl = links[audioKey];
        }
      }

      if (finalUrl) {
        finalUrl = finalUrl.startsWith('//') ? 'https:' + finalUrl : finalUrl;
        const playerType = finalUrl.includes('.m3u8') ? 'm3u8' : 'embed';
        setStreamUrlState(finalUrl);
        setActivePlayerState(playerType);
        setTitleState(isTV ? `${baseTitle} - S${seasonNum} E${epNum}` : baseTitle);
      }
    } catch (e) {
      console.log('Error loading stream:', e);
    } finally {
      setLoading(false);
    }
  };

  // Embed Player (Server 3 Web Player)
  if (activePlayerState === 'embed') {
    return (
      <View style={styles.container}>
        {/* WebView embed player */}
        <WebView
          source={{ uri: streamUrlState }}
          style={styles.webView}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
        />

        {/* Floating TV Back button for WebView player */}
        <Pressable
          onPress={() => navigation.goBack()}
          onFocus={() => setFocusedControl('floatBack')}
          onBlur={() => setFocusedControl(null)}
          style={() => [
            styles.floatingBackBtn,
            focusedControl === 'floatBack' && styles.floatingBackBtnFocused
          ]}
          focusable={true}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
          <Text style={styles.floatingBackText}>{t('general.close') || 'Close'}</Text>
        </Pressable>
      </View>
    );
  }

  // M3U8 Direct Video Player
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const currentSeasonData = seasons?.find((s: any) => s.season_number === currentSeason);
  const totalEpisodesInSeason = currentSeasonData?.episode_count || 10;

  return (
    <View style={styles.container}>
      {/* Direct Video Component */}
      <View style={styles.videoWrapper}>
        {activePlayerObj && (
          <Animated.View style={{ flex: 1, width: '100%', height: '100%', transform: [{ scale: zoomScaleAnim }] }}>
            <VideoView
              style={styles.video}
              player={activePlayerObj}
              nativeControls={false}
              contentFit="contain"
            />
          </Animated.View>
        )}
      </View>

      {(loading || isBuffering) && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      )}

      {/* Transparent D-pad focus catcher when overlay is hidden */}
      {!showOverlay && !showResumePopup && !showSettingsPopup && (
        <Pressable
          focusable={true}
          style={StyleSheet.absoluteFill}
          onPress={() => {
            setShowOverlay(true);
            resetOverlayTimeout();
          }}
          onKeyPress={() => {
            setShowOverlay(true);
            resetOverlayTimeout();
          }}
          {...{ hasTVPreferredFocus: true } as any}
        />
      )}

      {/* Resume Playback Prompt Overlay */}
      {showResumePopup && (
        <View style={styles.resumeOverlay}>
          <View style={styles.resumeBox}>
            <Ionicons name="time" size={48} color={themeColor} style={{ marginBottom: 15, alignSelf: 'center' }} />
            <Text style={styles.resumeTitle}>{t('player.continue_watching') || 'Tiếp tục xem?'}</Text>
            <Text style={styles.resumeText}>
              {t('player.saved_progress_msg', { defaultValue: 'Bạn có muốn tiếp tục xem từ vị trí đã lưu?' })} ({formatTime(resumeSavedTime)})
            </Text>
            <View style={styles.resumeBtnRow}>
              <Pressable
                focusable={true}
                onFocus={() => setFocusedResumeBtn('continue')}
                onBlur={() => setFocusedResumeBtn(null as any)}
                onPress={handleResumeSelect}
                style={() => [
                  styles.resumeBtn,
                  focusedResumeBtn === 'continue' && [styles.resumeBtnFocused, { borderColor: themeColor }]
                ]}
                {...{ hasTVPreferredFocus: true } as any}
              >
                <Text style={[styles.resumeBtnText, { color: focusedResumeBtn === 'continue' ? '#000000' : '#ffffff' }]}>
                  {t('player.continue_label') || 'Xem tiếp'}
                </Text>
              </Pressable>
              
              <Pressable
                focusable={true}
                onFocus={() => setFocusedResumeBtn('restart')}
                onBlur={() => setFocusedResumeBtn(null as any)}
                onPress={handleResumeRestart}
                style={() => [
                  styles.resumeBtn,
                  focusedResumeBtn === 'restart' && [styles.resumeBtnFocused, { borderColor: themeColor }]
                ]}
              >
                <Text style={[styles.resumeBtnText, { color: focusedResumeBtn === 'restart' ? '#000000' : '#ffffff' }]}>
                  {t('player.restart_label') || 'Xem từ đầu'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Settings Modal */}
      {showSettingsPopup && (
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsBox}>
            {/* Header / Sub-Header */}
            {settingsMenuView === 'main' ? (
              <Text style={styles.settingsTitle}>{t('profile.account_settings') || 'Cài đặt trình phát'}</Text>
            ) : (
              <View style={styles.settingsSubHeader}>
                <Pressable
                  focusable={true}
                  onFocus={() => {
                    setFocusedSettingItem('back_to_main');
                    resetOverlayTimeout();
                  }}
                  onBlur={() => setFocusedSettingItem(null)}
                  onPress={() => {
                    setSettingsMenuView('main');
                    setFocusedSettingItem(null);
                  }}
                  style={() => [
                    styles.settingsSubBackBtn,
                    focusedSettingItem === 'back_to_main' && styles.settingsSubBackBtnFocused
                  ]}
                >
                  <Ionicons name="arrow-back" size={20} color="#ffffff" />
                </Pressable>
                <Text style={styles.settingsSubTitle}>
                  {settingsMenuView === 'speed' ? (t('player.playback_speed') || 'Tốc độ phát') :
                   settingsMenuView === 'zoom' ? ('Tỷ lệ hiển thị') :
                   settingsMenuView === 'audio_enhancement' ? (t('player.audio_enhancement') || 'Cải thiện âm thanh') : ''}
                </Text>
              </View>
            )}

            {/* Menu Body */}
            {settingsMenuView === 'main' && (
              <View style={styles.settingsMainList}>
                {/* 1. Playback Speed */}
                <Pressable
                  focusable={true}
                  onFocus={() => {
                    setFocusedSettingItem('menu_speed');
                    resetOverlayTimeout();
                  }}
                  onBlur={() => setFocusedSettingItem(null)}
                  onPress={() => setSettingsMenuView('speed')}
                  style={() => [
                    styles.settingsMainItem,
                    focusedSettingItem === 'menu_speed' && styles.settingsMainItemFocused
                  ]}
                  {...{ hasTVPreferredFocus: true } as any}
                >
                  <View style={styles.settingsItemLeft}>
                    <Ionicons name="speedometer-outline" size={20} color="#ffffff" style={{ marginRight: 10 }} />
                    <Text style={styles.settingsItemLabel}>{t('player.playback_speed') || 'Tốc độ phát'}</Text>
                  </View>
                  <View style={styles.settingsItemRight}>
                    <Text style={styles.settingsItemValue}>
                      {playbackRate === 1 ? (t('player.normal') || 'Chuẩn') : `${playbackRate}x`}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#aaaaaa" />
                  </View>
                </Pressable>



                {/* 4. Zoom / Scale selection */}
                <Pressable
                  focusable={true}
                  onFocus={() => {
                    setFocusedSettingItem('menu_zoom');
                    resetOverlayTimeout();
                  }}
                  onBlur={() => setFocusedSettingItem(null)}
                  onPress={() => setSettingsMenuView('zoom')}
                  style={() => [
                    styles.settingsMainItem,
                    focusedSettingItem === 'menu_zoom' && styles.settingsMainItemFocused
                  ]}
                >
                  <View style={styles.settingsItemLeft}>
                    <Ionicons name="scan-outline" size={20} color="#ffffff" style={{ marginRight: 10 }} />
                    <Text style={styles.settingsItemLabel}>Tỷ lệ hiển thị</Text>
                  </View>
                  <View style={styles.settingsItemRight}>
                    <Text style={styles.settingsItemValue}>{Math.round(zoomScale * 100)}%</Text>
                    <Ionicons name="chevron-forward" size={16} color="#aaaaaa" />
                  </View>
                </Pressable>

                {/* 5. Audio Enhancement */}
                <Pressable
                  focusable={true}
                  onFocus={() => {
                    setFocusedSettingItem('menu_audio_enhancement');
                    resetOverlayTimeout();
                  }}
                  onBlur={() => setFocusedSettingItem(null)}
                  onPress={() => setSettingsMenuView('audio_enhancement')}
                  style={() => [
                    styles.settingsMainItem,
                    focusedSettingItem === 'menu_audio_enhancement' && styles.settingsMainItemFocused
                  ]}
                >
                  <View style={styles.settingsItemLeft}>
                    <Ionicons name="headset-outline" size={20} color="#ffffff" style={{ marginRight: 10 }} />
                    <Text style={styles.settingsItemLabel}>{t('player.audio_enhancement') || 'Cải thiện âm thanh'}</Text>
                  </View>
                  <View style={styles.settingsItemRight}>
                    <Text style={[
                      styles.settingsItemValue,
                      audioEnhancement ? { color: '#ff9800', fontWeight: 'bold' } : { color: '#aaaaaa' }
                    ]}>
                      {audioEnhancement ? (t('player.on') || 'Bật') : (t('player.off') || 'Tắt')}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#aaaaaa" />
                  </View>
                </Pressable>

                {/* Close Settings Button */}
                <Pressable
                  focusable={true}
                  onFocus={() => {
                    setFocusedSettingItem('close_settings');
                    resetOverlayTimeout();
                  }}
                  onBlur={() => setFocusedSettingItem(null)}
                  onPress={() => {
                    setShowSettingsPopup(false);
                    setShowOverlay(true);
                    resetOverlayTimeout();
                  }}
                  style={() => [
                    styles.settingsCloseBtn,
                    focusedSettingItem === 'close_settings' && [styles.settingsCloseBtnFocused, { backgroundColor: themeColor }]
                  ]}
                >
                  <Text style={[
                    styles.settingsCloseBtnText,
                    focusedSettingItem === 'close_settings' && { color: '#ffffff' }
                  ]}>
                    {t('general.close') || 'Đóng'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Sub-menu Views */}
            {settingsMenuView === 'speed' && (
              <View style={styles.settingsSubList}>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => {
                  const focusKey = `speed_${r}`;
                  const isFocused = focusedSettingItem === focusKey;
                  const isSelected = playbackRate === r;
                  return (
                    <Pressable
                      key={r}
                      focusable={true}
                      onFocus={() => {
                        setFocusedSettingItem(focusKey);
                        resetOverlayTimeout();
                      }}
                      onBlur={() => setFocusedSettingItem(null)}
                      onPress={() => {
                        setPlaybackRate(r);
                        if (player) player.playbackRate = r;
                        setSettingsMenuView('main');
                        setFocusedSettingItem(null);
                      }}
                      style={() => [
                        styles.settingsSubOptionItem,
                        isFocused && styles.settingsSubOptionItemFocused
                      ]}
                    >
                      <Text style={[
                        styles.settingsSubOptionText,
                        isSelected && { color: themeColor, fontWeight: 'bold' },
                        isFocused && { color: '#000000' }
                      ]}>
                        {r === 1 ? `${t('player.normal') || 'Chuẩn'} (1x)` : `${r}x`}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color={isFocused ? '#000000' : themeColor} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}



            {settingsMenuView === 'zoom' && (
              <View style={styles.settingsSubList}>
                {[0.9, 0.95, 1.0, 1.1, 1.15].map((z) => {
                  const focusKey = `zoom_${z}`;
                  const isFocused = focusedSettingItem === focusKey;
                  const isSelected = zoomScale === z;
                  return (
                    <Pressable
                      key={z}
                      focusable={true}
                      onFocus={() => {
                        setFocusedSettingItem(focusKey);
                        resetOverlayTimeout();
                      }}
                      onBlur={() => setFocusedSettingItem(null)}
                      onPress={() => {
                        setZoomScale(z);
                        setSettingsMenuView('main');
                        setFocusedSettingItem(null);
                      }}
                      style={() => [
                        styles.settingsSubOptionItem,
                        isFocused && styles.settingsSubOptionItemFocused
                      ]}
                    >
                      <Text style={[
                        styles.settingsSubOptionText,
                        isSelected && { color: themeColor, fontWeight: 'bold' },
                        isFocused && { color: '#000000' }
                      ]}>
                        {Math.round(z * 100)}%
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color={isFocused ? '#000000' : themeColor} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {settingsMenuView === 'audio_enhancement' && (
              <View style={styles.settingsSubList}>
                {[true, false].map((val) => {
                  const focusKey = `audio_enh_${val}`;
                  const isFocused = focusedSettingItem === focusKey;
                  const isSelected = audioEnhancement === val;
                  return (
                    <Pressable
                      key={val ? 'on' : 'off'}
                      focusable={true}
                      onFocus={() => {
                        setFocusedSettingItem(focusKey);
                        resetOverlayTimeout();
                      }}
                      onBlur={() => setFocusedSettingItem(null)}
                      onPress={() => {
                        setAudioEnhancement(val);
                        setSettingsMenuView('main');
                        setFocusedSettingItem(null);
                      }}
                      style={() => [
                        styles.settingsSubOptionItem,
                        isFocused && styles.settingsSubOptionItemFocused
                      ]}
                    >
                      <Text style={[
                        styles.settingsSubOptionText,
                        isSelected && (val ? { color: '#ff9800', fontWeight: 'bold' } : { color: themeColor, fontWeight: 'bold' }),
                        isFocused && { color: '#000000' }
                      ]}>
                        {val ? (t('player.on') || 'Bật') : (t('player.off') || 'Tắt')}
                      </Text>
                      {isSelected && (
                        <Ionicons 
                          name="checkmark" 
                          size={18} 
                          color={isFocused ? '#000000' : (val ? '#ff9800' : themeColor)} 
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      {/* D-Pad Focusable Overlay Controls */}
      {showOverlay && !checkingResume && !showResumePopup && !showSettingsPopup && (
        <View style={styles.overlayContainer}>
          {/* Top Info Bar */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => navigation.goBack()}
              onFocus={() => {
                setFocusedControl('back');
                resetOverlayTimeout();
              }}
              onBlur={() => setFocusedControl(null)}
              style={() => [
                styles.backBtn,
                focusedControl === 'back' && styles.backBtnFocused
              ]}
              focusable={true}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.videoTitle} numberOfLines={1}>{titleState}</Text>
              {isTV && (
                <Text style={styles.videoSubtitle}>
                  {t('general.season') || 'Mùa'} {currentSeason} • {t('general.episode') || 'Tập'} {currentEpisode}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => {
                setShowSettingsPopup(true);
                setShowOverlay(false);
              }}
              onFocus={() => {
                setFocusedControl('settings');
                resetOverlayTimeout();
              }}
              onBlur={() => setFocusedControl(null)}
              style={() => [
                styles.settingsBtn,
                focusedControl === 'settings' && styles.settingsBtnFocused
              ]}
              focusable={true}
            >
              <Ionicons name="settings-sharp" size={24} color="#ffffff" />
            </Pressable>
          </View>

          {/* Center Buttons Row */}
          <View style={styles.centerControls}>
            {isTV && currentEpisode > 1 && (
              <Pressable
                onPress={() => loadStream(currentSeason, currentEpisode - 1, selectedServerState, selectedAudioState)}
                onFocus={() => {
                  setFocusedControl('prevEpisode');
                  resetOverlayTimeout();
                }}
                onBlur={() => setFocusedControl(null)}
                style={() => [
                  styles.controlCircle,
                  focusedControl === 'prevEpisode' && [styles.controlCircleFocused, { backgroundColor: themeColor }]
                ]}
                focusable={true}
              >
                <Ionicons name="play-skip-back" size={24} color="#ffffff" />
              </Pressable>
            )}

            <Pressable
              onPress={handleRewind}
              onFocus={() => {
                setFocusedControl('rewind');
                resetOverlayTimeout();
              }}
              onBlur={() => setFocusedControl(null)}
              style={() => [
                styles.controlCircle,
                focusedControl === 'rewind' && [styles.controlCircleFocused, { backgroundColor: themeColor }]
              ]}
              focusable={true}
            >
              <Ionicons name="play-back" size={24} color="#ffffff" />
            </Pressable>

            <Pressable
              onPress={handlePlayPause}
              onFocus={() => {
                setFocusedControl('playPause');
                resetOverlayTimeout();
              }}
              onBlur={() => setFocusedControl(null)}
              style={() => [
                styles.controlCircle,
                focusedControl === 'playPause' && [styles.controlCircleFocused, { backgroundColor: themeColor }]
              ]}
              focusable={true}
              {...{ hasTVPreferredFocus: true } as any}
            >
              <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#ffffff" style={{ marginLeft: isPlaying ? 0 : 3 }} />
            </Pressable>

            <Pressable
              onPress={handleFastForward}
              onFocus={() => {
                setFocusedControl('fastForward');
                resetOverlayTimeout();
              }}
              onBlur={() => setFocusedControl(null)}
              style={() => [
                styles.controlCircle,
                focusedControl === 'fastForward' && [styles.controlCircleFocused, { backgroundColor: themeColor }]
              ]}
              focusable={true}
            >
              <Ionicons name="play-forward" size={24} color="#ffffff" />
            </Pressable>

            {isTV && currentEpisode < totalEpisodesInSeason && (
              <Pressable
                onPress={() => loadStream(currentSeason, currentEpisode + 1, selectedServerState, selectedAudioState)}
                onFocus={() => {
                  setFocusedControl('nextEpisode');
                  resetOverlayTimeout();
                }}
                onBlur={() => setFocusedControl(null)}
                style={() => [
                  styles.controlCircle,
                  focusedControl === 'nextEpisode' && [styles.controlCircleFocused, { backgroundColor: themeColor }]
                ]}
                focusable={true}
              >
                <Ionicons name="play-skip-forward" size={24} color="#ffffff" />
              </Pressable>
            )}
          </View>

          {/* Bottom Progress Bar & Time Labels */}
          <View style={styles.bottomBar}>
            <Text style={styles.timeLabel}>{formatTime(currentTime)}</Text>
            
            <View style={styles.progressBarWrapper}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: themeColor }]} />
              </View>
            </View>

            <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingBackBtn: {
    position: 'absolute',
    top: 30,
    left: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#333333',
    zIndex: 99,
    gap: 8,
  },
  floatingBackBtnFocused: {
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
    transform: [{ scale: 1.05 }],
  },
  floatingBackText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 50,
    zIndex: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  backBtnFocused: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.05 }],
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  videoTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  controlCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  controlCircleFocused: {
    transform: [{ scale: 1.15 }],
    borderColor: '#ffffff',
    elevation: 5,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  timeLabel: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  progressBarWrapper: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  resumeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  resumeBox: {
    width: 500,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 30,
    borderWidth: 1.5,
    borderColor: '#333333',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  resumeTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  resumeText: {
    color: '#cccccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  resumeBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  resumeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  resumeBtnFocused: {
    backgroundColor: '#ffffff',
    transform: [{ scale: 1.05 }],
  },
  resumeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  videoSubtitle: {
    color: '#aaaaaa',
    fontSize: 14,
    marginTop: 4,
  },
  settingsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 35,
  },
  settingsBox: {
    width: 500,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 30,
    borderWidth: 1.5,
    borderColor: '#333333',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  settingsTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  settingsSectionTitle: {
    color: '#aaaaaa',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 15,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  settingsItemBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingsItemBtnSelected: {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingsItemBtnFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
    transform: [{ scale: 1.05 }],
  },
  settingsItemBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#cccccc',
  },
  settingsItemBtnTextSelected: {
    color: '#ffffff',
  },
  settingsCloseBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    marginTop: 30,
  },
  settingsCloseBtnFocused: {
    transform: [{ scale: 1.05 }],
  },
  settingsCloseBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  settingsBtnFocused: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.05 }],
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  videoWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  settingsSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 15,
    marginBottom: 15,
    gap: 15,
  },
  settingsSubBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  settingsSubBackBtnFocused: {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    transform: [{ scale: 1.05 }],
  },
  settingsSubTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  settingsMainList: {
    width: '100%',
    gap: 8,
  },
  settingsMainItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  settingsMainItemFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#ffffff',
    transform: [{ scale: 1.02 }],
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsItemValue: {
    color: '#aaaaaa',
    fontSize: 14,
  },
  settingsSubList: {
    width: '100%',
    gap: 8,
  },
  settingsSubOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  settingsSubOptionItemFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
    transform: [{ scale: 1.02 }],
  },
  settingsSubOptionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
