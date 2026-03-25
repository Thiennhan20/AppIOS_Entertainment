import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Vibration, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/authApi';
import { useToast } from '../context/ToastContext';

const WATCHLIST_EVENT = 'watchlist_updated';
let globalWatchlist: Set<string> | null = null;
let watchlistFetchPromise: Promise<void> | null = null;

export const clearWatchlistCache = () => {
  globalWatchlist = null;
  watchlistFetchPromise = null;
};

interface WatchlistButtonProps {
  movie: any | null;
  styleType?: 'iconOnly' | 'featured' | 'detail';
  onWatchlistUpdated?: () => void;
}

export default function WatchlistButton({ movie, styleType = 'detail', onWatchlistUpdated }: WatchlistButtonProps) {
  const { t } = useTranslation();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    checkWatchlistStatus();
    
    const subscription = DeviceEventEmitter.addListener(WATCHLIST_EVENT, (eventData) => {
      if (movie && String(eventData.id) === String(movie.id)) {
        setIsSaved(eventData.saved);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [movie]);

  const checkWatchlistStatus = async () => {
    if (!movie) return;
    try {
      if (globalWatchlist !== null) {
        setIsSaved(globalWatchlist.has(String(movie.id)));
        return;
      }
      if (!watchlistFetchPromise) {
        watchlistFetchPromise = (async () => {
          const resp: any = await authApi.getWatchlist();
          const list = resp?.watchlist || [];
          globalWatchlist = new Set(list.map((m: any) => String(m.id || m.contentId)));
        })();
      }
      await watchlistFetchPromise;
      const refreshedWatchlist = globalWatchlist as Set<string> | null;
      if (refreshedWatchlist) {
        setIsSaved(refreshedWatchlist.has(String(movie.id)));
      }
    } catch (e) {
      console.warn("Could not fetch watchlist state", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!movie || loading) return;
    Vibration.vibrate(40);
    setLoading(true);
    try {
      if (isSaved) {
        await authApi.removeFromWatchlist(movie.id);
        setIsSaved(false);
        if (globalWatchlist) globalWatchlist.delete(String(movie.id));
        DeviceEventEmitter.emit(WATCHLIST_EVENT, { id: movie.id, saved: false });
        showToast(t('watchlist.removed'), 'info');
        if (onWatchlistUpdated) onWatchlistUpdated();
      } else {
        const type = movie.isTV || movie.type === 'tv' ? 'tv' : 'movie';
        const title = movie.title || movie.name || t('general.unknown');
        const rawPoster = movie.poster_path || movie.poster || '';
        const poster = rawPoster.startsWith('http') 
          ? rawPoster 
          : (rawPoster ? `https://image.tmdb.org/t/p/w500${rawPoster}` : '');
          
        await authApi.addToWatchlist(movie.id, title, poster, type);
        setIsSaved(true);
        if (globalWatchlist) globalWatchlist.add(String(movie.id));
        DeviceEventEmitter.emit(WATCHLIST_EVENT, { id: movie.id, saved: true });
        showToast(t('watchlist.added'), 'success');
        if (onWatchlistUpdated) onWatchlistUpdated();
      }
    } catch {
      showToast('Error updating watchlist.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!movie) return null;

  if (styleType === 'iconOnly') {
    return (
      <TouchableOpacity 
        style={styles.lpBtnCircle}
        onPress={handleToggle}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name={isSaved ? "checkmark" : "add"} size={22} color="white" />
        )}
      </TouchableOpacity>
    );
  }

  if (styleType === 'featured') {
    return (
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handleToggle}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name={isSaved ? "checkmark" : "add"} size={22} color="white" />
        )}
        <Text style={styles.actionText}>{isSaved ? t('general.saved') : t('general.save')}</Text>
      </TouchableOpacity>
    );
  }

  // default 'detail'
  return (
    <TouchableOpacity 
      style={styles.actionItemMini} 
      onPress={handleToggle}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" style={{ width: 24, height: 24 }} />
      ) : (
        <Ionicons name={isSaved ? "checkmark" : "add"} size={24} color="white" />
      )}
      <Text style={styles.actionItemTextMini}>{isSaved ? t('general.saved') : t('general.save')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // iconOnly
  lpBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // featured
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    marginRight: 10,
    minWidth: 44,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  // detail
  actionItemMini: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  actionItemTextMini: {
    color: '#ccc',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
});
