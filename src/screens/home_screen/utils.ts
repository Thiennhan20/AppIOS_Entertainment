// ─── Home Screen Utilities ───────────────────────────────────────────────────
export const getTimeSince = (dateString: string, t: any) => {
  if (!dateString) return t('home.just_now');
  const diff = Math.max(0, Date.now() - new Date(dateString).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('home.just_now');
  if (minutes < 60) return `${minutes} ${t('home.mins_ago')}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${t('home.hours_ago')}`;
  const days = Math.floor(hours / 24);
  return `${days} ${t('home.days_ago')}`;
};

export const TOP_CAST_DATA = [
  { id: '1', name: 'Tom Cruise', image: 'https://image.tmdb.org/t/p/w200/gThaIXgpBVyBb2sM070Wj8Jm4G5.jpg' },
  { id: '2', name: 'Scarlett Johansson', image: 'https://image.tmdb.org/t/p/w200/60Zrsx4U43z8GtyBpmKjK3nU8pM.jpg' },
  { id: '3', name: 'Leonardo DiCaprio', image: 'https://image.tmdb.org/t/p/w200/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg' },
  { id: '4', name: 'Cillian Murphy', image: 'https://image.tmdb.org/t/p/w200/i8d63evB4h6x1Rmbk1k7oHmbDDB.jpg' },
  { id: '5', name: 'Margot Robbie', image: 'https://image.tmdb.org/t/p/w200/euDPyqLnuwaWmHutvn5IiY2Kj1.jpg' },
];
