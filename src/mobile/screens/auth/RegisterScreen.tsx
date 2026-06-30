import React, { useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import CustomAlert from '../../components/CustomAlert';
import { localizeAuthError } from '../../../utils/authMessages';
import {
  AuthDivider,
  AuthFooter,
  AuthGoogleButton,
  AuthPasswordField,
  AuthPrimaryButton,
  AuthScreenLayout,
  AuthTextField,
} from '../../components/AuthScreenLayout';

const BANNED_WORDS = [
  // Vietnamese
  'cặc', 'cac', 'lồn', 'lon', 'địt', 'dit', 'đụ', 'du', 'đéo', 'deo',
  'đồ chó', 'thằng chó', 'con chó', 'con đĩ', 'đĩ', 'di~', 'đ\u0129',
  'mẹ mày', 'má mày', 'bố mày', 'cứt', 'cut',
  'dâm', 'ngu', 'đần', 'khốn nạn', 'khốn', 'chết mẹ', 'chết cha',
  'đồ ngu', 'thằng ngu', 'con ngu', 'vãi', 'vai~',
  'đồ khốn', 'thằng khốn', 'con khốn', 'đồ điên', 'thằng điên',
  'đồ chết', 'đồ rác', 'rác rưởi', 'súc vật', 'đồ súc vật',
  'chó má', 'đồ phản', 'phản bội', 'lừa đảo', 'đồ lừa',
  'dmm', 'dcm', 'vcl', 'vkl', 'vlone', 'clgt', 'cmnr', 'wtf',
  'dm', 'đm', 'cc', 'cl', 'ml', 'cmm',
  // English
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn',
  'dick', 'pussy', 'cock', 'cunt', 'whore', 'slut',
  'nigger', 'nigga', 'faggot', 'retard', 'motherfucker',
  'bullshit', 'jackass', 'dumbass', 'piss', 'crap',
  'stfu', 'gtfo', 'lmao', 'fk', 'fuk', 'fucker',
  'bitchy', 'slutty', 'horny', 'penis', 'vagina',
  'boob', 'porn', 'sex', 'nude', 'naked',
];

function containsProfanity(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return BANNED_WORDS.some((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s|[^a-zA-ZÀ-ỹ])${escaped}($|\\s|[^a-zA-ZÀ-ỹ])`, 'i');
    return regex.test(` ${normalized} `) || normalized === word;
  });
}

export default function RegisterScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { register, googleLogin } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    isError: false,
    goToLogin: false,
  });

  const showAlert = (title: string, message: string, isError: boolean, goToLogin = false) => {
    setAlertConfig({ visible: true, title, message, isError, goToLogin });
  };

  const showLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Login');
  };

  const closeAlert = () => {
    const shouldOpenLogin = alertConfig.goToLogin;
    setAlertConfig((current) => ({ ...current, visible: false }));
    if (shouldOpenLogin) showLogin();
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const result = await googleLogin();
    setLoading(false);

    if (!result.success && !result.cancelled) {
      showAlert(
        t('auth.google_login_failed'),
        localizeAuthError(result.error, t, 'auth.google_login_failed'),
        true
      );
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      showAlert(t('general.error'), t('auth.fill_all_info'), true);
      return;
    }
    if (name.length > 20) {
      showAlert(t('general.error'), t('auth.max_length_error'), true);
      return;
    }
    if (containsProfanity(name)) {
      showAlert(t('general.error'), t('auth.profanity_error'), true);
      return;
    }
    if (password.length < 6) {
      showAlert(t('general.error'), t('auth.password_length'), true);
      return;
    }

    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);

    if (result.success) {
      showAlert(t('general.success'), t('auth.check_email_verify'), false, true);
    } else {
      showAlert(
        t('auth.signup_failed'),
        localizeAuthError(result.error, t, 'auth.signup_failed'),
        true
      );
    }
  };

  return (
    <>
      <AuthScreenLayout
        mode="register"
        navigation={navigation}
      >
        <AuthTextField
          autoCapitalize="words"
          autoComplete="name"
          icon="person-outline"
          maxLength={20}
          onChangeText={setName}
          placeholder={t('auth.username')}
          returnKeyType="next"
          textContentType="name"
          value={name}
          rightAction={
            <Text style={{ color: name.length >= 20 ? '#E50914' : '#818796', fontSize: 12, marginRight: 5 }}>
              {name.length}/20
            </Text>
          }
        />
        <AuthTextField
          autoCapitalize="none"
          autoComplete="email"
          icon="mail-outline"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          returnKeyType="next"
          textContentType="emailAddress"
          value={email}
        />
        <AuthPasswordField
          autoComplete="new-password"
          onChangeText={setPassword}
          onSubmitEditing={handleRegister}
          placeholder={t('auth.password')}
          returnKeyType="done"
          textContentType="newPassword"
          value={password}
        />
        <AuthPrimaryButton label={t('auth.sign_up')} loading={loading} onPress={handleRegister} />
        <AuthDivider label={t('auth.or')} />
        <AuthGoogleButton
          label={t('auth.continue_with_google')}
          loading={loading}
          onPress={handleGoogleLogin}
        />
        <AuthFooter
          action={t('auth.login_now')}
          onPress={showLogin}
          prompt={t('auth.already_have_account')}
        />
      </AuthScreenLayout>
      <CustomAlert
        confirmText={alertConfig.goToLogin ? t('auth.login_now') : t('general.close')}
        iconName={alertConfig.isError ? 'alert-circle-outline' : 'checkmark-circle-outline'}
        isError={alertConfig.isError}
        message={alertConfig.message}
        onClose={closeAlert}
        title={alertConfig.title}
        visible={alertConfig.visible}
      />
    </>
  );
}
