export type CommunityGalleryTheme = {
  tag: string;
  percent: number;
  count: number;
  samplePhotos: { url: string; userId: string }[];
};

/** Admin projector view — theme row with ranking and photo totals. */
export type ProjectorThemeRow = {
  tag: string;
  rank: number;
  count: number;
  percent: number;
  labeledPhotoCount: number;
  samplePhotos: { url: string; userId: string }[];
};
