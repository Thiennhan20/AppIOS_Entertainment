import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, AppState, AppStateStatus, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/authApi';

interface CustomVideoPlayerProps {
  url: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  themeColor: string;
  movieId?: string;
  server?: string;
  audio?: string;
  isTVShow?: boolean;
  season?: number;
  episode?: number;
  title?: string;
  poster?: string;
}

export default function CustomVideoPlayer({
  url, isFullscreen, onToggleFullscreen, themeColor,
  movieId, server, audio, isTVShow, season, episode, title, poster
}: CustomVideoPlayerProps) {
  const { t } = useTranslation();
  const [showControls, setShowControls] = useState(true);
  const [playerState, setPlayerState] = useState({
    currentTime: 0,
    duration: 0,
    isPlaying: true,
    playbackRate: 1,
    isMuted: false,
    volume: 1,
  });

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const ZOOM_LEVELS = [0.9, 0.95, 1.0, 1.1, 1.15];
  const [zoomIndex, setZoomIndex] = useState(2);

  const isSeekingRef = useRef(false);
  const seekTargetRef = useRef(0);
  const [isSeekingUi, setIsSeekingUi] = useState(false);

  // Stalled/Buffering detection
  const lastPolledTimeRef = useRef(-1);
  const isBufferingRef = useRef(false);
  const [isBufferingUi, setIsBufferingUi] = useState(false);

  // Resume popup state
  const [resumePopup, setResumePopup] = useState<{ show: boolean; savedTime: number }>({ show: false, savedTime: 0 });
  const [checkingResume, setCheckingResume] = useState(true);
  const resumeSavedTimeRef = useRef(0);
  const [resumeSeekPending, setResumeSeekPending] = useState(false);
  const [showResumeSkip, setShowResumeSkip] = useState(false);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resumeSkipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const videoViewRef = useRef<VideoView>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);
  const hasPinchedRef = useRef<boolean>(false);
  const hasSeekedRef = useRef<boolean>(false);

  // Save progress refs
  const lastSavedTimeRef = useRef(0);
  const hasEverPlayedRef = useRef(false);
  const seekDebounceRef = useRef<NodeJS.Timeout | null>(null);



  const player = useVideoPlayer(url, p => {
    p.loop = false;
    // Don't auto-play until resume check is done
  });

  // ─── Resume: fetch saved time → show popup ──────────────
  useEffect(() => {
    if (!movieId || !server || !audio) {
      setCheckingResume(false);
      return;
    }

    let cancelled = false;

    const checkResume = async () => {
      try {
        const res = await authApi.getRecentlyWatchedItem(
          movieId, server, audio, isTVShow, season, episode
        );
        if (cancelled) return;
        if (res && res.item && res.item.currentTime > 10) {
          setResumePopup({ show: true, savedTime: res.item.currentTime });
        } else {
          setCheckingResume(false);
          player.play();
        }
      } catch {
        if (!cancelled) {
          setCheckingResume(false);
          player.play();
        }
      }
    };

    checkResume();
    return () => { cancelled = true; };
  }, [movieId, server, audio, isTVShow, season, episode]);

  // ─── Resume handlers ────────────────────────────────────
  const handleResumeContinue = () => {
    const seekTo = resumePopup.savedTime;
    resumeSavedTimeRef.current = seekTo;
    setResumePopup({ show: false, savedTime: 0 });
    setCheckingResume(false);
    setResumeSeekPending(true);
    setShowResumeSkip(false);
    hasSeekedRef.current = false;

    // Show skip option after 5s
    resumeSkipTimerRef.current = setTimeout(() => setShowResumeSkip(true), 5000);
    // Hard timeout 15s — play from wherever
    resumeTimeoutRef.current = setTimeout(() => {
      setResumeSeekPending(false);
      setShowResumeSkip(false);
      try { player.play(); } catch {}
    }, 15000);

    // Try immediate seek if ready
    try {
      if (player && player.status === 'readyToPlay') {
        player.currentTime = seekTo;
        hasSeekedRef.current = true;
      }
    } catch {}
  };

  const handleResumeStartOver = () => {
    setResumePopup({ show: false, savedTime: 0 });
    setCheckingResume(false);
    resumeSavedTimeRef.current = 0;
    try { player.play(); } catch {}
  };

  const handleResumeSkip = () => {
    setResumeSeekPending(false);
    setShowResumeSkip(false);
    if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
    if (resumeSkipTimerRef.current) { clearTimeout(resumeSkipTimerRef.current); resumeSkipTimerRef.current = null; }
    resumeSavedTimeRef.current = 0;
    try { if (player) player.currentTime = 0; } catch {}
  };

  // ─── Resume seek: poll until currentTime matches target, then play ──
  useEffect(() => {
    if (!resumeSeekPending) return;
    const targetTime = resumeSavedTimeRef.current;
    if (targetTime <= 0) { setResumeSeekPending(false); try { player.play(); } catch {} return; }

    const pollId = setInterval(() => {
      try {
        if (!player) return;
        // Attempt seek when player is ready
        if (player.status === 'readyToPlay' && !hasSeekedRef.current) {
          player.currentTime = targetTime;
          hasSeekedRef.current = true;
        }
        if (!hasSeekedRef.current) return;
        // Verify seek landed close enough
        const current = player.currentTime || 0;
        if (Math.abs(current - targetTime) < 2) {
          clearInterval(pollId);
          if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
          if (resumeSkipTimerRef.current) { clearTimeout(resumeSkipTimerRef.current); resumeSkipTimerRef.current = null; }
          setResumeSeekPending(false);
          setShowResumeSkip(false);
          player.play();
        }
      } catch { clearInterval(pollId); }
    }, 300);

    return () => clearInterval(pollId);
  }, [resumeSeekPending, player]);

  useFocusEffect(
    React.useCallback(() => {
      resetControlsTimeout();
      return () => {
        try {
          player.pause();
        } catch (e) {}
      };
    }, [player])
  );

  useEffect(() => {
    resetControlsTimeout();
  }, []);

  useEffect(() => {
    let toValue = 1;
    if (isFullscreen) {
      toValue = ZOOM_LEVELS[zoomIndex];
    }
    Animated.spring(scaleAnim, {
      toValue,
      useNativeDriver: true,
      bounciness: 6,
      speed: 12,
    }).start();
  }, [zoomIndex, isFullscreen]);

  // ─── Polling state (500ms) + Pause detection ──────────
  const wasPreviouslyPlayingRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (player) {
        const newTime = player.currentTime || 0;

        // Buffering/Stall detection
        if (player.playing && !isSeekingRef.current && lastPolledTimeRef.current !== -1) {
          const diff = newTime - lastPolledTimeRef.current;
          const isAtEnd = player.duration > 0 && Math.abs(player.duration - newTime) < 0.5;
          if (diff >= 0 && diff < 0.05 && !isAtEnd) { 
             if (!isBufferingRef.current) {
               isBufferingRef.current = true;
               setIsBufferingUi(true);
             }
          } else {
             if (isBufferingRef.current) {
               isBufferingRef.current = false;
               setIsBufferingUi(false);
             }
          }
        } else if (!player.playing || isSeekingRef.current) {
           if (isBufferingRef.current) {
             isBufferingRef.current = false;
             setIsBufferingUi(false);
           }
        }
        lastPolledTimeRef.current = newTime;

        // Batch all player state into a single setState
        setPlayerState(prev => {
          if (isSeekingRef.current) return prev; // Do not overwrite state while seeking

          return {
            currentTime: newTime,
            duration: player.duration || 0,
            isPlaying: player.playing,
            playbackRate: player.playbackRate || 1,
            isMuted: player.muted,
            volume: player.volume ?? 1,
          };
        });

        // Pause detection (integrated here to avoid a second interval)
        if (player.playing) {
          wasPreviouslyPlayingRef.current = true;
          hasEverPlayedRef.current = true;
        } else if (wasPreviouslyPlayingRef.current && !player.playing) {
          wasPreviouslyPlayingRef.current = false;
          if (saveProgressRef.current) saveProgressRef.current();
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [player]);

  // ─── Save progress (interval 10s + pause + seek debounce + background) ──
  useEffect(() => {
    if (!movieId || !server || !audio) return;

    hasEverPlayedRef.current = false;

    // skipDedup: bypass the 5s dedup check (used for seek saves)
    const saveProgress = async (skipDedup = false) => {
      if (!hasEverPlayedRef.current) return;
      const ct = player.currentTime || 0;
      const dur = player.duration || 0;
      if (ct > 0 && dur > 0) {
        const clampedCt = Math.min(ct, dur);
        if (!skipDedup && Math.abs(clampedCt - lastSavedTimeRef.current) < 5) return;
        lastSavedTimeRef.current = clampedCt;
        try {
          await authApi.upsertRecentlyWatched({
            contentId: movieId,
            isTVShow: !!isTVShow,
            season: isTVShow ? season : null,
            episode: isTVShow ? episode : null,
            server, audio,
            currentTime: clampedCt,
            duration: dur,
            title: title || '',
            poster: poster || ''
          });
        } catch {}
      }
    };

    // Make saveProgress accessible to seek handlers via ref
    saveProgressRef.current = saveProgress;

    // ── 1) Interval 10s — only save when playing ──
    const intervalId = setInterval(() => {
      if (player.playing) {
        hasEverPlayedRef.current = true;
        saveProgress();
      }
    }, 10_000);

    // ── 3) Save when app goes to background ──
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        try { player.pause(); } catch {}
        saveProgress(true);
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppState);

    return () => {
      clearInterval(intervalId);
      if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
      appStateSub.remove();
      // Save one last time on unmount (navigating away)
      saveProgress(true);
    };
  }, [player, movieId, server, audio, isTVShow, season, episode, title, poster]);

  // Ref to expose saveProgress to seek handlers (avoids stale closure)
  const saveProgressRef = useRef<(skipDedup?: boolean) => Promise<void>>(async () => {});

  // ── 4) Seek debounce save — triggers after any seek settles for 0.5s ──
  const triggerSeekSave = () => {
    if (!hasEverPlayedRef.current) return;
    if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
    seekDebounceRef.current = setTimeout(() => {
      saveProgressRef.current(true); // skipDedup since seek position matters
      seekDebounceRef.current = null;
    }, 500);
  };

  const togglePlay = () => {
    if (playerState.isPlaying) player.pause();
    else player.play();
    resetControlsTimeout();
  };

  const skipBackward = () => {
    if (player) {
      const baseTime = isSeekingRef.current ? seekTargetRef.current : (player.currentTime || 0);
      const target = Math.max(baseTime - 10, 0);
      handleSeek(target);
    }
  };
  
  const skipForward = () => {
    if (player) {
      const baseTime = isSeekingRef.current ? seekTargetRef.current : (player.currentTime || 0);
      const target = Math.min(baseTime + 10, player.duration || 0);
      handleSeek(target);
    }
  };

  const handleSeek = (value: number) => {
    isSeekingRef.current = true;
    seekTargetRef.current = value;
    setIsSeekingUi(true);
    setPlayerState(p => ({ ...p, currentTime: value }));

    if (player) {
      player.currentTime = value;
    }
    triggerSeekSave();
    resetControlsTimeout();

    let attempts = 0;
    const pollId = setInterval(() => {
      attempts++;
      if (!player) {
        clearInterval(pollId);
        isSeekingRef.current = false;
        setIsSeekingUi(false);
        return;
      }
      const ct = player.currentTime || 0;
      if (Math.abs(ct - value) < 1.5 || attempts > 15) {
        clearInterval(pollId);
        isSeekingRef.current = false;
        setIsSeekingUi(false);
      }
    }, 200);
  };

  const toggleMute = () => {
    if (player) {
      player.muted = !player.muted;
      if (!player.muted && player.volume === 0) {
        player.volume = 1;
      }
    }
    resetControlsTimeout();
  };

  const showControlsTemporarily = () => {
    setShowControls(prev => {
      const next = !prev;
      if (next) resetControlsTimeout();
      else {
         setShowSpeedMenu(false);
         setShowZoomMenu(false);
      }
      return next;
    });
  };

  const getDistance = (touches: any) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: any) => {
    if (e.nativeEvent.touches.length === 2 && isFullscreen) {
      initialPinchDistRef.current = getDistance(e.nativeEvent.touches);
      hasPinchedRef.current = true;
    } else if (e.nativeEvent.touches.length === 1) {
      hasPinchedRef.current = false;
    }
  };

  const handleTouchMove = (e: any) => {
    if (e.nativeEvent.touches.length === 2 && initialPinchDistRef.current !== null && isFullscreen) {
      const currentDist = getDistance(e.nativeEvent.touches);
      const ratio = currentDist / initialPinchDistRef.current;
      
      if (ratio > 1.2) {
         setZoomIndex(prev => Math.min(ZOOM_LEVELS.length - 1, prev + 1));
         initialPinchDistRef.current = currentDist;
      } else if (ratio < 0.8) {
         setZoomIndex(prev => Math.max(0, prev - 1));
         initialPinchDistRef.current = currentDist;
      }
    }
  };

  const handleTouchEnd = (e: any) => {
    if (e.nativeEvent.touches.length === 0) {
      if (!hasPinchedRef.current) {
        showControlsTemporarily();
      }
      initialPinchDistRef.current = null;
      hasPinchedRef.current = false;
    }
  };

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
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


  return (
    <View style={styles.container}>
      <View 
        style={[styles.videoWrapper, { overflow: 'hidden' }]}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
          <Animated.View style={{ flex: 1, width: '100%', transform: [{ scale: scaleAnim }] }}>
            <VideoView
              ref={videoViewRef}
              style={styles.video}
              player={player}
              nativeControls={false}
              fullscreenOptions={{ enable: false }}
              allowsPictureInPicture={true}
              startsPictureInPictureAutomatically={true}
              contentFit="contain"
            />
          </Animated.View>
      </View>

      {/* Resume Popup / Seek Loading — inside player */}
      {(checkingResume || resumePopup.show || resumeSeekPending) && (
        <View style={styles.resumeOverlay}>
          {resumeSeekPending ? (
            <View style={styles.resumeBox}>
              <ActivityIndicator size="large" color="white" style={{ marginBottom: 15 }} />
              <Text style={{ color: '#ddd', fontSize: 14, textAlign: 'center' }}>{t('player.loading_to_last_watched', { defaultValue: 'Loading to last watched position...' })}</Text>
              {showResumeSkip && (
                <TouchableOpacity
                  style={[styles.resumeBtn, { backgroundColor: '#f59e0b', marginTop: 15, width: '100%' }]}
                  onPress={handleResumeSkip}
                >
                  <Text style={styles.resumeBtnText}>{t('player.skip_watch_from_beginning', { defaultValue: 'Skip, watch from beginning' })}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : checkingResume && !resumePopup.show ? (
            <View style={styles.resumeBox}>
              <Text style={{ color: '#aaa', fontSize: 14 }}>{t('player.checking', { defaultValue: 'Checking...' })}</Text>
            </View>
          ) : (
            <View style={styles.resumeBox}>
              <Text style={styles.resumeTitle}>{t('player.resume_playback', { defaultValue: 'RESUME PLAYBACK' })}</Text>
              <View style={styles.resumeTimeBox}>
                <Text style={styles.resumeTimeText}>
                  {t('player.you_stopped_at', { defaultValue: 'You stopped at' })}
                  <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                    {' '}{Math.floor(resumePopup.savedTime / 60)}{t('player.minute_short', { defaultValue: 'm' })} {Math.floor(resumePopup.savedTime % 60)}{t('player.second_short', { defaultValue: 's' })}
                  </Text>
                </Text>
              </View>
              <View style={styles.resumeBtnRow}>
                <TouchableOpacity
                  style={[styles.resumeBtn, { backgroundColor: '#10b981', marginRight: 10 }]}
                  onPress={handleResumeContinue}
                >
                  <Text style={styles.resumeBtnText}>{t('player.resume_playing', { defaultValue: 'Resume playing' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.resumeBtn, { backgroundColor: '#f59e0b' }]}
                  onPress={handleResumeStartOver}
                >
                  <Text style={styles.resumeBtnText}>{t('player.start_over', { defaultValue: 'Start over' })}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {showControls && !checkingResume && !resumePopup.show && !resumeSeekPending && (
        <View style={styles.overlay} pointerEvents="box-none">
          <LinearGradient
            colors={['rgba(0,0,0,0.85)', 'transparent', 'rgba(0,0,0,0.85)']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          
          <View 
            style={styles.absoluteHitbox} 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />

          <View style={styles.topBar}>
            <View style={styles.topLeftControls}>
              {isFullscreen && (
                <>
                  <TouchableOpacity style={styles.topBtn} onPress={onToggleFullscreen}>
                    <Ionicons name="close-outline" size={30} color="white" />
                  </TouchableOpacity>
                  
                  <View style={{ position: 'relative' }}>
                    <TouchableOpacity style={styles.topBtn} onPress={() => { setShowZoomMenu(!showZoomMenu); resetControlsTimeout(); }}>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{color: 'white', fontSize: 13, fontWeight: 'bold'}}>{Math.round(ZOOM_LEVELS[zoomIndex] * 100)}%</Text>
                      </View>
                    </TouchableOpacity>

                    {showZoomMenu && (
                      <View style={[styles.popupMenu, { left: 15, right: 'auto', top: 50, width: 80, paddingVertical: 8 }]}>
                        {[...ZOOM_LEVELS].reverse().map((zl) => {
                          const actualIndex = ZOOM_LEVELS.indexOf(zl);
                          return (
                            <TouchableOpacity key={actualIndex} style={styles.popupMenuItem} onPress={() => {
                              setZoomIndex(actualIndex);
                              setShowZoomMenu(false);
                              resetControlsTimeout();
                            }}>
                              <Text style={[styles.popupMenuText, zoomIndex === actualIndex && { color: themeColor, fontWeight: 'bold' }]}>
                                {Math.round(zl * 100)}%
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
            <View style={{flex: 1}} />
            <View style={styles.topRightControls}>
                {showSpeedMenu && (
                  <View style={styles.popupMenu}>
                    {[0.5, 1, 1.25, 1.5, 2].map(r => (
                      <TouchableOpacity key={r} style={styles.popupMenuItem} onPress={() => {
                        if (player) player.playbackRate = r;
                        setShowSpeedMenu(false);
                        resetControlsTimeout();
                      }}>
                        <Text style={[styles.popupMenuText, playerState.playbackRate === r && { color: themeColor, fontWeight: 'bold' }]}>{r}x</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={styles.topBtn} onPress={() => { setShowSpeedMenu(!showSpeedMenu); resetControlsTimeout(); }}>
                    <Text style={styles.speedText}>{playerState.playbackRate}x</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.topBtn} onPress={toggleMute}>
                    <Ionicons name={playerState.isMuted || playerState.volume === 0 ? "volume-mute-outline" : "volume-medium-outline"} size={26} color="white" />
                </TouchableOpacity>
            </View>
          </View>

          <View style={styles.centerControls} pointerEvents="box-none">
            <TouchableOpacity onPress={skipBackward} style={styles.controlBtn}>
              <Ionicons name="play-back-outline" size={42} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={togglePlay} style={[styles.controlBtn, { marginHorizontal: 45, width: 90, height: 90, justifyContent: 'center', alignItems: 'center' }]}>
              {isSeekingUi || isBufferingUi ? (
                <ActivityIndicator size="large" color="white" style={{ transform: [{ scale: 1.5 }] }} />
              ) : (
                <Ionicons name={playerState.isPlaying ? "pause-circle-outline" : "play-circle-outline"} size={70} color="white" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={skipForward} style={styles.controlBtn}>
              <Ionicons name="play-forward-outline" size={42} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomBar}>
            <Text style={styles.timeText}>{formatTime(playerState.currentTime)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={playerState.duration > 0 ? playerState.duration : 1}
              value={isSeekingUi ? seekTargetRef.current : playerState.currentTime}
              tapToSeek={true}
              onSlidingStart={() => {
                isSeekingRef.current = true;
                setIsSeekingUi(true);
                if(controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
              }}
              onValueChange={(val) => { 
                seekTargetRef.current = val;
                setPlayerState(p => ({ ...p, currentTime: val }));
                if(controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); 
              }}
              onSlidingComplete={handleSeek}
              minimumTrackTintColor={themeColor}
              maximumTrackTintColor="rgba(255,255,255,0.3)"
            />
            <Text style={styles.timeText}>{formatTime(playerState.duration)}</Text>
            
            <TouchableOpacity style={styles.fullScreenBtn} onPress={onToggleFullscreen}>
              <Ionicons name={isFullscreen ? "contract-outline" : "expand-outline"} size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  videoWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  absoluteHitbox: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingTop: 15,
    paddingHorizontal: 15,
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  topLeftControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 10,
  },
  popupMenu: {
    position: 'absolute',
    top: 50,
    right: 50,
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 8,
    padding: 5,
    minWidth: 70,
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  popupMenuItem: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  popupMenuText: {
    color: 'white',
    fontSize: 14,
  },
  topBtn: {
    padding: 10,
    marginLeft: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerControls: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtn: {
    padding: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingBottom: 20,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 45,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  fullScreenBtn: {
    padding: 10,
    marginLeft: 5,
  },
  // Resume popup styles
  resumeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  resumeBox: {
    backgroundColor: '#1c1c2e',
    borderRadius: 16,
    padding: 25,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  resumeTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  resumeTimeBox: {
    backgroundColor: '#1a1c29',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  resumeTimeText: {
    color: '#ddd',
    textAlign: 'center',
    fontSize: 15,
  },
  resumeBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  resumeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
