import React from 'react';
import { 
  StyleSheet, Text, View, Modal, TouchableOpacity, TouchableWithoutFeedback 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  isError?: boolean;
}

export default function CustomAlert({
  visible,
  title,
  message,
  onClose,
  onConfirm,
  confirmText,
  cancelText,
  iconName,
  isError = false,
}: CustomAlertProps) {
  const { t } = useTranslation();
  const { themeColor } = useTheme();

  const mainColor = isError ? '#E50914' : themeColor;
  const defaultIcon = isError ? 'alert-circle-outline' : 'information-circle-outline';
  const finalIcon = iconName || defaultIcon;
  const confirmLabel = confirmText || t('general.close');
  const cancelLabel = cancelText || t('general.cancel');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              
              <View style={styles.titleRow}>
                <Ionicons name={finalIcon} size={24} color={mainColor} />
                <Text style={styles.modalTitle}>{title}</Text>
              </View>
              
              {message ? (
                <Text style={styles.modalMessage}>{message}</Text>
              ) : null}
              
              <View style={[styles.modalActions, { marginTop: 20 }]}>
                {onConfirm && (
                  <TouchableOpacity 
                    style={[styles.modalCancelBtn, { borderColor: themeColor }]} 
                    onPress={onClose}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: themeColor }]}>
                      {cancelLabel}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.modalConfirmBtn, { backgroundColor: mainColor, marginLeft: onConfirm ? 8 : 0 }]} 
                  onPress={onConfirm ? onConfirm : onClose}
                >
                  <Text style={styles.modalConfirmBtnText}>
                    {confirmLabel}
                  </Text>
                </TouchableOpacity>
              </View>
              
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#14161C',
    width: '86%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#272B35',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'center',
    width: '100%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalMessage: {
    color: '#B3B8C4',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  modalCancelBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#1C2028',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
