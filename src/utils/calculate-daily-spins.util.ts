import dayjs from 'dayjs';

export function calculateDailySpins(lastSpinAt: Date | null): number {
  if (!lastSpinAt) return 1;
  const last = dayjs(lastSpinAt).startOf('day');
  const now = dayjs().startOf('day');

  const days = now.diff(last, 'day');

  return days;
}
