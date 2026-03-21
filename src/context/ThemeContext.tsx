import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEME_COLORS = [
  { id: 'netflix', name: 'Netflix', color: '#E50914', gradient: ['#8E0E00', '#E50914'] },
  { id: 'disney', name: 'Disney', color: '#1F88E9', gradient: ['#0052D4', '#1F88E9'] },
  { id: 'hbo', name: 'HBO', color: '#9045FF', gradient: ['#654ea3', '#9045FF'] },
  { id: 'prime', name: 'Prime', color: '#00A8E1', gradient: ['#00A8E1', '#4A00E0'] },
  { id: 'spotify', name: 'Spotify', color: '#1DB954', gradient: ['#56ab2f', '#a8e063'] },
  { id: 'ntn', name: 'NTN Gold', color: '#FFD700', gradient: ['#FFD700', '#F7971E'] },
  { id: 'neon', name: 'Neon Pink', color: '#FF2A6D', gradient: ['#FF2A6D', '#ff0844'] },
  { id: 'cyberpunk', name: 'Cyberpunk', color: '#00FF9D', gradient: ['#00FF9D', '#00b09b'] },
  { id: 'sunset', name: 'Sunset', color: '#FF512F', gradient: ['#DD2476', '#FF512F'] },
  { id: 'ocean', name: 'Ocean', color: '#00C9FF', gradient: ['#92FE9D', '#00C9FF'] },
];

export const ThemeContext = createContext({
  themeColor: THEME_COLORS[0].color,
  themeGradient: THEME_COLORS[0].gradient,
  setThemeColor: async (color: string) => {},
});

export const ThemeProvider = ({ children }: any) => {
  const [themeColor, setThemeColorState] = useState(THEME_COLORS[0].color);
  const [themeGradient, setThemeGradientState] = useState(THEME_COLORS[0].gradient);

  useEffect(() => {
    AsyncStorage.getItem('@theme_color').then(c => {
      if (c) {
        setThemeColorState(c);
        const match = THEME_COLORS.find(t => t.color === c);
        if (match) setThemeGradientState(match.gradient);
      }
    });
  }, []);

  const setThemeColor = async (color: string) => {
    setThemeColorState(color);
    const match = THEME_COLORS.find(t => t.color === color);
    if (match) setThemeGradientState(match.gradient);
    await AsyncStorage.setItem('@theme_color', color);
  };

  return (
    <ThemeContext.Provider value={{ themeColor, themeGradient, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
