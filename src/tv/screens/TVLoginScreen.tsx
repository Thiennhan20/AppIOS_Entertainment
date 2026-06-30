import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { localizeAuthError } from '../../utils/authMessages';

interface TVLoginScreenProps {
  navigation: any;
}

export default function TVLoginScreen({ navigation }: TVLoginScreenProps) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { themeColor } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true); // Default to true (plain text) to prevent TV IME keyboard crash
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isEyeFocused, setIsEyeFocused] = useState(false);
  const [isLoginBtnFocused, setIsLoginBtnFocused] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg(t('auth.fill_email_password') || 'Please fill in both email and password.');
      return;
    }
    
    setErrorMsg('');
    setLoading(true);

    try {
      const result = await login(trimmedEmail, password);
      if (!result.success) {
        setErrorMsg(localizeAuthError(result.error, t, 'auth.login_failed'));
      }
    } catch (e) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Left Branding Side */}
      <View style={[styles.brandingColumn, { backgroundColor: '#090a0f' }]}>
        <Image
          source={require('../../../assets/favicon.png')}
          style={styles.logoImage}
          contentFit="contain"
        />
        <Text style={styles.logoText}>
          NTN<Text style={{ color: themeColor }}>TV</Text>
        </Text>
        <Text style={styles.brandingDesc}>
          Enjoy unlimited movies and TV series right on your TV.
        </Text>
      </View>

      {/* Right Login Form Side */}
      <View style={styles.formColumn}>
        <Text style={styles.loginTitle}>{t('auth.log_in') || 'Log In'}</Text>
        <Text style={styles.loginSubtitle}>Access your watchlist and sync your recently watched movies.</Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#E50914" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {/* Email input wrapper */}
          <View style={[styles.inputContainer, isEmailFocused && { borderColor: themeColor, backgroundColor: '#1a1d2b' }]}>
            <Ionicons name="mail-outline" size={18} color={isEmailFocused ? themeColor : '#666666'} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="#555555"
              autoCapitalize="none"
              keyboardType="email-address"
              focusable={true}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
            />
          </View>

          {/* Password input wrapper */}
          <View style={[styles.inputContainer, isPasswordFocused && { borderColor: themeColor, backgroundColor: '#1a1d2b' }]}>
            <Ionicons name="lock-closed-outline" size={18} color={isPasswordFocused ? themeColor : '#666666'} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.password') || 'Password'}
              placeholderTextColor="#555555"
              secureTextEntry={!showPassword}
              focusable={true}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              onFocus={() => setIsEyeFocused(true)}
              onBlur={() => setIsEyeFocused(false)}
              style={() => [
                styles.eyeBtn,
                isEyeFocused && styles.eyeBtnFocused
              ]}
              focusable={true}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={18} 
                color="#888888" 
              />
            </Pressable>
          </View>

          {/* Login Action Button */}
          <Pressable
            onPress={handleLogin}
            onFocus={() => setIsLoginBtnFocused(true)}
            onBlur={() => setIsLoginBtnFocused(false)}
            style={() => [
              styles.loginBtn,
              { backgroundColor: isLoginBtnFocused ? themeColor : 'rgba(255,255,255,0.05)' },
              isLoginBtnFocused && styles.loginBtnFocused
            ]}
            focusable={true}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>{t('auth.log_in') || 'Login'}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050609',
    flexDirection: 'row',
  },
  brandingColumn: {
    width: '40%',
    padding: 50,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#11131c',
  },
  logoImage: {
    width: 32,
    height: 32,
    marginBottom: 12,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 20,
  },
  brandingDesc: {
    color: '#888888',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  formColumn: {
    flex: 1,
    padding: 60,
    justifyContent: 'center',
  },
  loginTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  loginSubtitle: {
    color: '#888888',
    fontSize: 13,
    marginTop: 5,
    marginBottom: 30,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 9, 20, 0.3)',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: '600',
  },
  form: {
    gap: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11131c',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#222533',
    paddingHorizontal: 15,
    height: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  loginBtn: {
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 15,
  },
  loginBtnFocused: {
    transform: [{ scale: 1.03 }],
    borderColor: '#ffffff',
    elevation: 4,
  },
  eyeBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    marginLeft: 10,
  },
  eyeBtnFocused: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    transform: [{ scale: 1.05 }],
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
