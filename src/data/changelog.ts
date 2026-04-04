export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export interface ChangelogProject {
  slug: string;
  name: string;
  description: string;
  entries: ChangelogEntry[];
}

export const changelogProjects: ChangelogProject[] = [
  {
    slug: 'simply-legacy-smp',
    name: 'Simply Legacy SMP',
    description: 'Updates and patches for the Simply Legacy SMP server.',
    entries: [
      {
        version: '26.04',
        date: '2026-04-04',
        changes: [
          'Updated Server to newest version',
        ],
      },     
      {
        version: '26.03.6',
        date: '2026-03-28',
        changes: [
          'Updated Server to newest version',
        ],
      },
      {
        version: '26.03.5',
        date: '2026-03-23',
        changes: [
          'Updated Server to newest version',
          'The Modpack got performance improvements',
        ],
      },
    ],
  },
  {
    slug: 'additions',
    name: '{Additions}',
    description: 'Changelog for the {Additions} modpack.',
    entries: [
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
  },
  {
    slug: 'create-fm-3',
    name: 'Create F&M 3',
    description: 'Changelog for Create F&M 3.',
    entries: [
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
  },
];
