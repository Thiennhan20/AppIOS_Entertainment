import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// !! QUAN TRỌNG: ĐIỀN THÔNG TIN TÀI KHOẢN GITHUB VÀ TÊN REPO CỦA APP IOS VÀO ĐÂY !!
// Ví dụ: tài khoản 'nhannt22', repo 'ios-app'
const GITHUB_OWNER = 'Thiennhan20';
const GITHUB_REPO = 'AppIOS_Entertainment';

interface VersionInfo {
  hash: string;
  message: string;
  date: number; // Unix timestamp
}

export default function VersionChecker() {
  const [serverVersion, setServerVersion] = useState<VersionInfo | null>(null);
  const [showModal, setShowModal] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      // Chỉ dùng cho public repo. Nếu private repo, cần phải có header Authorization Bearer Token
      const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/main`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      
      const commitHash = data.sha;
      const commitMessage = data.commit.message;

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
        date: new Date(data.commit.author.date).getTime()
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

  if (!showModal || !serverVersion) return null;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.accentBar} />

          <View style={styles.body}>
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

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleUpdate}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Đã hiểu, tôi sẽ đóng app ＆ quét lại QR</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Vui lòng vuốt tắt app hoàn toàn và mở lại Expo Go để hoàn tất cập nhật.
            </Text>
          </View>
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
