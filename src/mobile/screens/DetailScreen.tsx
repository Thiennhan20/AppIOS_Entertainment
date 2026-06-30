import React from 'react';
import DetailScreenMovie from './detail/DetailScreenMovie';
import DetailScreenTVShow from './detail/DetailScreenTVShow';

export default function DetailScreen({ route, navigation }: any) {
  const isTV = route.params?.isTV || route.params?.item?.isTV || route.params?.item?.name ? true : false;
  
  if (isTV) {
    return <DetailScreenTVShow route={route} navigation={navigation} />;
  }
  return <DetailScreenMovie route={route} navigation={navigation} />;
}
