import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/authApi';
import CustomAlert from '../../components/CustomAlert';
import { localizeAuthError } from '../../utils/authMessages';
import {
  AuthFooter,
  AuthPrimaryButton,
  AuthScreenLayout,
  AuthTextField,
} from '../../components/AuthScreenLayout';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '' });

  const showError = (message: string) => {
    setAlertConfig({ visible: true, title: t('general.error'), message });
  };

  const showLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Login');
  };

  const handleReset = async () => {
    if (!email) {
      showError(t('auth.enter_email'));
      return;
    }

    try {
      setLoading(true);
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (error: any) {
      showError(localizeAuthError(error.response?.data?.message, t, 'auth.error_sending_request'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthScreenLayout
        heading={t('auth.forgot_password')}
        mode="forgot"
        navigation={navigation}
        subtitle={!success ? t('auth.enter_registered_email') : undefined}
      >
        {success ? (
          <View style={styles.success}>
            <Ionicons name="checkmark-circle" size={52} color="#35C46A" style={styles.successIcon} />
            <Text style={styles.successText}>{t('auth.recovery_sent')}</Text>
            <AuthPrimaryButton
              label={t('auth.back_to_login')}
              loading={false}
              onPress={showLogin}
            />
          </View>
        ) : (
          <>
            <AuthTextField
              autoCapitalize="none"
              autoComplete="email"
              icon="mail-outline"
              keyboardType="email-address"
              onChangeText={setEmail}
              onSubmitEditing={handleReset}
              placeholder="Email"
              returnKeyType="send"
              textContentType="emailAddress"
              value={email}
            />
            <AuthPrimaryButton
              label={t('auth.send_recovery_link')}
              loading={loading}
              onPress={handleReset}
            />
            <AuthFooter
              action={t('auth.back_to_login')}
              onPress={showLogin}
              prompt={t('auth.remembered_password')}
            />
          </>
        )}
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

const styles = StyleSheet.create({
  success: {
    width: '100%',
  },
  successIcon: {
    alignSelf: 'center',
    marginBottom: 15,
  },
  successText: {
    color: '#CFD3DB',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    textAlign: 'center',
  },
});
