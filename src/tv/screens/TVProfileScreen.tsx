import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEME_COLORS } from '../../context/ThemeContext';
import { Image } from 'expo-image';

interface TVProfileScreenProps {
  navigation: any;
  onLogout: () => void;
}

export default function TVProfileScreen({ navigation, onLogout }: TVProfileScreenProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { themeColor, setThemeColor } = useTheme();

  const [focusedThemeId, setFocusedThemeId] = React.useState<string | null>(null);
  const [isLangFocused, setIsLangFocused] = React.useState(false);
  const [isLogoutFocused, setIsLogoutFocused] = React.useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>{t('general.profile') || 'User Profile'}</Text>
      <Text style={styles.headerSubtitle}>
        {t('profile.manage_preferences_subtitle') || 'Manage your theme, language preferences and account.'}
      </Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.profileCard}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={[styles.avatar, { borderColor: themeColor }]} />
          ) : (
            <View style={[styles.avatarPlaceholder, { borderColor: themeColor }]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}

          <View style={styles.profileDetails}>
            <Text style={styles.userName}>{user?.name || 'TV Guest User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'guest@ntntv.com'}</Text>
            
            {user?.authType === 'google' && (
              <View style={styles.googleBadge}>
                <Ionicons name="logo-google" size={12} color="#ffffff" style={{ marginRight: 5 }} />
                <Text style={styles.googleBadgeText}>Google Account</Text>
              </View>
            )}
          </View>
        </View>

        {/* Theme Color Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.change_theme') || 'Interface Color'}</Text>
          <View style={styles.themeGrid}>
            {THEME_COLORS.map((tc) => {
              const isActive = themeColor === tc.color;
              return (
                <Pressable
                  key={tc.id}
                  onPress={() => setThemeColor(tc.color)}
                  focusable={true}
                  onFocus={() => setFocusedThemeId(tc.id)}
                  onBlur={() => setFocusedThemeId(null)}
                  style={() => {
                    const showFocused = focusedThemeId === tc.id;
                    return [
                      styles.themeCircle,
                      { backgroundColor: tc.color },
                      isActive && styles.themeCircleActive,
                      showFocused && styles.themeCircleFocused
                    ];
                  }}
                >
                  {isActive && <Ionicons name="checkmark" size={18} color="#ffffff" />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Language Selection Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.language_settings') || 'Language Settings'}</Text>
          <Pressable
            onPress={() => {
              const newLang = i18n.language.startsWith('vi') ? 'en' : 'vi';
              i18n.changeLanguage(newLang);
            }}
            focusable={true}
            onFocus={() => setIsLangFocused(true)}
            onBlur={() => setIsLangFocused(false)}
            style={() => [
              styles.toggleBtn,
              isLangFocused && styles.toggleBtnFocused
            ]}
          >
            <Ionicons name="language-outline" size={20} color="#ffffff" style={{ marginRight: 12 }} />
            <Text style={styles.toggleBtnText}>
              {t('profile.language_label') || (i18n.language.startsWith('vi') ? 'Ngôn ngữ: Tiếng Việt' : 'Language: English')}
            </Text>
            <Ionicons name="swap-horizontal" size={16} color={themeColor} style={{ marginLeft: 'auto' }} />
          </Pressable>
        </View>

        {/* Big Logout Button */}
        <Pressable
          onPress={onLogout}
          focusable={true}
          onFocus={() => setIsLogoutFocused(true)}
          onBlur={() => setIsLogoutFocused(false)}
          style={() => [
            styles.logoutBtn,
            { backgroundColor: isLogoutFocused ? '#E50914' : 'rgba(229,9,20,0.15)', borderColor: '#E50914' },
            isLogoutFocused && styles.logoutBtnFocused
          ]}
        >
          {() => (
            <>
              <Ionicons name="log-out-outline" size={20} color={isLogoutFocused ? '#ffffff' : '#E50914'} />
              <Text style={[styles.logoutBtnText, { color: isLogoutFocused ? '#ffffff' : '#E50914' }]}>
                {t('profile.sign_out_tv') || 'Sign Out From TV App'}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050609',
    paddingTop: 40,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    paddingHorizontal: 60,
  },
  headerSubtitle: {
    color: '#888888',
    fontSize: 13,
    marginTop: 5,
    marginBottom: 30,
    paddingHorizontal: 60,
  },
  scrollContent: {
    paddingLeft: 60,
    paddingRight: 40,
    paddingBottom: 60,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#11131c',
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 35,
    gap: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#222533',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileDetails: {
    justifyContent: 'center',
  },
  userName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#888888',
    fontSize: 13,
    marginTop: 2,
  },
  googleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#db4437',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  googleBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 15,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  themeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  themeCircleActive: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  themeCircleFocused: {
    transform: [{ scale: 1.15 }],
    borderColor: '#ffffff',
    elevation: 4,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11131c',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    width: '50%',
  },
  toggleBtnFocused: {
    borderColor: '#ffffff',
    backgroundColor: '#1a1d2b',
    transform: [{ scale: 1.03 }],
  },
  toggleBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 6,
    borderWidth: 1.5,
    marginTop: 20,
    gap: 10,
    width: '50%',
  },
  logoutBtnFocused: {
    transform: [{ scale: 1.03 }],
    elevation: 4,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
