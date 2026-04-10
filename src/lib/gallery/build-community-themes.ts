import { isSafeGalleryImageUrl } from "@/lib/gallery/safe-image-url";
import type { CommunityGalleryTheme } from "@/types/gallery";

export type PhotoRow = {
  user_id: string;
  url: string | null;
  activity_tag: string | null;
};

const MAX_SAMPLE = 36;

/**
 * Build popularity themes from labeled `user_photos` rows, filtered to `profileIdSet`.
 * `denominator` is typically active attendee count; percent = distinct users with tag / denominator.
 */
export function buildThemesForDenominator(
  photos: PhotoRow[],
  profileIdSet: Set<string>,
  denominator: number
): { themes: CommunityGalleryTheme[]; totalLabeledPhotos: number } {
  let totalLabeledPhotos = 0;
  for (const row of photos) {
    const uid = row.user_id;
    const tag = row.activity_tag?.trim().toLowerCase();
    const url = row.url;
    if (!uid || !tag || !profileIdSet.has(uid)) continue;
    if (!url || !isSafeGalleryImageUrl(url)) continue;
    totalLabeledPhotos++;
  }

  const tagToUserIds = new Map<string, Set<string>>();
  for (const row of photos) {
    const uid = row.user_id;
    const tag = row.activity_tag?.trim().toLowerCase();
    if (!uid || !tag || !profileIdSet.has(uid)) continue;
    if (!tagToUserIds.has(tag)) tagToUserIds.set(tag, new Set());
    tagToUserIds.get(tag)!.add(uid);
  }

  const scored: CommunityGalleryTheme[] = [];
  for (const [tag, userIds] of tagToUserIds) {
    const count = userIds.size;
    const percent =
      denominator > 0 ? Math.round((count / denominator) * 1000) / 10 : 0;

    const samplePhotos = photos
      .filter((p) => {
        const rowTag = p.activity_tag?.trim().toLowerCase();
        const url = p.url;
        return (
          rowTag === tag &&
          !!url &&
          isSafeGalleryImageUrl(url) &&
          profileIdSet.has(p.user_id)
        );
      })
      .slice(0, MAX_SAMPLE)
      .map((p) => ({
        url: p.url as string,
        userId: p.user_id,
      }));

    scored.push({ tag, count, percent, samplePhotos });
  }

  scored.sort((a, b) => b.count - a.count);
  return { themes: scored, totalLabeledPhotos };
}

/** Labeled photo rows per tag (cohort-filtered). */
export function labeledPhotoCountsByTag(
  photos: PhotoRow[],
  profileIdSet: Set<string>
): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of photos) {
    const uid = row.user_id;
    const tag = row.activity_tag?.trim().toLowerCase();
    const url = row.url;
    if (!uid || !tag || !profileIdSet.has(uid)) continue;
    if (!url || !isSafeGalleryImageUrl(url)) continue;
    m.set(tag, (m.get(tag) ?? 0) + 1);
  }
  return m;
}

/** Distinct users in cohort with at least one safe labeled gallery photo. */
export function distinctUsersWithLabeledPhoto(
  photos: PhotoRow[],
  profileIdSet: Set<string>
): number {
  const u = new Set<string>();
  for (const row of photos) {
    const tag = row.activity_tag?.trim().toLowerCase();
    const url = row.url;
    if (!tag || !url || !profileIdSet.has(row.user_id)) continue;
    if (!isSafeGalleryImageUrl(url)) continue;
    u.add(row.user_id);
  }
  return u.size;
}
