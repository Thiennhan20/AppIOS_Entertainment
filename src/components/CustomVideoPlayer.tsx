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

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const showControlsTemporarily = () => {
    setShowControls(prev => {
      const next = !prev;
      if (next) resetControlsTimeout();
      return next;
    });
  };

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={showControlsTemporarily}>
        <View style={styles.videoWrapper}>
            <VideoView
              style={styles.video}
              player={player}
              nativeControls={false}
              allowsFullscreen={false}
            />
        </View>
      </TouchableWithoutFeedback>

      {showControls && (
        <View style={styles.overlay} pointerEvents="box-none">
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.85)']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          
          <TouchableWithoutFeedback onPress={showControlsTemporarily}>
             <View style={styles.absoluteHitbox} />
          </TouchableWithoutFeedback>

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
              onValueChange={() => { if(controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); }}
              onSlidingComplete={handleSeek}
              minimumTrackTintColor={themeColor}
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              thumbTintColor={themeColor}
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
    width: 45,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  fullScreenBtn: {
    padding: 10,
    marginLeft: 5,
  }
});
