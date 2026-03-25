import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

interface CustomVideoPlayerProps {
  url: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  themeColor: string;
}

export default function CustomVideoPlayer({ url, isFullscreen, onToggleFullscreen, themeColor }: CustomVideoPlayerProps) {
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);
  const hasPinchedRef = useRef<boolean>(false);

  const player = useVideoPlayer(url, p => {
    p.loop = false;
    p.play();
  });

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
    const interval = setInterval(() => {
      if (player) {
        setCurrentTime(player.currentTime || 0);
        setDuration(player.duration || 0);
        setIsPlaying(player.playing);
        setPlaybackRate(player.playbackRate || 1);
        setIsMuted(player.muted);
        setVolume(player.volume ?? 1);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [player]);

  const togglePlay = () => {
    if (isPlaying) player.pause();
    else player.play();
    resetControlsTimeout();
  };

  const skipBackward = () => {
    if (player) player.currentTime = Math.max((player.currentTime || 0) - 10, 0);
    resetControlsTimeout();
  };
  
  const skipForward = () => {
    if (player) player.currentTime = Math.min((player.currentTime || 0) + 10, player.duration || 0);
    resetControlsTimeout();
  };

  const handleSeek = (value: number) => {
    if (player) player.currentTime = value;
    resetControlsTimeout();
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
      
      if (ratio > 1.2 && !isZoomed) {
         setIsZoomed(true);
      } else if (ratio < 0.8 && isZoomed) {
         setIsZoomed(false);
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
        style={styles.videoWrapper}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
            <VideoView
              style={styles.video}
              player={player}
              nativeControls={false}
              allowsFullscreen={false}
              allowsPictureInPicture={true}
              startsPictureInPictureAutomatically={true}
              contentFit={isFullscreen && isZoomed ? "cover" : "contain"}
            />
      </View>

      {showControls && (
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
                      <Ionicons name="close" size={30} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.topBtn} onPress={() => {}}>
                      <Ionicons name="albums-outline" size={24} color="white" />
                  </TouchableOpacity>
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
                        <Text style={[styles.popupMenuText, playbackRate === r && { color: themeColor, fontWeight: 'bold' }]}>{r}x</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={styles.topBtn} onPress={() => { setShowSpeedMenu(!showSpeedMenu); resetControlsTimeout(); }}>
                    <Text style={styles.speedText}>{playbackRate}x</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.topBtn} onPress={toggleMute}>
                    <Ionicons name={isMuted || volume === 0 ? "volume-mute" : "volume-medium"} size={26} color="white" />
                </TouchableOpacity>
            </View>
          </View>

          <View style={styles.centerControls} pointerEvents="box-none">
            <TouchableOpacity onPress={skipBackward} style={styles.controlBtn}>
              <Ionicons name="play-back" size={42} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={togglePlay} style={[styles.controlBtn, { marginHorizontal: 45 }]}>
              <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={70} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={skipForward} style={styles.controlBtn}>
              <Ionicons name="play-forward" size={42} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomBar}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={currentTime}
              tapToSeek={true}
              onValueChange={() => { if(controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); }}
              onSlidingComplete={handleSeek}
              minimumTrackTintColor={themeColor}
              maximumTrackTintColor="rgba(255,255,255,0.3)"
            />
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
            
            <TouchableOpacity style={styles.fullScreenBtn} onPress={onToggleFullscreen}>
              <Ionicons name={isFullscreen ? "contract" : "expand"} size={22} color="white" />
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
  }
});
