export interface Announcement {
  /** Toggle the banner on/off without code changes */
  enabled: boolean;
  /** Unique ID — change this to show the banner again after a user dismissed it */
  id: string;
  /** The announcement message */
  text: string;
  /** Optional call-to-action link */
  link?: { url: string; label: string };
  /** Lucide icon name (from Icon.astro) */
  icon?: string;
}

export const announcement: Announcement = {
  enabled: true,
  id: 'simply-legacy-opend1',
  text: 'NEW | Simply Legacy Modpack SMP is now live!',
  link: { url: '/projects/simply-legacy-smp', label: 'Learn more' },
  icon: 'rocket',
};
