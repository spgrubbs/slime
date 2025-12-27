import { NAME_PRE, NAME_SUF, NAME_TIT } from '../data/slimeData.js';

// Generate a random slime name
export const genName = () =>
  NAME_PRE[Math.floor(Math.random() * NAME_PRE.length)] +
  NAME_SUF[Math.floor(Math.random() * NAME_SUF.length)] +
  NAME_TIT[Math.floor(Math.random() * NAME_TIT.length)];

// Generate a random unique ID
export const genId = () => Math.random().toString(36).substr(2, 9);

// Format seconds into readable time string
export const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} minutes`;
};
