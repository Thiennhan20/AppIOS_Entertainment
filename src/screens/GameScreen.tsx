import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  Image, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tmdbApi } from '../api/tmdb';

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const [score, setScore] = useState(0);
  
  // Game state
  const [movies, setMovies] = useState<any[]>([]);
  const [currentMovie, setCurrentMovie] = useState<any>(null);
  const [guess, setGuess] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScore();
    fetchGameMovies();
  }, []);

  const loadScore = async () => {
    const s = await AsyncStorage.getItem('@vibe_game_score');
    if (s) setScore(parseInt(s));
  };

  const saveScore = async (newScore: number) => {
    setScore(newScore);
    await AsyncStorage.setItem('@vibe_game_score', newScore.toString());
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
      Alert.alert('Lỗi', 'Không thể tải dữ liệu game');
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
      Alert.alert('Chính xác! 🎉', '+10 Điểm VIBE', [{ text: 'Tiếp tục', onPress: nextMovie }]);
      saveScore(score + 10);
    } else {
      setHintsUsed(h => h + 1);
      if (hintsUsed >= 2) {
        Alert.alert('Sai rồi 😢', `Đáp án là: ${currentMovie?.title || currentMovie?.name}`, [{ text: 'Thử phim khác', onPress: nextMovie }]);
      } else {
        Alert.alert('Sai rồi', 'Thử lại hoặc xem gợi ý bên dưới nhé!');
      }
    }
  };

  if (loading || !currentMovie) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const posterUri = `https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`;

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VIBE Games 🎮</Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>🏆 {score} Điểm</Text>
        </View>
      </View>

      <View style={styles.gameCard}>
        <Text style={styles.gameTitle}>Đoán tên phim!</Text>
        <Text style={styles.gameSub}>Nhìn mờ mờ đoán thử xem đây là siêu phẩm nào?</Text>
        
        {/* Blurry Poster */}
        <View style={styles.imageWrapper}>
          <Image 
            source={{ uri: posterUri }} 
            style={[styles.poster, { opacity: hintsUsed >= 2 ? 1 : 0.6 }]} 
            blurRadius={hintsUsed === 0 ? 15 : hintsUsed === 1 ? 8 : 0} 
          />
        </View>

        {/* Hints */}
        <View style={styles.hintsBox}>
          <Text style={styles.hintText}>
            💡 Gợi ý 1: Phim phát hành năm {currentMovie.release_date?.substring(0,4) || currentMovie.first_air_date?.substring(0,4)}
          </Text>
          {hintsUsed >= 1 && (
            <Text style={[styles.hintText, { color: '#f59e0b' }]}>
              💡 Gợi ý 2: Điểm đánh giá {currentMovie.vote_average}/10
            </Text>
          )}
        </View>

        {/* Input */}
        <TextInput
          style={styles.input}
          placeholder="Nhập tên phim (Tiếng Anh/Việt)..."
          placeholderTextColor="#777"
          value={guess}
          onChangeText={setGuess}
          autoCapitalize="words"
        />

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={nextMovie}>
            <Text style={styles.skipText}>Bỏ qua</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitBtn} onPress={checkGuess}>
            <Text style={styles.submitText}>Kiểm tra 🚀</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
