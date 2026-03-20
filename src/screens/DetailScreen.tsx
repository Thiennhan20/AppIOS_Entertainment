import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, ScrollView, 
  TouchableOpacity, Dimensions, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { tmdbApi } from '../api/tmdb';
import { claudeApi } from '../api/claude';

const { width, height } = Dimensions.get('window');

export default function DetailScreen({ route, navigation }: any) {
  const { item, isTV } = route.params;
  const [details, setDetails] = useState<any>(null);
  
  // AI State
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        let res;
        if (isTV) {
          res = await tmdbApi.getTVDetail(item.id);
        } else {
          res = await tmdbApi.getMovieDetail(item.id);
        }
        setDetails(res);
      } catch (error) {
        console.warn("Failed fetching metadata");
      }
    };
    fetchDetails();
  }, [item.id, isTV]);

  const handlePlay = () => {
    navigation.navigate('PlayerScreen', { item, isTV });
  };

  const posterUri = details?.poster_path || item?.poster_path;
  const backdropUri = details?.backdrop_path || item?.backdrop_path;
  
  const featuredImageUri = backdropUri 
    ? `https://image.tmdb.org/t/p/w780${backdropUri}`
    : (posterUri ? `https://image.tmdb.org/t/p/w400${posterUri}` : 'https://via.placeholder.com/400x600');

  const title = details?.title || details?.name || item?.title || item?.name;
  const overview = details?.overview || item?.overview;
  const year = details?.release_date?.substring(0,4) || details?.first_air_date?.substring(0,4) || item?.release_date?.substring(0,4);
  const director = details?.credits?.crew?.find((c:any) => c.job === 'Director')?.name || '';

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Backdrop */}
        <View style={styles.backdropContainer}>
          <Image source={{ uri: featuredImageUri }} style={styles.backdropImage} />
          <LinearGradient colors={['transparent', '#0f0f13']} style={styles.gradient} />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{title}</Text>
          
          <View style={styles.metaRow}>
            <Text style={styles.matchText}>98% Match</Text>
            <Text style={styles.metaText}>{details?.release_date?.substring(0,4) || details?.first_air_date?.substring(0,4)}</Text>
            <Text style={styles.ageRating}>16+</Text>
            <Text style={styles.metaText}>{details?.runtime ? `${details.runtime}m` : '1 Season'}</Text>
          </View>

          {/* Player controls */}
          <View style={styles.playControlsRow}>
            {/* Play Button */}
            <TouchableOpacity 
              style={[styles.playButtonFull, { flex: 1, marginRight: 0 }]}
              onPress={handlePlay}
            >
              <Ionicons name="play" size={24} color="black" />
              <Text style={styles.playButtonText}>Start Watching</Text>
            </TouchableOpacity>
          </View>

          {/* AI Features */}
          <View style={styles.aiBox}>
            <TouchableOpacity 
              style={styles.aiSummaryButton}
              onPress={async () => {
                if (aiSummary) return;
                setLoadingAi(true);
                try {
                  const sum = await claudeApi.summarizeMovie(
                    title, overview, parseInt(year)
                  );
                  setAiSummary(sum);
                } catch {
                  setAiSummary("Xin lỗi, tôi không thể tóm tắt lúc này.");
                }
                setLoadingAi(false);
              }}
            >
              <Ionicons name="sparkles" size={16} color="#f59e0b" style={{marginRight: 6}} />
              <Text style={{color: '#f59e0b', fontWeight: 'bold'}}>
                {loadingAi ? "Đang tóm tắt..." : "VIBE AI Tóm tắt"}
              </Text>
            </TouchableOpacity>
            
            {aiSummary ? (
              <Text style={styles.aiSummaryText}>{aiSummary}</Text>
            ) : null}

            <TouchableOpacity 
              style={styles.aiRecommendButton}
              onPress={() => navigation.navigate('AI')}
            >
              <Text style={{color: '#3b82f6'}}>Xem thêm phim tương tự với AI ➔</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.overview}>{overview}</Text>
          
          <Text style={styles.castText}>
            <Text style={{color: 'gray'}}>Genres: </Text>
            {details?.genres?.map((g: any) => g.name).join(', ')}
          </Text>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="add" size={28} color="white" />
              <Text style={styles.actionItemText}>My List</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="thumbs-up-outline" size={28} color="white" />
              <Text style={styles.actionItemText}>Rate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="share-social-outline" size={28} color="white" />
              <Text style={styles.actionItemText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f13',
  },
  backdropContainer: {
    height: height * 0.45,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 150,
  },
  backButton: {
    position: 'absolute',
    top: 50, left: 20, zIndex: 10,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  contentContainer: {
    paddingHorizontal: 15,
    marginTop: -20,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  matchText: {
    color: '#46d369',
    fontWeight: 'bold',
    marginRight: 10,
  },
  metaText: { color: 'gray', marginRight: 10 },
  ageRating: {
    color: 'gray',
    backgroundColor: '#333',
    paddingHorizontal: 4, borderRadius: 3,
    fontSize: 12, marginRight: 10,
  },
  playControlsRow: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  playButtonFull: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 4,
  },
  playButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  dropdownButton: {
    backgroundColor: '#262626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 4,
  },
  dropdownText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  overview: {
    color: '#fff',
    lineHeight: 22,
    marginBottom: 15,
  },
  castText: {
    color: 'white',
    fontSize: 13,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 50,
  },
  actionItem: { alignItems: 'center', marginRight: 40 },
  actionItemText: { color: 'gray', fontSize: 12, marginTop: 8 },

  // AI Styles
  aiBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 15,
  },
  aiSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  aiSummaryText: {
    color: '#fff',
    marginTop: 10,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  aiRecommendButton: {
    marginTop: 15,
    alignSelf: 'flex-start',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1c1c1c',
    width: '85%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  serverOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  serverOptionSelected: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  serverOptionText: {
    color: 'white',
    fontSize: 16,
  }
});
