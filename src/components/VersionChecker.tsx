import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, AppState, AppStateStatus, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { versionApi } from '../api/versionApi';

const EAS_PROJECT_ID = 'f88f7920-d54d-4f69-b06f-f97afbddf527';
const EAS_MAIN_BRANCH_ID = '019d0cc8-6a09-70ff-b66a-a5647482098b';
const EAS_UPDATE_QR_URL =
  `https://qr.expo.dev/eas-update?projectId=${EAS_PROJECT_ID}&branchId=${EAS_MAIN_BRANCH_ID}&slug=app_ios`;

interface VersionInfo {
  hash: string;
  message: string;
  date: number; // Unix timestamp
}

export default function VersionChecker() {
  const [serverVersion, setServerVersion] = useState<VersionInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [qrDownloadMessage, setQrDownloadMessage] = useState<string | null>(null);

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
    // Cứ để modal hiện chặn ở đó, bắt buộc user phải tắt app mở lại.
  };

  const handleDownloadQr = async () => {
    setIsDownloadingQr(true);
    setQrDownloadMessage(null);

    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setQrDownloadMessage('Thiết bị này không hỗ trợ lưu hoặc chia sẻ mã QR.');
        return;
      }

      const qrFile = new File(Paths.cache, 'ntn-update-qr.svg');
      const downloadedQr = await File.downloadFileAsync(EAS_UPDATE_QR_URL, qrFile, {
        idempotent: true,
      });

      await Sharing.shareAsync(downloadedQr.uri, {
        dialogTitle: 'Lưu mã QR cập nhật NTN',
        mimeType: 'image/svg+xml',
      });
      setQrDownloadMessage('Đã mở tuỳ chọn lưu hoặc chia sẻ mã QR.');
    } catch {
      setQrDownloadMessage('Không thể tải mã QR. Vui lòng thử lại.');
    } finally {
      setIsDownloadingQr(false);
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
              <Image
                contentFit="contain"
                source={{ uri: EAS_UPDATE_QR_URL }}
                style={styles.qrImage}
                transition={180}
              />
              <Text style={styles.qrTitle}>Quét mã QR nếu app chưa cập nhật</Text>
              <Text style={styles.qrDescription}>
                Lưu ý: trước khi quét, hãy xoá bản app_ios cũ trong NTN Development Build nếu đang lưu.
              </Text>
              <TouchableOpacity
                style={styles.downloadQrBtn}
                onPress={handleDownloadQr}
                activeOpacity={0.82}
                disabled={isDownloadingQr}
              >
                <Text style={styles.downloadQrText}>
                  {isDownloadingQr ? 'Đang chuẩn bị mã QR...' : 'Tải mã QR về máy'}
                </Text>
              </TouchableOpacity>
              {qrDownloadMessage && (
                <Text style={styles.downloadQrMessage}>{qrDownloadMessage}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleUpdate}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Đã hiểu, tôi sẽ đóng app và quét QR</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Expo Go không mở được bản cập nhật dùng runtime riêng của ứng dụng. Hãy cài NTN Development Build rồi quét mã.
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
  qrImage: {
    width: 148,
    height: 148,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
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
    borderColor: 'rgba(239,68,68,0.55)',
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  downloadQrText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  downloadQrMessage: {
    marginTop: 8,
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
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
