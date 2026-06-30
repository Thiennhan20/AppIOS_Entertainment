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
