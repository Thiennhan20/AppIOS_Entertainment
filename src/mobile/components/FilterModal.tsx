import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const FILTER_GENRES = [
  { id: 0, name: 'All' },
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 10759, name: 'Action & P/Save' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' },
  { id: 10762, name: 'Kids' },
  { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk Show' },
];

export const FILTER_COUNTRIES = [
  { id: '', name: 'All' },
  { id: 'US', name: 'United States' },
  { id: 'GB', name: 'United Kingdom' },
  { id: 'JP', name: 'Japan' },
  { id: 'KR', name: 'South Korea' },
  { id: 'CN', name: 'China' },
  { id: 'HK', name: 'Hong Kong' },
  { id: 'TW', name: 'Taiwan' },
  { id: 'IN', name: 'India' },
  { id: 'TH', name: 'Thailand' },
  { id: 'VN', name: 'Vietnam' },
  { id: 'FR', name: 'France' },
  { id: 'DE', name: 'Germany' },
  { id: 'ES', name: 'Spain' },
  { id: 'IT', name: 'Italy' },
  { id: 'CA', name: 'Canada' },
  { id: 'AU', name: 'Australia' },
  { id: 'BR', name: 'Brazil' },
  { id: 'MX', name: 'Mexico' },
  { id: 'RU', name: 'Russia' },
  { id: 'ID', name: 'Indonesia' },
  { id: 'PH', name: 'Philippines' },
  { id: 'MY', name: 'Malaysia' },
  { id: 'SG', name: 'Singapore' },
];

export const FILTER_YEARS = [0, ...Array.from({length: 47}, (_, i) => 2026 - i)]; // 2026 to 1980

export const FILTER_TYPES = [
  { id: 'all', name: 'All' },
  { id: 'movie', name: 'Movie' },
  { id: 'tv', name: 'TV Show' }
];

export interface FilterState {
  genreId: number;
  year: number;
  country: string;
  type: string; // 'all', 'movie', 'tv'
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  showTypeFilter?: boolean;
}

export default function FilterModal({ visible, onClose, filters, onApply, showTypeFilter = false }: FilterModalProps) {
  const insets = useSafeAreaInsets();
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);

  // Sync temp state when modal opens
  useEffect(() => {
    if (visible) {
      setTempFilters(filters);
    }
  }, [visible, filters]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, { paddingBottom: insets.bottom }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter Options</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={26} color="white" />
                </TouchableOpacity>
              </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Type Filter (Only for Search) */}
          {showTypeFilter && (
            <>
              <Text style={styles.filterSectionTitle}>Format</Text>
              <View style={styles.filterGrid}>
                {FILTER_TYPES.map((t) => {
                  const isActive = tempFilters.type === t.id;
                  return (
                    <TouchableOpacity 
                      key={t.id} 
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      onPress={() => setTempFilters({ ...tempFilters, type: t.id })}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{t.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Category */}
          <Text style={styles.filterSectionTitle}>Genre</Text>
          <View style={styles.filterGrid}>
            {FILTER_GENRES.map((g) => {
              const isActive = tempFilters.genreId === g.id;
              return (
                <TouchableOpacity 
                  key={g.id} 
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setTempFilters({ ...tempFilters, genreId: g.id })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{g.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Year */}
          <Text style={styles.filterSectionTitle}>Release Year</Text>
          <View style={styles.filterGrid}>
            {FILTER_YEARS.map((y) => {
              const isActive = tempFilters.year === y;
              return (
                <TouchableOpacity 
                  key={y} 
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setTempFilters({ ...tempFilters, year: y })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{y === 0 ? 'All' : y}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Country */}
          <Text style={styles.filterSectionTitle}>Country / Region</Text>
          <View style={styles.filterGrid}>
            {FILTER_COUNTRIES.map((c) => {
              const isActive = tempFilters.country === c.id;
              return (
                <TouchableOpacity 
                  key={c.id} 
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setTempFilters({ ...tempFilters, country: c.id })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.resetButton} 
                onPress={() => {
                  setTempFilters({ genreId: 0, year: 0, country: '', type: 'all' });
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.applyButton} 
                onPress={() => onApply(tempFilters)}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '75%',
    backgroundColor: '#161925',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2d3a',
  },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    width: '31%',
    backgroundColor: '#1e2130',
    paddingVertical: 12,
    marginRight: '2%',
    marginBottom: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2d3a',
  },
  filterChipActive: {
    backgroundColor: '#E50914', // using app theme
    borderColor: '#E50914',
  },
  filterText: {
    color: '#d1d5db',
    fontSize: 12, // scaled down slightly to fit labels like 'Action & Ph/Save'
    fontWeight: '500',
    textAlign: 'center',
  },
  filterTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#2a2d3a',
    backgroundColor: '#161925',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#2a2d3a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  resetButtonText: {
    color: '#d1d5db',
    fontSize: 16,
    fontWeight: 'bold',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#E50914',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
