import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEME_COLORS } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { themeColor, setThemeColor } = useTheme();
  const insets = useSafeAreaInsets();

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogoutPress = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    logout();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('general.profile')}</Text>
        </View>

      <View style={[styles.profileSection, { borderBottomColor: themeColor }]}>
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={[styles.avatar, { borderColor: themeColor }]} />
        ) : (
          <View style={[styles.avatarPlaceholder, { borderColor: themeColor }]}>
            <Text style={styles.avatarInitials}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{user?.name || 'User'}</Text>
        <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
        
        {user?.authType === 'google' && (
          <View style={styles.badge}>
            <Ionicons name="logo-google" size={12} color="#fff" style={{marginRight: 4}} />
            <Text style={styles.badgeText}>Google Account</Text>
          </View>
        )}
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SettingsScreen')}>
          <Ionicons name="settings-outline" size={24} color="#ccc" style={styles.menuIcon} />
          <Text style={styles.menuText}>{t('profile.account_settings')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('UserListScreen', { type: 'watchlist' })}
        >
          <Ionicons name="bookmark-outline" size={24} color="#ccc" style={styles.menuIcon} />
          <Text style={styles.menuText}>{t('profile.watchlist')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('UserListScreen', { type: 'history' })}
        >
          <Ionicons name="time-outline" size={24} color="#ccc" style={styles.menuIcon} />
          <Text style={styles.menuText}>{t('profile.watch_history')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('HelpScreen')}>
          <Ionicons name="help-circle-outline" size={24} color="#ccc" style={styles.menuIcon} />
          <Text style={styles.menuText}>{t('profile.help_support')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>

        {/* Theme Color Selector */}
        <View style={styles.themeSection}>
          <Text style={styles.themeTitle}>{t('profile.change_theme')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeScroll}>
            {THEME_COLORS.map((tc) => (
              <TouchableOpacity
                key={tc.id}
                onPress={() => setThemeColor(tc.color)}
                style={[
                  styles.colorCircle,
                  themeColor === tc.color && styles.colorCircleActive
                ]}
              >
                <LinearGradient
                  colors={(tc.gradient as [string, string]) || [tc.color, tc.color]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
                />
                {themeColor === tc.color && (
                  <Ionicons name="checkmark" size={18} color="#fff" style={{ zIndex: 10 }} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Language Toggle */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => {
            const newLang = t !== undefined && t('general.home') === 'Home' ? 'vi' : 'en';
            import('../../i18n').then(i18nModule => {
                i18nModule.default.changeLanguage(newLang);
            });
          }}
        >
          <Ionicons name="language-outline" size={24} color="#ccc" style={styles.menuIcon} />
          <Text style={styles.menuText}>
            {t !== undefined && t('general.home') === 'Home' ? 'Language (English)' : 'Ngôn ngữ (Tiếng Việt)'}
          </Text>
          <Ionicons name="swap-horizontal" size={20} color="#E50914" />
        </TouchableOpacity>

      </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { borderColor: themeColor, backgroundColor: `${themeColor}1A` }]} 
          onPress={handleLogoutPress}
        >
          <Text style={[styles.logoutText, { color: themeColor }]}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Logout Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setLogoutModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="log-out-outline" size={32} color="#E50914" />
                </View>
                <Text style={styles.modalTitle}>{t('profile.logout')}</Text>
                <Text style={styles.modalMessage}>Are you sure you want to log out?</Text>
                
                <View style={[styles.modalActions, { marginTop: 20 }]}>
                  <TouchableOpacity 
                    style={[styles.modalCancelBtn, { borderColor: themeColor }]} 
                    onPress={() => setLogoutModalVisible(false)}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: themeColor }]}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalConfirmBtn, { backgroundColor: themeColor }]} 
                    onPress={confirmLogout}
                  >
                    <Text style={styles.modalConfirmBtnText}>{t('profile.logout')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E50914',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E50914',
  },
  avatarInitials: {
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#db4437',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuSection: {
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#eee',
  },
  logoutButton: {
    margin: 20,
    marginTop: 'auto',
    marginBottom: 40,
    height: 54,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderWidth: 1,
    borderColor: '#E50914',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#E50914',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#E50914',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalConfirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  themeSection: {
    paddingVertical: 20,
    backgroundColor: '#1E1E1E',
    marginTop: 15,
    borderRadius: 12,
    marginHorizontal: 15,
  },
  themeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 15,
    marginBottom: 10,
  },
  themeScroll: {
    paddingHorizontal: 15,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  colorCircleActive: {
    borderColor: '#fff',
    transform: [{ scale: 1.15 }],
  },
});
