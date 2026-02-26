export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatar: string;
}

export const teamMembers: TeamMember[] = [
  {
    name: 'Itzz_Fabi',
    role: 'Founder & Lead Developer',
    bio: 'Creator of the Create F&M series and Additions. Passionate about modded Minecraft and building communities.',
    avatar: '/images/logoneu.webp',
  },
    {
    name: 'Mvurice',
    role: 'Founder',
    bio: 'Also had the idea to create the F&M series.',
    avatar: '/images/logoneu.webp',
  },
];

export interface Milestone {
  year: string;
  title: string;
  description: string;
}

export const milestones: Milestone[] = [
  {
    year: '2023',
    title: 'The First Project',
    description: 'Fabi and Maurice had the idea to create a Modpack. Create F&M was born.',
  },
  {
    year: '2024',
    title: 'Founded FmStudios',
    description: 'Fabi and Maurice called themselves "FmStudios"',
  },
  {
    year: '2024',
    title: 'First 10K Downloads',
    description: 'Crossed 10,000 combined downloads across CurseForge and Modrinth.',
  },
  {
    year: '2024',
    title: 'Kinetic Partnership',
    description: 'Partnered with Kinetic Hosting to offer optimized modded Minecraft servers.',
  },
  {
    year: '2025',
    title: 'Create F&M 3',
    description: 'Their biggest Modpack ever released. Create F&M 3 was very popular with many people joining their official community server',
  },
  {
    year: '2025',
    title: 'Changed name to FabiMvurice Interactive',
    description: 'Fabi and Maurice wanted a new name and style.',
  },
  {
    year: '2026',
    title: 'Create Unbound',
    description: 'The next evolution of the Create series | currently in development.',
  },
];

export const techStack = [
  { name: 'Minecraft', icon: 'gamepad-2' },
  { name: 'NeoForge', icon: 'hammer' },
  { name: 'Fabric', icon: 'layers' },
  { name: 'Create Mod', icon: 'cog' },
  { name: 'CurseForge', icon: 'curseforge' },
  { name: 'Modrinth', icon: 'modrinth' },
  { name: 'Java', icon: 'code' },
  { name: 'Astro', icon: 'rocket' },
];
