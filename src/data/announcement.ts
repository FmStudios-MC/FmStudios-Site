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
  id: 'new-design',
  text: 'NEW | We have a new logo and website design!',
  link: { url: '/news/new-design-launch', label: 'Learn more' },
  icon: 'rocket',
};
