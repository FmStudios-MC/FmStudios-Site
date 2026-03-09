export interface GuideStep {
  title: string;
  content: string;
}

export interface Guide {
  slug: string;
  projectSlug: string;
  projectName: string;
  title: string;
  description: string;
  icon: string;
  category: 'getting-started' | 'troubleshooting' | 'tips';
  steps: GuideStep[];
}

export const guides: Guide[] = [
  {
    slug: 'additions-getting-started',
    projectSlug: 'additions',
    projectName: '{Additions}',
    title: 'Getting Started with {Additions}',
    description: 'How to install and set up the {Additions} modpack for the best Vanilla+ experience.',
    icon: 'rocket',
    category: 'getting-started',
    steps: [
      {
        title: 'Install a Launcher',
        content: 'Download and install a Minecraft launcher that supports modpacks. We recommend <strong>ATLauncher</strong> for the best experience. <strong>CurseForge App</strong> and <strong>Modrinth App</strong> also work great.',
      },
      {
        title: 'Search for {Additions}',
        content: 'Open your launcher, go to the modpack browser, and search for <strong>"{Additions}"</strong> or <strong>"Fabis Additions"</strong>.',
      },
      {
        title: 'Install the Modpack',
        content: 'Click <strong>Install</strong> and wait for all mods to download. The pack uses <strong>Fabric 1.21.1</strong>, so the launcher will set that up automatically.',
      },
      {
        title: 'Allocate RAM',
        content: 'For the best performance, allocate at least <strong>4-6 GB of RAM</strong> in your launcher settings. Go to Settings → Java → Memory and set the maximum.',
      },
      {
        title: 'Launch & Play',
        content: 'Hit Play! Your first world load may take a minute while chunks generate with the new biomes and terrain.',
      },
    ],
  },
  {
    slug: 'additions-troubleshooting',
    projectSlug: 'additions',
    projectName: '{Additions}',
    title: 'Troubleshooting {Additions}',
    description: 'Common issues and solutions for the {Additions} modpack.',
    icon: 'alert-triangle',
    category: 'troubleshooting',
    steps: [
      {
        title: 'Game Crashes on Startup',
        content: 'Make sure you have <strong>Java 21</strong> installed and selected in your launcher. Fabric 1.21 requires Java 21. Also ensure you have allocated enough RAM (4 GB minimum).',
      },
      {
        title: 'Low FPS / Lag',
        content: 'The pack includes performance mods by default. If you still experience lag, try lowering render distance to <strong>10-12 chunks</strong> and turning off <strong>Fancy Graphics</strong>.',
      },
      {
        title: 'Mod Conflicts with Added Mods',
        content: 'Adding extra mods may cause conflicts. If the game crashes after adding a mod, remove it and check the crash log. Report issues on our <strong>Discord</strong> or <strong>GitHub</strong>.',
      },
    ],
  },
  {
    slug: 'create-fm3-getting-started',
    projectSlug: 'create-fm3',
    projectName: 'Create F&M 3',
    title: 'Getting Started with Create F&M 3',
    description: 'Installation guide and first steps for Create F&M 3.',
    icon: 'rocket',
    category: 'getting-started',
    steps: [
      {
        title: 'Install via CurseForge or Modrinth',
        content: 'Create F&M 3 is available on both <strong>CurseForge</strong> and <strong>Modrinth</strong>. Use the CurseForge App, Modrinth App, or <strong>ATLauncher</strong> (our recommended launcher), search for "Create F&M 3", and click Install.',
      },
      {
        title: 'System Requirements',
        content: 'This pack is heavier than Vanilla+. Allocate at least <strong>6-8 GB of RAM</strong>. A dedicated GPU is recommended for the best experience.',
      },
      {
        title: 'First Steps In-Game',
        content: 'Start by gathering basic resources. The <strong>Create mod</strong> progression begins with Andesite Alloy. Check the quest book (key: L) for guided progression.',
      },
    ],
  },
  {
    slug: 'performance-tips',
    projectSlug: '',
    projectName: 'All Projects',
    title: 'Performance Tips for Modpacks',
    description: 'General tips to improve performance across all our modpacks.',
    icon: 'zap',
    category: 'tips',
    steps: [
      {
        title: 'Allocate the Right Amount of RAM',
        content: 'More is not always better. For Vanilla+ packs like {Additions}, use <strong>4-6 GB</strong>. For heavier packs like Create F&M 3, use <strong>6-8 GB</strong>. Over-allocating can actually cause lag due to garbage collection.',
      },
      {
        title: 'Use Java 21',
        content: 'Modern Minecraft versions require <strong>Java 21</strong>. Make sure your launcher is using the correct Java version. Older Java versions will cause crashes.',
      },
      {
        title: 'Update Your Graphics Drivers',
        content: 'Outdated GPU drivers are a common cause of rendering issues. Update your <strong>NVIDIA</strong>, <strong>AMD</strong>, or <strong>Intel</strong> drivers to the latest version.',
      },
      {
        title: 'Close Background Programs',
        content: 'Minecraft modpacks are memory-hungry. Close browsers, Discord (use the web version), and other programs to free up RAM.',
      },
      {
        title: 'Adjust Video Settings',
        content: 'Lower your <strong>render distance</strong> (8-12 chunks), set particles to <strong>Minimal</strong>, and disable <strong>Entity Shadows</strong> if you need more FPS.',
      },
    ],
  },
];

export const guideCategories = [
  { id: 'all', label: 'All Guides' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'tips', label: 'Tips & Tricks' },
];
