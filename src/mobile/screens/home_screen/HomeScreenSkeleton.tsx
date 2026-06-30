import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './homeStyles';

const SKELETON_COLOR_1 = '#1c1c24';

function SkeletonRow({ titleWidth = 100 }: { titleWidth?: number }) {
  return (
    <View style={{ paddingBottom: 15 }}>
      <View style={{ width: titleWidth, height: 20, backgroundColor: SKELETON_COLOR_1, marginLeft: 18, marginTop: 22, marginBottom: 10, borderRadius: 4 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18 }}>
        {[1,2,3,4].map(i => (
          <View key={i} style={{ width: 108, height: 158, backgroundColor: SKELETON_COLOR_1, borderRadius: 9, marginRight: 12 }} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function HomeScreenSkeleton() {
  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <View style={[styles.featuredContainer, { backgroundColor: SKELETON_COLOR_1 }]} />
      <SkeletonRow titleWidth={150} />
      <SkeletonRow titleWidth={120} />
      <SkeletonRow titleWidth={180} />
    </View>
  );
}
