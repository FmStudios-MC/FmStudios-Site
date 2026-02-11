export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQSection {
  title: string;
  items: FAQItem[];
}

export const faqSections: FAQSection[] = [
  {
    title: 'General',
    items: [
      {
        question: 'What is FabiMvurice Interactive?',
        answer:
          'FabiMvurice Interactive is a small creative studio that builds Minecraft modpacks, resource packs, and community projects. We focus on Create-based tech packs and Vanilla+ experiences.',
      },
      {
        question: 'Who is behind the projects?',
        answer:
          'The projects are created and maintained by Itzz_Fabi. Mvurice and Moped_Junge are also Owners. Community contributions and feedback are always welcome!',
      },
      {
        question: 'How can I contribute or get involved?',
        answer:
          'Join our Discord server to connect with the community, report bugs, suggest features, or help with testing. Links to all our social platforms are in the footer.',
      },
      {
        question: 'Where can I download your modpacks?',
        answer:
          'All our modpacks are available on CurseForge and Modrinth. Check the Projects page for direct download links.',
      },
    ],
  },
  {
    title: 'Modpack Help',
    items: [
      {
        question: 'What launcher should I use?',
        answer:
          'We recommend using CurseForge App, Prism Launcher, or Modrinth App. All of them support one-click modpack installation.',
      },
      {
        question: 'How much RAM do I need?',
        answer:
          'For most of our modpacks, we recommend allocating at least 6-8 GB of RAM. For heavier packs like Create F&M 3, 8-10 GB is recommended.',
      },
      {
        question: 'My game is crashing on startup, what should I do?',
        answer:
          'First, make sure you have enough RAM allocated and are using the correct Java version. For Fabric packs, use Java 21. If the issue persists, join our Discord and share your crash log in the support channel.',
      },
      {
        question: 'Can I add extra mods to the modpacks?',
        answer:
          "Yes, but we can't guarantee compatibility with additional mods. Adding client-side mods (like minimaps or shaders) is usually safe. For server-side mods, test thoroughly before adding them to a world you care about.",
      },
      {
        question: 'Are your modpacks available for server hosting?',
        answer:
          'Yes! Our official hosting partner Kinetic Hosting supports all our modpacks with one-click installation. Check the Hosting page for more details and a special discount.',
      },
    ],
  },
];
