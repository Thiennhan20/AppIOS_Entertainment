import React, { useState } from 'react';
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
  AuthTextAction,
  AuthTextField,
} from '../../components/AuthScreenLayout';

export default function LoginScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '' });

  const showError = (title: string, message: string) => {
    setAlertConfig({ visible: true, title, message });
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const result = await googleLogin();
    setLoading(false);

    if (!result.success && !result.cancelled) {
      showError(
        t('auth.google_login_failed'),
        localizeAuthError(result.error, t, 'auth.google_login_failed')
      );
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showError(t('general.error'), t('auth.fill_email_password'));
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      showError(
        t('auth.login_failed'),
        localizeAuthError(result.error, t, 'auth.login_failed')
      );
    }
  };

  return (
    <>
      <AuthScreenLayout
        mode="login"
        navigation={navigation}
      >
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
          autoComplete="current-password"
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
          placeholder={t('auth.password')}
          returnKeyType="done"
          textContentType="password"
          value={password}
        />
        <AuthPrimaryButton label={t('auth.log_in')} loading={loading} onPress={handleLogin} />
        <AuthTextAction
          label={t('auth.forgot_password')}
          onPress={() => navigation.navigate('ForgotPassword')}
        />
        <AuthDivider label={t('auth.or')} />
        <AuthGoogleButton
          label={t('auth.continue_with_google')}
          loading={loading}
          onPress={handleGoogleLogin}
        />
        <AuthFooter
          action={t('auth.signup_now')}
          onPress={() => navigation.navigate('Register')}
          prompt={t('auth.no_account')}
        />
      </AuthScreenLayout>
      <CustomAlert
        confirmText={t('general.close')}
        iconName="alert-circle-outline"
        isError
        message={alertConfig.message}
        onClose={() => setAlertConfig((current) => ({ ...current, visible: false }))}
        title={alertConfig.title}
        visible={alertConfig.visible}
      />
    </>
  );
}
