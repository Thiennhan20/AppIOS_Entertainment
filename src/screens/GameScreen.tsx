import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  Image, ActivityIndicator, Alert, ScrollView, Animated,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tmdbApi } from '../api/tmdb';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function GameScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const [score, setScore] = useState(0);
  
  // Game state
  const [movies, setMovies] = useState<any[]>([]);
  const [currentMovie, setCurrentMovie] = useState<any>(null);
  const [guess, setGuess] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  // Animation values
  const entranceAnim = React.useRef(new Animated.Value(50)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadScore();
    fetchGameMovies();

    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(entranceAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true })
    ]).start();
  }, []);

  const loadScore = async () => {
    const s = await AsyncStorage.getItem('@ntn_game_score');
    if (s) setScore(parseInt(s));
  };

  const saveScore = async (newScore: number) => {
    setScore(newScore);
    await AsyncStorage.setItem('@ntn_game_score', newScore.toString());
  };

  const fetchGameMovies = async () => {
    try {
      const data: any = await tmdbApi.getTrendingMovies();
      const results = data?.results || [];
      // Shuffle movies
      const shuffled = results.sort(() => 0.5 - Math.random());
      setMovies(shuffled);
      if (shuffled.length > 0) {
        setCurrentMovie(shuffled[0]);
      }
    } catch {
      Alert.alert(t('general.error'), t('game.failed_load_data'));
    } finally {
      setLoading(false);
    }
  };

  const nextMovie = () => {
    setGuess('');
    setHintsUsed(0);
    const ms = [...movies];
    ms.shift(); // remove current
    if (ms.length > 0) {
      setMovies(ms);
      setCurrentMovie(ms[0]);
    } else {
      fetchGameMovies(); // Fetch more
    }
  };

  const checkGuess = () => {
    const pGuess = guess.toLowerCase().trim();
    const actual = (currentMovie?.title || currentMovie?.name || '').toLowerCase().trim();
    
    if (pGuess === actual || actual.includes(pGuess) && pGuess.length > 4) {
      Alert.alert(t('game.correct'), '+10 ' + t('game.ntn_points'), [{ text: t('general.next'), onPress: nextMovie }]);
      saveScore(score + 10);
    } else {
      setHintsUsed(h => h + 1);
      if (hintsUsed >= 2) {
        Alert.alert(t('game.wrong') + ' 😢', `${t('game.answer_is')} ${currentMovie?.title || currentMovie?.name}`, [{ text: t('game.try_another_movie'), onPress: nextMovie }]);
      } else {
        Alert.alert(t('game.wrong'), t('game.try_again_hint'));
      }
    }
  };

  if (loading || !currentMovie) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  const posterUri = `https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`;

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#0f0f13' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NTN Games 🎮</Text>
        <View style={[styles.scoreBadge, { backgroundColor: `${themeColor}33`, borderColor: themeColor, borderWidth: 1 }]}>
          <Text style={[styles.scoreText, { color: themeColor }]}>🏆 {score}  {t('game.points')}</Text>
        </View>
      </View>

      <Animated.View style={[styles.gameCard, { opacity: opacityAnim, transform: [{ translateY: entranceAnim }] }]}>
        <Text style={[styles.gameTitle, { color: themeColor }]}>{t('game.guess_the_movie')}</Text>
        <Text style={styles.gameSub}>{t('game.can_you_guess')}</Text>
        
        {/* Blurry Poster */}
        <View style={[styles.imageWrapper, { borderColor: themeColor, borderWidth: 2 }]}>
          <Image 
            source={{ uri: posterUri }} 
            style={[styles.poster, { opacity: hintsUsed >= 2 ? 1 : 0.6 }]} 
            blurRadius={hintsUsed === 0 ? 15 : hintsUsed === 1 ? 8 : 0} 
          />
        </View>

        {/* Hints */}
        <View style={styles.hintsBox}>
          <Text style={styles.hintText}>
            {t('game.hint_1')} {currentMovie.release_date?.substring(0,4) || currentMovie.first_air_date?.substring(0,4)}
          </Text>
          {hintsUsed >= 1 && (
            <Text style={[styles.hintText, { color: themeColor, fontWeight: 'bold' }]}>
              {t('game.hint_2')} {currentMovie.vote_average}/10
            </Text>
          )}
        </View>

        {/* Input */}
        <TextInput
          style={[styles.input, { borderColor: themeColor }]}
          placeholder={t('game.enter_movie_name')}
          placeholderTextColor="#777"
          value={guess}
          onChangeText={setGuess}
          autoCapitalize="words"
        />

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.skipBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]} onPress={nextMovie}>
            <Text style={styles.skipText}>{t('general.skip')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: themeColor }]} onPress={checkGuess}>
            <Text style={styles.submitText}>{t('game.check')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f13',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  scoreBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  scoreText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14,
  },
  gameCard: {
    backgroundColor: '#222230',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  gameTitle: {
    color: '#3b82f6',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  gameSub: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  imageWrapper: {
    width: 200,
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
    marginBottom: 20,
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  hintsBox: {
    width: '100%',
    backgroundColor: '#1a1a22',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  hintText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    width: '100%',
    backgroundColor: '#111',
    color: 'white',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  skipBtn: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  skipText: {
    color: '#aaa',
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
