import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, TouchableOpacity, Dimensions, ActivityIndicator,
  Modal, TouchableWithoutFeedback, Vibration
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { tmdbApi } from '../api/tmdb';
import { useTheme } from '../context/ThemeContext';
import WatchlistButton from './WatchlistButton';

const { width } = Dimensions.get('window');

interface LongPressMoviePopupProps {
  movie: any | null;
  onClose: () => void;
  onWatchlistUpdated?: () => void; // Optional callback
}

export default function LongPressMoviePopup({ movie, onClose, onWatchlistUpdated }: LongPressMoviePopupProps) {
  const { t } = useTranslation();
  const { themeColor } = useTheme();
  const navigation = useNavigation<any>();

  const [lpTrailerKey, setLpTrailerKey] = useState<string | null>(null);
  const [isLpTrailerLoading, setIsLpTrailerLoading] = useState(false);
  const [lpPlayerReady, setLpPlayerReady] = useState(false);

  useEffect(() => {
    if (movie) {
      setLpTrailerKey(null);
      setLpPlayerReady(false);
      setIsLpTrailerLoading(true);
      const fetchLPTrailer = async () => {
        try {
          const videos = movie.isTV || movie.type === 'tv'
            ? await tmdbApi.getTVVideos(movie.id)
            : await tmdbApi.getMovieVideos(movie.id);
          const vidList = (videos as any)?.results || [];
          const ytTrailer = vidList.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
          if (ytTrailer) setLpTrailerKey(ytTrailer.key);
        } catch (e) {
        } finally {
          setIsLpTrailerLoading(false);
        }
      };
      fetchLPTrailer();
    } else {
      setLpTrailerKey(null);
      setIsLpTrailerLoading(false);
    }
  }, [movie]);

  if (!movie) return null;

  return (
    <Modal visible={!!movie} transparent animationType="fade" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.longPressOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.longPressPopup, { borderColor: themeColor }]}>
              <View style={[styles.longPressMediaBox, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                {isLpTrailerLoading ? (
                  <ActivityIndicator color={themeColor} size="large" />
                ) : lpTrailerKey ? (
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }]}>
                    <YoutubePlayer
                      height={width * 0.85 * (9/16)}
                      width={width * 0.85}
                      play={true}
                      mute={true}
                      volume={0}
                      videoId={lpTrailerKey}
                      forceAndroidAutoplay={true}
                      initialPlayerParams={{
                        rel: false,
                        modestbranding: true,
                        preventFullScreen: true,
                        controls: false,
                        // @ts-ignore
                        autoplay: 1,
                        // @ts-ignore
                        mute: 1
                      }}
                      webViewProps={{
                        mediaPlaybackRequiresUserAction: false,
                        allowsInlineMediaPlayback: true,
                        scrollEnabled: false,
                      }}
                    />
                  </View>
                ) : (
                  <View style={[styles.longPressBackdrop, styles.placeholderCard, { backgroundColor: '#111' }]}>
                    <Ionicons name="film-outline" size={40} color="rgba(255,255,255,0.2)" />
                    <Text style={{color: 'rgba(255,255,255,0.4)', marginTop: 8}}>{t('player.no_trailer')}</Text>
                  </View>
                )}
                
                <LinearGradient
                  colors={['transparent', '#16161e']}
                  style={styles.longPressGradient}
                  pointerEvents="none"
                />
              </View>

              <View style={styles.longPressContent}>
                <Text style={styles.longPressTitle} numberOfLines={2}>
                  {movie.title || movie.name}
                </Text>
                
                <View style={styles.longPressMeta}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.longPressRating}>
                    {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                  </Text>
                  <View style={styles.dotSeparator} />
                  <Text style={styles.longPressDate}>
                    {movie.release_date?.substring(0,4) || movie.first_air_date?.substring(0,4) || '?'}
                  </Text>
                </View>

                <Text style={styles.longPressOverview} numberOfLines={3}>
                  {movie.overview || t('player.no_overview')}
                </Text>

                <View style={styles.longPressActions}>
                  <TouchableOpacity 
                    style={[styles.lpBtnMaster, { backgroundColor: themeColor }]}
                    onPress={() => {
                      onClose();
                      navigation.navigate('PlayerScreen', { item: movie, isTV: movie.isTV });
                    }}
                  >
                    <Ionicons name="play" size={18} color="white" />
                    <Text style={styles.lpBtnTextP}>{t('general.play_now')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.lpBtnSub}
                    onPress={() => {
                      onClose();
                      navigation.navigate('DetailScreen', { item: movie, isTV: movie.isTV });
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={20} color="white" />
                    <Text style={styles.lpBtnText}>{t('general.details')}</Text>
                  </TouchableOpacity>

                  <WatchlistButton 
                    movie={movie} 
                    styleType="iconOnly" 
                    onWatchlistUpdated={onWatchlistUpdated}
                  />
                </View>

              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  longPressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  longPressPopup: {
    width: width * 0.85,
    backgroundColor: '#16161e',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  longPressMediaBox: {
    width: '100%',
    aspectRatio: 16/9,
    position: 'relative',
    overflow: 'hidden',
  },
  longPressBackdrop: {
    width: '100%',
    aspectRatio: 16/9,
    resizeMode: 'cover',
  },
  placeholderCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  longPressGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    aspectRatio: 16/9,
  },
  longPressContent: {
    padding: 20,
    paddingTop: 10,
  },
  longPressTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  longPressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  longPressRating: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    marginHorizontal: 8,
  },
  longPressDate: {
    color: '#aaa',
    fontSize: 14,
  },
  longPressOverview: {
    color: '#ddd',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  longPressActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lpBtnMaster: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 10,
  },
  lpBtnSub: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 10,
  },
  lpBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lpBtnTextP: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  lpBtnText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
});
