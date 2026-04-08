import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Text, View, ScrollView,
  TouchableOpacity, Animated, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { menuStyles as ms } from './homeStyles';

export default function SideMenu({
  visible,
  onClose,
  insets,
  navigation,
}: {
  visible: boolean;
  onClose: () => void;
  insets: any;
  navigation: any;
}) {
  const { t } = useTranslation();
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim  = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, friction: 20, tension: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  const { themeColor } = useTheme();

  if (!visible) return null;

  const NavItem = ({ icon, label, active = false, onPress, chevron = false, expanded = false }: any) => (
    <TouchableOpacity
      style={[
        ms.navItem, 
        active && { backgroundColor: `${themeColor}24`, borderLeftWidth: 2, borderLeftColor: themeColor }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={15} color={active ? '#fff' : '#888'} style={ms.navIcon} />
      <Text style={[ms.navLabel, active && ms.navLabelActive]}>{label}</Text>
      {chevron && (
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color="#555"
        />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[ms.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                ms.menu,
                { marginTop: insets.top + 58 },
                { opacity: fadeAnim, transform: [{ translateX }] },
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={{ paddingBottom: 12 }}
              >
                <View style={ms.section}>
                  <NavItem icon="home"             label={t('general.home')}     active />
                  <NavItem icon="film-outline"     label={t('filter.movie')}    onPress={() => { onClose(); navigation.navigate('ListScreen', { type: 'movie' }); }} />
                  <NavItem icon="tv-outline"       label={t('filter.tv_show')}  onPress={() => { onClose(); navigation.navigate('ListScreen', { type: 'tv' }); }} />
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
