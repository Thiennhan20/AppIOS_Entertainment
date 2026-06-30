import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/ThemeContext';
import { styles } from '../homeStyles';

type Props = {
  section: any;
  renderMovieCard: (item: any, isTV: boolean, isHistory: boolean, index: number) => React.ReactElement;
  navigation?: any;
};

export default function MovieRowSection({ section, renderMovieCard, navigation }: Props) {
  const { t } = useTranslation();
  const { themeColor } = useTheme();

  return (
    <View style={{ paddingBottom: 15 }}>
      {section.isHistory && navigation ? (
        <TouchableOpacity 
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingLeft: 18,
            marginTop: 42,
            marginBottom: 10,
          }}
          onPress={() => navigation.navigate('UserListScreen', { type: 'history' })}
          activeOpacity={0.7}
        >
          <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0, marginLeft: 0 }]}>{section.label}</Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: `${themeColor}20`,
            borderColor: `${themeColor}60`,
            borderWidth: 0.8,
            borderRadius: 14,
            paddingHorizontal: 8,
            paddingVertical: 3,
            marginLeft: 10,
          }}>
            <Text style={{
              color: themeColor,
              fontSize: 11,
              fontWeight: '700',
              marginRight: 2,
            }}>{t('general.view_all')}</Text>
            <Ionicons name="chevron-forward" size={12} color={themeColor} />
          </View>
        </TouchableOpacity>
      ) : (
        <Text style={styles.sectionTitle}>{section.label}</Text>
      )}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.row,
          section.isHistory && { paddingTop: 10, paddingRight: 24, paddingBottom: 5 }
        ]}
        style={section.isHistory ? { overflow: 'visible' } : undefined}
        data={section.data}
        keyExtractor={(item, idx) => `${item.id || item.contentId}-${idx}`}
        renderItem={({ item, index }) => renderMovieCard(item, section.isTV, section.isHistory, index)}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        removeClippedSubviews={false}
      />
    </View>
  );
}
