/** Canonical Discord invite URL — import this instead of hardcoding */
export const DISCORD_URL = 'https://discord.gg/x9jsed8qyR';

export interface SocialLink {
  name: string;
  url: string;
  icon: string; // Lucide icon name
}

export const socialLinks: SocialLink[] = [
  { name: 'X (Twitter)', url: 'https://x.com/famvinteractive', icon: 'twitter' },
  { name: 'YouTube', url: 'https://www.youtube.com/@fm-studios-mc', icon: 'youtube' },
  { name: 'Discord', url: DISCORD_URL, icon: 'discord' },
  { name: 'Instagram', url: 'https://www.instagram.com/fabimvurice.interactive', icon: 'instagram' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@fabimvurice.interactive', icon: 'music' },
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
    icon: 'curseforge',
  },
  {
    name: 'Modrinth',
    url: 'https://modrinth.com/user/FabiMvurice_Interactive',
    icon: 'modrinth',
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
