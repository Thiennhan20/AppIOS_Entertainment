import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

type AuthMode = 'login' | 'register' | 'forgot';

type AuthNavigation = {
  navigate: (screen: string) => void;
  goBack?: () => void;
  canGoBack?: () => boolean;
};

type AuthScreenLayoutProps = {
  mode: AuthMode;
  navigation: AuthNavigation;
  children: ReactNode;
  heading?: string;
  subtitle?: string;
};

type AuthTextFieldProps = TextInputProps & {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  rightAction?: ReactNode;
};

type AuthPasswordFieldProps = Omit<AuthTextFieldProps, 'icon' | 'secureTextEntry' | 'rightAction'>;

export function AuthScreenLayout({
  mode,
  navigation,
  children,
  heading,
  subtitle,
}: AuthScreenLayoutProps) {
  const { t } = useTranslation();
  const { themeColor } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const entrance = useRef(new Animated.Value(0)).current;
  const compact = height < 700;
  const activeTextColor = getReadableTextColor(themeColor);

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const showScreen = (nextMode: AuthMode) => {
    if (nextMode === mode) return;
    if (nextMode === 'login' && navigation.canGoBack?.()) {
      navigation.goBack?.();
      return;
    }
    navigation.navigate(nextMode === 'login' ? 'Login' : 'Register');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <LinearGradient colors={['#050609', '#13070A', '#050507']} style={styles.background}>
        <View pointerEvents="none" style={[styles.glowTop, { backgroundColor: themeColor }]} />
        <View pointerEvents="none" style={[styles.glowBottom, { backgroundColor: themeColor }]} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                minHeight: Math.max(height - insets.top - insets.bottom, 0),
                paddingTop: Math.max(insets.top, 12) + (compact ? 10 : 22),
                paddingBottom: Math.max(insets.bottom, 12) + (compact ? 10 : 22),
                paddingHorizontal: width < 360 ? 16 : 24,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                  transform: [
                    {
                      translateY: entrance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [6, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.brand, compact && styles.brandCompact]}>
                <Text style={[styles.brandText, { color: themeColor }]}>NTN</Text>
                <Text style={styles.brandCaption}>ENTERTAINMENT</Text>
              </View>

              <View style={[styles.card, compact && styles.cardCompact]}>
                {mode !== 'forgot' ? (
                  <View style={styles.modeSwitch}>
                    <AuthModeButton
                      active={mode === 'login'}
                      color={themeColor}
                      label={t('auth.log_in')}
                      onPress={() => showScreen('login')}
                      textColor={activeTextColor}
                    />
                    <AuthModeButton
                      active={mode === 'register'}
                      color={themeColor}
                      label={t('auth.sign_up')}
                      onPress={() => showScreen('register')}
                      textColor={activeTextColor}
                    />
                  </View>
                ) : null}

                {heading ? <Text style={styles.heading}>{heading}</Text> : null}
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

                <View
                  style={[
                    styles.form,
                    heading && styles.formWithHeading,
                    compact && styles.formCompact,
                  ]}
                >
                  {children}
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

function AuthModeButton({
  active,
  color,
  label,
  onPress,
  textColor,
}: {
  active: boolean;
  color: string;
  label: string;
  onPress: () => void;
  textColor: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.modeButton, active && { backgroundColor: color }]}
    >
      <Text style={[styles.modeButtonText, active && { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AuthTextField({ icon, rightAction, onFocus, onBlur, ...props }: AuthTextFieldProps) {
  const { themeColor } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.field, focused && { borderColor: themeColor }]}>
      <Ionicons name={icon} size={19} color={focused ? themeColor : '#818796'} style={styles.fieldIcon} />
      <TextInput
        {...props}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        placeholderTextColor="#747B8A"
        selectionColor={themeColor}
        style={styles.input}
      />
      {rightAction}
    </View>
  );
}

export function AuthPasswordField(props: AuthPasswordFieldProps) {
  const [hidden, setHidden] = useState(true);

  return (
    <AuthTextField
      {...props}
      icon="lock-closed-outline"
      secureTextEntry={hidden}
      rightAction={
        <TouchableOpacity
          accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          accessibilityRole="button"
          activeOpacity={0.7}
          hitSlop={10}
          onPress={() => setHidden((current) => !current)}
          style={styles.iconButton}
        >
          <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9DA3AF" />
        </TouchableOpacity>
      }
    />
  );
}

export function AuthPrimaryButton({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  const { themeGradient } = useTheme();
  const colors: [string, string] = [themeGradient[0], themeGradient[1]];
  const contentColor = getReadableTextColor(themeGradient[0]);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
    >
      <LinearGradient colors={colors} style={styles.primaryButton}>
        {loading ? (
          <ActivityIndicator color={contentColor} />
        ) : (
          <Text style={[styles.primaryButtonText, { color: contentColor }]}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function AuthGoogleButton({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={[styles.googleButton, loading && styles.buttonDisabled]}
    >
      <View style={styles.googleIcon}>
        <Ionicons name="logo-google" size={17} color="#FFFFFF" />
      </View>
      <Text style={styles.googleButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function AuthTextAction({ label, onPress }: { label: string; onPress: () => void }) {
  const { themeColor } = useTheme();

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.textAction}>
      <Text style={[styles.textActionLabel, { color: themeColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AuthFooter({
  prompt,
  action,
  onPress,
}: {
  prompt: string;
  action: string;
  onPress: () => void;
}) {
  const { themeColor } = useTheme();

  return (
    <View style={styles.footer}>
      <Text style={styles.footerPrompt}>{prompt}</Text>
      <TouchableOpacity activeOpacity={0.72} onPress={onPress} style={styles.footerAction}>
        <Text style={[styles.footerActionText, { color: themeColor }]}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}

function getReadableTextColor(backgroundColor: string) {
  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) return '#FFFFFF';

  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 155 ? '#090A0D' : '#FFFFFF';
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  background: {
    flex: 1,
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: -145,
    right: -120,
    width: 300,
    height: 300,
    borderRadius: 160,
    opacity: 0.12,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -185,
    left: -135,
    width: 330,
    height: 330,
    borderRadius: 180,
    opacity: 0.07,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandCompact: {
    marginBottom: 16,
  },
  brandText: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 4,
  },
  brandCaption: {
    color: '#8A91A0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3.4,
    marginTop: 2,
  },
  card: {
    backgroundColor: 'rgba(18, 19, 24, 0.94)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
  },
  cardCompact: {
    borderRadius: 24,
    padding: 18,
  },
  modeSwitch: {
    backgroundColor: '#090A0D',
    borderRadius: 14,
    flexDirection: 'row',
    marginBottom: 23,
    padding: 4,
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: 11,
    flex: 1,
    height: 43,
    justifyContent: 'center',
  },
  modeButtonText: {
    color: '#959AA6',
    fontSize: 14,
    fontWeight: '700',
  },
  heading: {
    color: '#F7F8FA',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.35,
    marginBottom: 7,
  },
  subtitle: {
    color: '#9197A5',
    fontSize: 13,
    lineHeight: 20,
  },
  form: {
    marginTop: 4,
  },
  formWithHeading: {
    marginTop: 20,
  },
  formCompact: {
    marginTop: 2,
  },
  field: {
    alignItems: 'center',
    backgroundColor: '#090A0E',
    borderColor: '#242832',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    height: 54,
    marginBottom: 12,
    paddingHorizontal: 15,
  },
  fieldIcon: {
    marginRight: 11,
  },
  input: {
    color: '#F3F4F6',
    flex: 1,
    fontSize: 15,
    height: '100%',
    paddingVertical: 0,
  },
  iconButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    marginLeft: 8,
    width: 34,
  },
  buttonWrapper: {
    borderRadius: 14,
    marginTop: 6,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.62,
  },
  primaryButton: {
    alignItems: 'center',
    height: 54,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  textAction: {
    alignSelf: 'flex-end',
    paddingVertical: 15,
  },
  textActionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 17,
    marginTop: 8,
  },
  dividerLine: {
    backgroundColor: '#282B34',
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    color: '#727988',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 15,
    textTransform: 'uppercase',
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: '#16181D',
    borderColor: '#292D36',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    height: 54,
    justifyContent: 'center',
  },
  googleIcon: {
    alignItems: 'center',
    backgroundColor: '#222631',
    borderRadius: 10,
    height: 31,
    justifyContent: 'center',
    marginRight: 12,
    width: 31,
  },
  googleButtonText: {
    color: '#E9EBEF',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerPrompt: {
    color: '#9096A4',
    fontSize: 13,
  },
  footerAction: {
    marginLeft: 6,
    paddingVertical: 5,
  },
  footerActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
