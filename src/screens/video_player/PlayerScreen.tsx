import React from 'react';
import PlayerScreenMovie from './PlayerScreenMovie';
import PlayerScreenTVShow from './PlayerScreenTVShow';

export default function PlayerScreen({ route, navigation }: any) {
  const isTV = route.params?.isTV || route.params?.item?.isTV || route.params?.item?.name ? true : false;
  
  if (isTV) {
    return <PlayerScreenTVShow route={route} navigation={navigation} />;
  }
  return <PlayerScreenMovie route={route} navigation={navigation} />;
}
