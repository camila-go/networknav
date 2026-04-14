export type CommunityGalleryTheme = {
  tag: string;
  percent: number;
  count: number;
  samplePhotos: { url: string; userId: string }[];
};

export type ProjectorEnrichmentFact = {
  value: string;
  count: number;
  percent: number;
};

/** Contextual stats about users who tagged a given activity. Powers deep-dive slides. */
export type ProjectorThemeEnrichment = {
  topTitles: ProjectorEnrichmentFact[];
  topLocations: ProjectorEnrichmentFact[];
  topCompanies: ProjectorEnrichmentFact[];
  topGrowthArea: string | null;
  topTalkTopic: string | null;
  sampleCaption: { text: string; userName: string } | null;
  profiledUserCount: number;
};

/** Admin projector view — theme row with ranking and photo totals. */
export type ProjectorThemeRow = {
  tag: string;
  rank: number;
  count: number;
  percent: number;
  labeledPhotoCount: number;
  samplePhotos: { url: string; userId: string }[];
  enrichment: ProjectorThemeEnrichment;
};
