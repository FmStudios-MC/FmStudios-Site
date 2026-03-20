export interface RoadmapItem {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned' | 'onhold';
  category: string;
  priority: 'high' | 'medium' | 'low';
  progress: number;
  estimatedDate: string;
  features: string[];
  updates: { date: string; text: string }[];
}

export const roadmapItems: RoadmapItem[] = [
  {
    id: 1,
    title: 'Create Unbound - Full Release',
    description:
      'The ultimate Create mod experience with new features and performance optimizations. Currently waiting for 26.1 release of Minecraft and the mod.',
    status: 'in-progress',
    category: 'modpacks',
    priority: 'high',
    progress: 10,
    estimatedDate: 'Q2 2026',
    features: [
      'Advanced Create automation chains',
      'Performance optimization for large factories',
      'Integration with Create addons',
      'Modrinth and Curseforge as a same Version',
    ],
    updates: [
      { date: '2026-01-15', text: 'Waiting for 26.1 release of the create mod' },
    ],
  },
  {
    id: 2,
    title: '{Additions} Rebound',
    description: 'A Vanilla+ modpack',
    status: 'in-progress',
    category: 'modpacks',
    priority: 'low',
    progress: 5,
    estimatedDate: '2026',
    features: ['Vanilla+ mods'],
    updates: [
      { date: '2026-02-23', text: 'Created a logo (probably not the final one)' }
    ],
  },
  {
    id: 3,
    title: 'Project Leuna - Reborn (Roblox)',
    description: 'A Roblox roleplay game',
    status: 'onhold',
    category: 'roblox',
    priority: 'low',
    progress: 2,
    estimatedDate: '2026/2027',
    features: ['Roleplay Elements', 'Replica of the german city "Leuna"'],
    updates: [
      { date: '2026-01-28', text: 'Started work on the game again since 2024' },
      { date: '2026-01-29', text: 'Added Stamina System' },
      { date: '2026-01-30', text: 'Added Main Menu and Map updates' },
      { date: '2026-02-05', text: 'Reworked the entire Roleplay Framework' },
    ],
  },
  {
    id: 4,
    title: 'Create: Project Arcane',
    description: 'A Create Modpack based on create and magic mods',
    status: 'planned',
    category: 'modpacks',
    priority: 'low',
    progress: 0,
    estimatedDate: '2026/2027',
    features: ['Advanced Create automation with magic'],
    updates: [],
  },
  {
    id: 5,
    title: 'SMP for "Simply Legacy" Modpack',
    description: 'We want to make a community Server for the Simply Legacy Modpack.',
    status: 'completed',
    category: 'modpacks',
    priority: 'high',
    progress: 100,
    estimatedDate: '2026',
    features: ['Legacy Edition Content','https://modrinth.com/modpack/simply-legacy'],
    updates: [
      { date: '2026-03-14', text: 'Starting setting up the server' }
    ],
  },
];

export const roadmapStatusConfig: Record<string, { label: string; badge: string }> = {
  completed: { label: 'Completed', badge: 'badge-completed' },
  'in-progress': { label: 'In Progress', badge: 'badge-in-progress' },
  planned: { label: 'Planned', badge: 'badge-planned' },
  onhold: { label: 'On Hold', badge: 'badge-onhold' },
};

export const priorityConfig: Record<string, { label: string; badge: string }> = {
  high: { label: 'High Priority', badge: 'badge-high' },
  medium: { label: 'Medium Priority', badge: 'badge-medium' },
  low: { label: 'Low Priority', badge: 'badge-low' },
};

export const roadmapFilters = [
  { id: 'all', label: 'All Items' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'planned', label: 'Planned' },
  { id: 'high', label: 'High Priority' },
];
