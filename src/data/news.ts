export interface ThemeColor {
  accent: string;      // primary accent, e.g. '#4ade80'
  accentDeep: string;  // deeper variant, e.g. '#22c55e'
  accentDark: string;  // darkest variant, e.g. '#16a34a'
  rgb: string;         // comma-separated RGB for ember particles, e.g. '74, 222, 128'
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  category: 'announcement' | 'update' | 'news' | 'guide';
  date: string;
  author: string;
  excerpt: string;
  content: string;
  image: string;
  tags: string[];
  themeColor?: ThemeColor;
}

export const blogPosts: BlogPost[] = [
  {
    id: 5,
    title: 'Simply Legacy SMP launched!',
    slug: 'simply-legacy-smp-launch',
    category: 'news',
    date: '2026-03-20',
    author: 'Itzz_Fabi',
    excerpt: 'Our new SMP for the Simply Legacy Modpack just launched!',
    content: `
      <h3>Our Simply Legacy SMP just launched</h3>
      <p>Due to some recent things that happend (Source Code Leaks) we wanted the legacy feeling of the old console versions back.</p>
      <h3>What is Simply Legacy?</h3>
      <p>Simply Legacy is a modpack designed to bring the experience of Minecraft's Legacy Console Edition to a more up-to-date version of the game, acting as a vision of what the game would've looked like if it continued to get content updates to this day.</p>
      <h3>How to join the server</h3>
      <ul>
        <li><strong>Install the Modpack</strong> — Use Modrinth or other launchers that support Modrinth and install the Modpack. You can find the download on our Projects Site!</li>
        <li><strong>Start the game</strong> — Start the game </li>
        <li><strong>Click on play</strong></li>
        <li><strong>Click on join</strong></li>
        <li><strong>Click on add Server</strong></li>
        <li><strong>Set a name</strong> — The name can be anything </li>
        <li><strong>Put in the IP</strong> — Add the IP adress of the server: <strong>fmi-legacy.kinetichosting.gg</strong> </li>
      </ul>

      <h3>Recommendations</h3>
      <p>To get og feelings activate the "Classic Texture Pack". New textures of newer updates now have pre 1.14 texutre styles.</p>
      <ul>
        <li><strong>Open the Settings</strong></li>
        <li><strong>Click on Graphics</strong></li>
        <li><strong>Use the Classic Texture Pack</strong></li>
      </ul>
    `,
    image: '/images/projects/d314800e52950835032a0d6b68ca63bf2859bccd.webp',
    tags: ['News', 'Community', 'Hytale'],
    themeColor: {
      accent: '#4ade80',
      accentDeep: '#22c55e',
      accentDark: '#16a34a',
      rgb: '74, 222, 128',
    },
  },
  {
    id: 4,
    title: 'Hytale Community Server is closed',
    slug: 'hytale-server-closing',
    category: 'announcement',
    date: '2026-03-09',
    author: 'Itzz_Fabi',
    excerpt: 'Our Hytale Server closed...',
    content: `
      <h3>The Server closed</h3>
      <p>Due to no intrest from the Community, the server closed.</p>
    `,
    image: '/images/news/hytalered.webp',
    tags: ['News', 'Community', 'Hytale'],
    themeColor: {
      accent: '#f70505',
      accentDeep: '#a70606',
      accentDark: '#7c0404',
      rgb: '247, 5, 5',
    },
  },
  {
    id: 3,
    title: '"Project Leuna - Reborn" Progress',
    slug: 'prleunapr0226',
    category: 'update',
    date: '2026-02-17',
    author: 'Itzz_Fabi',
    excerpt: 'A look at progress I made for my Roblox game "Project Leuna - Reborn".',
    content: `
      <h3>What is my progess</h3>
      <p>I have been working on the game for some weeks now. Not that often but a decent amount. I think this game will be my first good Roblox game.</p>

      <h3>Recent Progress</h3>
      <ul>
        <li><strong>Stable Framework</strong> — Stable Framework with basic needs for money and Datastore</li>
        <li><strong>Main Menu</strong> — Working main menu with settings and changelogs</li>
        <li><strong>Some Map Progess</strong> — Some little map progress.</li>
      </ul>

      <h3>Preview</h3>
      <p>Here's a sneak peek at a part of the map:</p>

      <img src="/images/news/prleunascreen.webp" alt="Preview Screenshot 1" style="width:100%;border-radius:0.5rem;margin:1rem 0;" />
      <p>Stay tuned for more details!</p>
    `,
    image: '/images/news/projectleunalogo.webp',
    tags: ['Updates', 'Community', '2026'],
    themeColor: {
      accent: '#facc15',
      accentDeep: '#eab308',
      accentDark: '#ca8a04',
      rgb: '250, 204, 21',
    },
  },
  {
    id: 1,
    title: 'Hytale Community Server is now open!',
    slug: 'hytale-server-opening',
    category: 'news',
    date: '2026-02-03',
    author: 'Itzz_Fabi',
    excerpt: 'Our Hytale community server is now open!',
    content: `
      <h3>Join us!</h3>
      <p>The Server is now open!</p>
      <h3>Important Information</h3>
      <ul>
        <li><strong>Server IP:</strong> 176.9.102.179:25571</li>
        <li><strong>Ingame use /help</strong> - For viewing important commands</li>
        <li><strong>Claiming Mod</strong> - You can claim chunks. Use /help and search for simpleclaims</li>
      </ul>
      <p>Come join us!</p>
    `,
    image: '/images/news/hytale.webp',
    tags: ['News', 'Community', 'Hytale'],
    themeColor: {
      accent: '#0582f7',
      accentDeep: '#064ba7',
      accentDark: '#042a7c',
      rgb: '5, 130, 247',
    },
  },
  {
    id: 2,
    title: 'Welcome to FabiMvurice Interactive',
    slug: 'welcome-to-fmstudios',
    category: 'news',
    date: '2026-02-02',
    author: 'Itzz_Fabi',
    excerpt:
      "Happy New Year! We're kicking off 2026 with exciting plans for our Minecraft modpack community.",
    content: `
      <p>Happy New Year from the entire FabiMvurice Interactive team! We're thrilled to kick off 2026 with some exciting plans for our Minecraft modpack community.</p>
      <h3>Looking Back at 2025</h3>
      <p>Last year was incredible for us. We released multiple updates for {Additions} and Create F&M 3, reaching over 25K+ combined downloads across our projects!</p>
      <h3>What's Coming in 2026</h3>
      <ul>
        <li><strong>Create Unbound</strong> - Our most ambitious project yet</li>
        <li><strong>{Additions} Rebound</strong> - A fresh take on Vanilla+</li>
        <li><strong>Project Leuna - Reborn</strong> - Expanding beyond Minecraft into Roblox</li>
      </ul>
      <p>Thank you for being part of our community. Here's to an amazing 2026!</p>
    `,
    image: '/images/logoneu.webp',
    tags: ['News', 'Community', '2026'],
  },
];

export const blogCategoryConfig: Record<string, { label: string; badge: string }> = {
  announcement: { label: 'Announcement', badge: 'badge-updated' },
  update: { label: 'Update', badge: 'badge-active' },
  news: { label: 'News', badge: 'badge-in-progress' },
  guide: { label: 'Guide', badge: 'badge-medium' },
};

export const newsFilters = [
  { id: 'all', label: 'All Posts' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'update', label: 'Updates' },
  { id: 'news', label: 'News' },
  { id: 'guide', label: 'Guides' },
];
