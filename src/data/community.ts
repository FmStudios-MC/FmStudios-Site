import { DISCORD_URL } from './social';

export interface CommunityServer {
  name: string;
  inviteUrl: string;
  members: string;
  description: string;
}

export const discordServer: CommunityServer = {
  name: 'FabiMvurice Interactive',
  inviteUrl: DISCORD_URL,
  members: '200+',
  description:
    'Our official Discord server. Get help with modpacks, share builds, report bugs, and hang out with the community.',
};

export const communityGuidelines = [
  {
    title: 'Be Respectful',
    description: 'Treat everyone with kindness. No harassment, hate speech, or toxic behavior.',
    icon: 'heart',
  },
  {
    title: 'Stay On Topic',
    description: 'Use the right channels for your discussions. Keep things organized.',
    icon: 'message-circle',
  },
  {
    title: 'No Spam',
    description: 'Avoid excessive self-promotion, repeated messages, or unsolicited links.',
    icon: 'shield',
  },
  {
    title: 'Report Issues',
    description: 'Found a bug? Use our bug report channels or GitHub issues for proper tracking.',
    icon: 'alert-triangle',
  },
];
