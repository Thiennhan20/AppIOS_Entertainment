import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ActivityIndicator, Alert, AppState, AppStateStatus, BackHandler, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { versionApi } from '../../api/versionApi';

const EAS_PROJECT_ID = 'f88f7920-d54d-4f69-b06f-f97afbddf527';
const EAS_EXPO_GO_GROUP_ID = 'dd54f627-ce63-4fad-9cb6-6bdebed09624';
const EAS_UPDATE_QR_URL =
  `https://qr.expo.dev/eas-update?projectId=${EAS_PROJECT_ID}&groupId=${EAS_EXPO_GO_GROUP_ID}`;

interface VersionInfo {
  hash: string;
  message: string;
  date: number; // Unix timestamp
}

type QrDownloadStatus = 'idle' | 'loading' | 'success' | 'error';

export default function VersionChecker() {
  const [serverVersion, setServerVersion] = useState<VersionInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [qrDownloadStatus, setQrDownloadStatus] = useState<QrDownloadStatus>('idle');
  const [qrDownloadMessage, setQrDownloadMessage] = useState<string | null>(null);
  const [isQrReady, setIsQrReady] = useState(false);
  const qrCaptureRef = useRef<View | null>(null);

  const checkVersion = useCallback(async () => {
    try {
      const latestVersion = await versionApi.getLatest();
      if (!latestVersion) return;

      const commitHash = latestVersion.hash;
      const commitMessage = latestVersion.message;

      // Đọc mã hash cũ đã lưu trong máy
      const notified = await AsyncStorage.getItem('notified_hash');
      
      // Nếu là lần ĐẦU TIÊN tải app về (hoặc clear data), lấy mã hiện tại trên github làm mốc (Baseline) để không làm phiền user
      if (!notified) {
        await AsyncStorage.setItem('notified_hash', commitHash);
        return;
      }

      // Nếu mã đã lưu giống mã mới nhất -> Dẹp, không báo
      if (notified === commitHash) return;

      setServerVersion({
        hash: commitHash,
        message: commitMessage,
        date: new Date(latestVersion.createdAt).getTime()
      });
      setQrDownloadStatus('idle');
      setQrDownloadMessage(null);
      setShowModal(true);
    } catch {
      // Fail silently
    }
  }, []);

  useEffect(() => {
    const initTimeout = setTimeout(checkVersion, 5000);

    const onAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') checkVersion();
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      clearTimeout(initTimeout);
      sub.remove();
    };
  }, [checkVersion]);

  const handleUpdate = async () => {
    if (serverVersion) {
      await AsyncStorage.setItem('notified_hash', serverVersion.hash);
    }

    setShowModal(false);

    if (Platform.OS === 'android') {
      setTimeout(() => BackHandler.exitApp(), 100);
      return;
    }

    Alert.alert(
      'Đóng ứng dụng để cập nhật',
      'iPhone không cho phép ứng dụng tự đóng. Hãy vuốt đóng Expo Go, sau đó quét mã QR đã lưu.'
    );
  };

  const handleDownloadQr = async () => {
    setQrDownloadStatus('loading');
    setQrDownloadMessage(null);

    try {
      if (!qrCaptureRef.current || !isQrReady) {
        setQrDownloadStatus('error');
        setQrDownloadMessage('Mã QR chưa tải xong. Vui lòng thử lại sau vài giây.');
        return;
      }

      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        setQrDownloadStatus('error');
        setQrDownloadMessage('Cần cấp quyền lưu ảnh để tải mã QR về máy.');
        return;
      }

      const qrImageUri = await captureRef(qrCaptureRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      await MediaLibrary.saveToLibraryAsync(qrImageUri);
      setQrDownloadStatus('success');
      setQrDownloadMessage('Đã lưu mã QR vào thư viện ảnh.');
    } catch {
      setQrDownloadStatus('error');
      setQrDownloadMessage('Không thể tải mã QR. Vui lòng thử lại.');
    }
  };

  if (!showModal || !serverVersion) return null;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.accentBar} />

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>⚡ BẢN CẬP NHẬT BẮT BUỘC</Text>
            </View>

            <Text style={styles.title}>Đã có phiên bản App mới</Text>

            <Text style={styles.description}>
              Hệ thống yêu cầu khởi động lại ứng dụng để cập nhật code mới nhất.
            </Text>

            <View style={styles.versionRow}>
              <View style={styles.versionPill}>
                <Text style={styles.versionTextOld}>Current</Text>
              </View>
              <Text style={{ color: '#6b7280', fontSize: 16 }}>→</Text>
              <View style={[styles.versionPill, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <Text style={styles.versionTextNew}>#{serverVersion.hash.substring(0, 7)}</Text>
              </View>
            </View>

            {serverVersion.message && (
              <View style={styles.changelog}>
                <Text style={styles.changelogTitle}>LÝ DO CẬP NHẬT:</Text>
                <View style={styles.changelogItem}>
                  <View style={styles.dot} />
                  <Text style={styles.changelogText}>{serverVersion.message}</Text>
                </View>
              </View>
            )}

            <View style={styles.qrContainer}>
              <View ref={qrCaptureRef} collapsable={false} style={styles.qrImageFrame}>
                <Image
                  contentFit="contain"
                  source={{ uri: EAS_UPDATE_QR_URL }}
                  style={styles.qrImage}
                  transition={180}
                  onLoad={() => setIsQrReady(true)}
                  onError={() => setIsQrReady(false)}
                />
              </View>
              <Text style={styles.qrTitle}>Quét mã QR nếu app chưa cập nhật</Text>
              <Text style={styles.qrDescription}>
                Lưu ý: trước khi quét QR, hãy xoá bản app_ios cũ trong Expo Go nếu đang lưu.
              </Text>
              <TouchableOpacity
                style={[
                  styles.downloadQrBtn,
                  qrDownloadStatus === 'loading' && styles.downloadQrBtnLoading,
                  qrDownloadStatus === 'success' && styles.downloadQrBtnSuccess,
                  qrDownloadStatus === 'error' && styles.downloadQrBtnError,
                ]}
                onPress={handleDownloadQr}
                activeOpacity={0.82}
                disabled={qrDownloadStatus === 'loading'}
              >
                {qrDownloadStatus === 'loading' && (
                  <ActivityIndicator size="small" color="#ffffff" style={styles.downloadQrSpinner} />
                )}
                <Text style={styles.downloadQrText}>
                  {qrDownloadStatus === 'loading' ? 'Đang lưu mã QR...' : 'Tải mã QR về máy'}
                </Text>
              </TouchableOpacity>
              {qrDownloadMessage && (
                <View style={styles.downloadQrMessageRow}>
                  <Text
                    style={[
                      styles.downloadQrMessageIcon,
                      qrDownloadStatus === 'success' ? styles.downloadQrSuccessText : styles.downloadQrErrorText,
                    ]}
                  >
                    {qrDownloadStatus === 'success' ? '\u2713' : 'X'}
                  </Text>
                  <Text
                    style={[
                      styles.downloadQrMessage,
                      qrDownloadStatus === 'success' ? styles.downloadQrSuccessText : styles.downloadQrErrorText,
                    ]}
                  >
                    {qrDownloadMessage}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleUpdate}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>
                {Platform.OS === 'android' ? 'Đã hiểu, đóng app và quét QR' : 'Đã hiểu, ẩn thông báo và quét QR'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Hãy dùng Expo Go hỗ trợ SDK 54 và kết nối mạng ổn định để tải bản cập nhật.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '92%',
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  accentBar: {
    height: 4,
    width: '100%',
    backgroundColor: '#ef4444',
  },
  body: {
    padding: 24,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: '#ef4444',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#ef4444',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 19,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  versionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  versionTextOld: {
    color: '#9ca3af',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  versionTextNew: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#ef4444',
  },
  changelog: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  changelogTitle: {
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  changelogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    backgroundColor: '#ef4444',
  },
  changelogText: {
    color: '#d1d5db',
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  qrContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  qrImageFrame: {
    width: 148,
    height: 148,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrTitle: {
    color: '#f3f4f6',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  qrDescription: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  downloadQrBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadQrBtnLoading: {
    backgroundColor: '#1f2937',
  },
  downloadQrBtnSuccess: {
    borderColor: '#22c55e',
    backgroundColor: '#16a34a',
  },
  downloadQrBtnError: {
    borderColor: '#ef4444',
    backgroundColor: '#dc2626',
  },
  downloadQrText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  downloadQrSpinner: {
    marginRight: 8,
  },
  downloadQrMessageRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadQrMessageIcon: {
    fontSize: 12,
    fontWeight: '800',
    marginRight: 5,
  },
  downloadQrMessage: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  downloadQrSuccessText: {
    color: '#22c55e',
  },
  downloadQrErrorText: {
    color: '#ef4444',
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ef4444',
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
