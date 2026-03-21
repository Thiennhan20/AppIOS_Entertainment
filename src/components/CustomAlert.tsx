import React from 'react';
import { 
  StyleSheet, Text, View, Modal, TouchableOpacity, TouchableWithoutFeedback 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

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
  confirmText = 'OK',
  cancelText = 'Cancel',
  iconName,
  isError = false,
}: CustomAlertProps) {
  const { themeColor } = useTheme();

  const mainColor = isError ? '#E50914' : themeColor;
  const defaultIcon = isError ? 'alert-circle-outline' : 'information-circle-outline';
  const finalIcon = iconName || defaultIcon;

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
              
              <View style={[styles.modalIconContainer, { backgroundColor: `${mainColor}1A` }]}>
                <Ionicons name={finalIcon} size={32} color={mainColor} />
              </View>
              
              <Text style={styles.modalTitle}>{title}</Text>
              
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
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.modalConfirmBtn, { backgroundColor: mainColor, marginLeft: onConfirm ? 8 : 0 }]} 
                  onPress={onConfirm ? onConfirm : onClose}
                >
                  <Text style={styles.modalConfirmBtnText}>
                    {confirmText}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30, // Reduced from 20 to ensure it's not too wide like full width modals
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    color: '#aaa',
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
    height: 48,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
