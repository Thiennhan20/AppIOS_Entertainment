import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Easing, Linking, LayoutAnimation, Platform, UIManager
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const FAQItem = ({ question, answer, themeColor }: any) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.faqCard}>
      <TouchableOpacity style={styles.faqHeader} onPress={toggleExpand} activeOpacity={0.7}>
        <Text style={styles.faqTitle}>{question}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={expanded ? themeColor : '#666'} />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.faqBody}>
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

export default function HelpScreen({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  // Screen load animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.out(Easing.poly(3))
    }).start();
  }, []);

  const handleContact = () => {
    Linking.openURL('mailto:support@ntnmovie.com');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.help_support')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.ScrollView 
        contentContainerStyle={styles.content}
        style={{ opacity: fadeAnim }}
      >
        <View style={[styles.supportBanner, { backgroundColor: `${themeColor}1A`, borderColor: themeColor }]}>
          <Ionicons name="chatbubbles-outline" size={40} color={themeColor} />
          <Text style={styles.bannerTitle}>{t('profile.how_can_we_help')}</Text>
          <Text style={styles.bannerDesc}>{t('profile.support_ready')}</Text>
          <TouchableOpacity style={[styles.contactBtn, { backgroundColor: themeColor }]} onPress={handleContact}>
            <Text style={styles.contactBtnText}>{t('profile.send_email')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{t('profile.faq')}</Text>
        
        <FAQItem 
          themeColor={themeColor}
          question="Is the movie app completely free?" 
          answer="Yes! All basic content on NTN is completely free with highest quality." 
        />
        <FAQItem 
          themeColor={themeColor}
          question="How to load movies smoother on a weak network?" 
          answer="You can open the watch view, click on Server 1 or Server 3 depending on your connection." 
        />
        <FAQItem 
          themeColor={themeColor}
          question="When will Watch Party be released?" 
          answer="Watch Party is currently being optimized and will be released this quarter!" 
        />
        
        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f13' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  backBtn: { padding: 10 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: { padding: 20 },
  supportBanner: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 30,
  },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 12, marginBottom: 8, textAlign: 'center' },
  bannerDesc: { color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 20, paddingHorizontal: 10 },
  contactBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  contactBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  faqCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqTitle: { color: '#eee', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 10 },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswer: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 20,
  }
});
