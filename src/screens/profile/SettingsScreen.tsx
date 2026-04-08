import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Animated, Easing, ActivityIndicator, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import CustomAlert from '../../components/CustomAlert';

export default function SettingsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const { themeColor } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    isError: false,
    iconName: undefined as any,
    onClose: () => {}
  });

  const currentAvatarUrl = avatarBase64 ? `data:image/jpeg;base64,${avatarBase64}` : (user?.avatar || null);

  const showAlert = (title: string, message: string, isError = false, onSuccess?: () => void) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      isError,
      iconName: isError ? 'alert-circle' : 'checkmark-circle',
      onClose: () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        if (onSuccess) onSuccess();
      }
    });
  };

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.poly(3)),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert(t('general.error') || 'Error', t('profile.enter_name') || 'Please enter username', true);
      return;
    }

    setSaving(true);
    
    const data: any = { name };
    if (avatarBase64) {
      data.avatar = `data:image/jpeg;base64,${avatarBase64}`;
    }

    const res = await updateProfile(data);
    setSaving(false);

    if (res.success) {
      showAlert(
        t('general.success') || 'Success', 
        t('profile.account_updated') || 'Profile updated successfully!', 
        false, 
        () => navigation.goBack()
      );
    } else {
      showAlert(t('general.error') || 'Error', res.error || 'Failed to update profile!', true);
    }
  };

  const handleChangeAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert(
          t('general.error') || 'Error', 
          t('profile.permission_needed') || 'Sorry, we need camera roll permissions to make this work!', 
          true
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Str = asset.base64;
        
        let sizeInBytes = asset.fileSize;
        if (!sizeInBytes && base64Str) {
          sizeInBytes = (base64Str.length * 3) / 4;
        }

        if (sizeInBytes && sizeInBytes > 5 * 1024 * 1024) {
          showAlert(t('general.error') || 'Error', t('profile.file_too_large') || 'Image size must be less than 5MB', true);
          return;
        }

        if (base64Str) {
          setAvatarBase64(base64Str);
        }
      }
    } catch (error) {
      console.log('Error choosing avatar', error);
      showAlert(t('general.error') || 'Error', t('profile.error_choosing_image') || 'Error choosing image', true);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.account_settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.ScrollView 
        contentContainerStyle={styles.content}
        style={{ opacity: fadeAnim, transform: [{ translateY }] }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarWrap}>
          {currentAvatarUrl ? (
            <Image 
              source={{ uri: currentAvatarUrl }} 
              style={[styles.avatarImage, { borderColor: themeColor }]} 
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { borderColor: themeColor, backgroundColor: `${themeColor}22` }]}>
              <Text style={[styles.avatarInitials, { color: themeColor }]}>
                {name.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <TouchableOpacity 
            style={[styles.editBadge, { backgroundColor: themeColor }]}
            onPress={handleChangeAvatar}
          >
            <Ionicons name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('profile.username_label') || 'Username'}</Text>
        <TextInput 
          style={[styles.input, { borderColor: 'rgba(255,255,255,0.1)' }]} 
          value={name}
          onChangeText={setName}
          placeholder={t('profile.enter_name')}
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>{t('profile.email_google_label') || 'Email (Account Google)'}</Text>
        <TextInput 
          style={[styles.input, styles.disabledInput]} 
          value={email}
          editable={false}
          placeholderTextColor="#666"
        />
        <Text style={styles.helpText}>{t('profile.email_linked')}</Text>

      </Animated.ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: themeColor }]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{t('profile.save_changes')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={alertConfig.onClose}
        isError={alertConfig.isError}
        iconName={alertConfig.iconName}
      />
    </KeyboardAvoidingView>
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
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f0f13',
  },
  label: { color: '#bbb', fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 20,
    borderWidth: 1,
  },
  disabledInput: {
    backgroundColor: '#151515',
    color: '#777',
    borderColor: 'transparent',
    marginBottom: 6,
  },
  helpText: {
    color: '#666',
    fontSize: 11,
    marginLeft: 4,
    marginBottom: 20,
  },
  footer: {
    paddingInline: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
