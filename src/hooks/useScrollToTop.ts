import { useCallback, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

export default function useScrollToTop(threshold = 300) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const shouldShow = event.nativeEvent.contentOffset.y > threshold;
    setShowScrollTop((current) => current === shouldShow ? current : shouldShow);
  }, [threshold]);

  return { handleScroll, showScrollTop };
}
