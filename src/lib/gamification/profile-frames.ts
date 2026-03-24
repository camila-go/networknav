/**
 * Profile avatar frames unlock at connection-point (total_points) thresholds.
 * Keep in sync with product copy on the profile screen when frames are selectable in UI.
 */
export interface ProfileFrameTier {
  minPoints: number;
  id: string;
  name: string;
}

export const PROFILE_FRAME_TIERS: ProfileFrameTier[] = [
  { minPoints: 100, id: "ember", name: "Ember ring" },
  { minPoints: 250, id: "tide", name: "Tide band" },
  { minPoints: 500, id: "aurora", name: "Aurora halo" },
  { minPoints: 1000, id: "goldleaf", name: "Goldleaf frame" },
  { minPoints: 2500, id: "nova", name: "Nova ring" },
  { minPoints: 5000, id: "radiant", name: "Radiant crown" },
];

export function getNewlyUnlockedProfileFrames(
  prevTotalPoints: number,
  newTotalPoints: number
): ProfileFrameTier[] {
  return PROFILE_FRAME_TIERS.filter(
    (t) => prevTotalPoints < t.minPoints && newTotalPoints >= t.minPoints
  );
}
