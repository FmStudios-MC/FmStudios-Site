export interface Project {
  id: number;
  name: string;
  category: 'modpacks' | 'mods' | 'resourcepacks';
  subcategory?: string;
  status: 'discontinued' | 'beta' | 'soon' | 'active' | 'updated';
  logo: string;
  description: string;
  version: string;
  features: string[];
  screenshots: string[];
  downloadUrl: string;
  modrinthUrl?: string;
  downloads: string;
  lastUpdate: string;
}

export const projects: Project[] = [
  {
    id: 1,
    name: 'Create Unbound',
    category: 'modpacks',
    subcategory: 'tech',
    status: 'soon',
    logo: '/images/unboundlogo.webp',
    description: 'COMING SOON',
    version: 'Neoforge 26.1',
    features: ['Create', 'Coming Soon', 'Automation'],
    screenshots: ['/images/unboundlogo.webp'],
    downloadUrl: '#',
    downloads: '-',
    lastUpdate: '-',
  },
  {
    id: 2,
    name: '{Additions}',
    category: 'modpacks',
    subcategory: 'vanilla+',
    status: 'updated',
    logo: 'https://cdn.modrinth.com/data/62BJPui0/b9c7d20546212d230ce6dbc228d87abe1f5d5247_96.webp',
    description:
      'Are you ready for the ultimate Vanilla+ Experience? Additions is the perfect Vanilla+ Modpack for you! It has great performance, Overhauled Biomes, Overhauled Nether + END, Over 150+ New Food and Crops, New Mobs and more...',
    version: 'Fabric 1.21.1-1.21.10',
    features: [
      '150+ New Foods & Crops',
      'Overhauled Biomes',
      'Enhanced Nether & End',
      'New Mobs',
      'Performance Optimized',
      'QOL Improvements',
    ],
    screenshots: [
      'https://media.forgecdn.net/attachments/912/951/2024-07-10_15.png',
      'https://media.forgecdn.net/attachments/912/955/2024-07-10_15.png',
      'https://media.forgecdn.net/attachments/912/952/2024-07-10_15.png',
    ],
    modrinthUrl: 'https://modrinth.com/modpack/additions-fabric',
    downloadUrl: 'https://www.curseforge.com/minecraft/modpacks/fabis-additions',
    downloads: '8K+',
    lastUpdate: '2025-07-31',
  },
  {
    id: 3,
    name: 'Create F&M 3',
    category: 'modpacks',
    subcategory: 'tech',
    status: 'discontinued',
    logo: 'https://media.forgecdn.net/attachments/1203/147/fm3logonew-png.png',
    description:
      'Create F&M 3 is the latest evolution of the Create: F&M series, bringing unparalleled mechanical automation and engineering creativity to Minecraft.',
    version: 'Neoforge 1.21.1',
    features: [
      'Community Server',
      'Create Mod Ecosystem',
      'Deep Dark Dimension',
      'Quest System',
      'New Terrain Generation',
      'Advanced Automation',
    ],
    screenshots: [
      'https://media.forgecdn.net/attachments/1116/125/2025-03-04_21-22-27-png.png',
      'https://media.forgecdn.net/attachments/1159/442/create_stuff-png.png',
    ],
    downloadUrl: 'https://www.curseforge.com/minecraft/modpacks/create-fm3',
    downloads: '15K+',
    lastUpdate: '2025-07-22',
  },
  {
    id: 4,
    name: 'Create F&M 2',
    category: 'modpacks',
    subcategory: 'tech',
    status: 'discontinued',
    logo: 'https://media.forgecdn.net/avatars/thumbnails/1132/43/64/64/638691888215133405.png',
    description:
      'Create F&M2 is perfect for the Create mod experience with beautiful landscapes and new terrain generation.',
    version: 'Forge 1.20.1',
    features: ['Create Mod', 'Create Add-ons', 'Immersive Aircraft', 'Farmers Delight'],
    screenshots: ['https://media.forgecdn.net/attachments/907/43/2024-07-03_16.png'],
    downloadUrl: 'https://www.curseforge.com/minecraft/modpacks/create-f-m-2',
    modrinthUrl: 'https://modrinth.com/modpack/create-fm-2',
    downloads: '2K+',
    lastUpdate: '2024-07-03',
  },
  {
    id: 5,
    name: "Fabi's Lootr",
    category: 'resourcepacks',
    status: 'updated',
    logo: 'https://media.forgecdn.net/attachments/1206/422/lootr-png.png',
    description: 'New textures for the Lootr mod.',
    version: '1.20.1+',
    features: ['Lootr Chest Reskin', 'Lootr Barrel Reskin'],
    screenshots: [
      'https://cdn.modrinth.com/data/cached_images/49a06ad5bbbff69935e092dee42189c5a47ee27b.png',
      'https://cdn.modrinth.com/data/cached_images/ae32144429b2759c1bf64613fa9d20e2d8f655c0.png',
    ],
    downloadUrl: 'https://www.curseforge.com/minecraft/texture-packs/fabi-s-lootr',
    modrinthUrl: 'https://modrinth.com/resourcepack/fabis-lootr',
    downloads: '15K+',
    lastUpdate: '2025-07-15',
  },
];

export const statusConfig: Record<string, { label: string; badge: string }> = {
  discontinued: { label: 'Discontinued', badge: 'badge-discontinued' },
  beta: { label: 'Beta', badge: 'badge-beta' },
  soon: { label: 'Coming Soon', badge: 'badge-soon' },
  active: { label: 'Active', badge: 'badge-active' },
  updated: { label: 'Recently Updated', badge: 'badge-updated' },
};

export const categories = [
  { id: 'all', label: 'All Projects' },
  { id: 'modpacks', label: 'Modpacks' },
  { id: 'mods', label: 'Mods' },
  { id: 'resourcepacks', label: 'Resource Packs' },
];

export const modpackTypes = [
  { id: 'all', label: 'All Types' },
  { id: 'vanilla+', label: 'Vanilla+' },
  { id: 'tech', label: 'Tech' },
  { id: 'magic', label: 'Magic' },
  { id: 'adventure', label: 'Adventure' },
];
