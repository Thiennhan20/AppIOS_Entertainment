import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = '3001';

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, '');
}

function getExpoHostBaseUrl() {
  const constants = Constants as any;
  const hostUri =
    Constants.expoConfig?.hostUri ||
    constants.manifest2?.extra?.expoClient?.hostUri ||
    constants.manifest?.debuggerHost ||
    constants.manifest?.hostUri;

  if (!hostUri || typeof hostUri !== 'string') return null;

  const host = hostUri
    .replace(/^https?:\/\//, '')
    .replace(/^exp:\/\//, '')
    .split('/')[0]
    .split(':')[0];

  if (!host || host === 'localhost' || host === '127.0.0.1') return null;

  return `http://${host}:${API_PORT}`;
}

const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const expoHostBaseUrl = getExpoHostBaseUrl();
const platformLocalBaseUrl = Platform.OS === 'android'
  ? `http://10.0.2.2:${API_PORT}`
  : `http://localhost:${API_PORT}`;
const shouldAutoResolveLocal = !rawApiBaseUrl || rawApiBaseUrl === 'local' || rawApiBaseUrl === 'auto';
const apiBaseUrl = normalizeBaseUrl(
  shouldAutoResolveLocal
    ? (expoHostBaseUrl || platformLocalBaseUrl)
    : rawApiBaseUrl,
);

// In production (EAS update), no fallback candidates — only use the configured URL
const apiBaseUrlCandidates = shouldAutoResolveLocal
  ? Array.from(new Set([
      apiBaseUrl,
      expoHostBaseUrl,
      platformLocalBaseUrl,
      `http://localhost:${API_PORT}`,
      `http://127.0.0.1:${API_PORT}`,
    ].filter(Boolean).map((v) => normalizeBaseUrl(v as string))))
  : [apiBaseUrl];

if (__DEV__) {
  const apiBaseSource = shouldAutoResolveLocal
    ? (expoHostBaseUrl ? 'expo-host' : 'platform-local')
    : 'env';
  console.log(`[CONFIG] API server (${apiBaseSource}): ${apiBaseUrl}`);
}

export const CONFIG = {
  API_BASE_URL: apiBaseUrl,
  API_BASE_URL_CANDIDATES: apiBaseUrlCandidates,
};

