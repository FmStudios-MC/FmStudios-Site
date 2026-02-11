export interface SocialLink {
  name: string;
  url: string;
  icon: string; // Lucide icon name
}

export const socialLinks: SocialLink[] = [
  { name: 'X (Twitter)', url: 'https://x.com/famvinteractive', icon: 'twitter' },
  { name: 'YouTube', url: 'https://www.youtube.com/@fm-studios-mc', icon: 'youtube' },
  { name: 'Discord', url: 'https://discord.gg/x9jsed8qyR', icon: 'message-circle' },
  { name: 'Instagram', url: 'https://www.instagram.com/fabimvurice.interactive', icon: 'instagram' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@fabimvurice.interactive', icon: 'music' },
  { name: 'Bluesky', url: 'https://bsky.app/profile/fmstudios.bsky.social', icon: 'cloud' },
];

export interface PlatformLink {
  name: string;
  url: string;
  icon: string;
}

export const platformLinks: PlatformLink[] = [
  {
    name: 'CurseForge',
    url: 'https://www.curseforge.com/members/fabimvurice_interactive/projects',
    icon: 'flame',
  },
  {
    name: 'Modrinth',
    url: 'https://modrinth.com/user/FabiMvurice_Interactive',
    icon: 'package',
  },
];

export const supportLinks = [
  { name: 'Tebex Shop (Soon)', url: '', icon: 'star' },
  {
    name: 'Kinetic Hosting',
    url: 'https://billing.kinetichosting.net/aff.php?aff=855',
    icon: 'server',
  },
];
