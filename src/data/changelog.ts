export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const changelogs: Record<string, ChangelogEntry[]> = {
  '{Additions}': [
    {
      version: '21.8.2',
      date: '2025-07-31',
      changes: [
        'Added stunning new particle effects',
        'Introduced 25+ new food items',
        'Added 3 new biomes',
      ],
    },
  ],
  'Create F&M 3': [
    {
      version: '[Deep Production] 3.3',
      date: '2025-07-21',
      changes: [
        'New Deep Dark Dimension',
        'New "Blaze Cake" variants',
        '50+ new quests',
      ],
    },
  ],
};
