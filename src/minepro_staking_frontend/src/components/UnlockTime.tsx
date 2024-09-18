import { FC, useMemo } from 'react';

interface UnlockTimeProps {
  secsToUnlock: number
}

export const UnlockTime: FC<UnlockTimeProps> = ({ secsToUnlock }) => {

  const countdown = useMemo(() => {
    const d = Math.floor(secsToUnlock / (3600*24));
    const h = Math.floor(secsToUnlock % (3600*24) / 3600);
    const m = Math.floor(secsToUnlock % 3600 / 60);
    const s = Math.floor(secsToUnlock % 60);

    const dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    const hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    const mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    const sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    if (d > 0) {
      return dDisplay + hDisplay.replace(',', '');
    }
    if (h > 0) {
      return hDisplay + mDisplay.replace(',', '');
    }
    if (m > 0) {
      return mDisplay + sDisplay;
    }
    return sDisplay;
  }, [secsToUnlock]);

  return (
    <span>
      {secsToUnlock > 0 ? `Unlocks in: ${countdown}` : 'Unlocked'}
    </span>
  )
}

export default UnlockTime;