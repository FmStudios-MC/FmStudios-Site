<p align="center">
  <img src="public/images/logoneu.webp" alt="FabiMvurice Interactive" width="120" />
</p>

<h1 align="center">FabiMvurice Interactive</h1>

<p align="center">
  Creating Minecraft modpacks, mods, and resource packs since 2023.
</p>

<p align="center">
  <a href="https://www.fabimvurice-interactive.de"><img src="https://img.shields.io/badge/website-live-success.svg" alt="Website" /></a>
  <img src="https://img.shields.io/badge/Astro-5.3-BC52EE.svg" alt="Astro" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-38BDF8.svg" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/license-proprietary-red.svg" alt="License" />
</p>

<p align="center">
  <a href="https://discord.gg/x9jsed8qyR">Discord</a> &middot;
  <a href="https://x.com/famvinteractive">X / Twitter</a> &middot;
  <a href="https://www.youtube.com/@fm-studios-mc">YouTube</a> &middot;
  <a href="https://www.instagram.com/fabimvurice.interactive">Instagram</a> &middot;
  <a href="https://www.tiktok.com/@fabimvurice.interactive">TikTok</a>
</p>

---

## About

This is the source code for the **FabiMvurice Interactive** website a central hub for our Minecraft projects, news, changelogs, roadmap, and downloads.

The site uses a custom depth-based design system called **"The Forge"**: opaque layered surfaces, multi-layer box-shadows, 3D perspective transforms, ember particle effects, and a hex grid background. No glass or blur just solid layers with fire-themed accents.

## Projects

| Project | Type | Status | Downloads |
|---------|------|--------|-----------|
| **Create Unbound** | Modpack (Tech) | Coming Soon | — |
| **{Additions}** | Modpack (Vanilla+) | Active | 8K+ |
| **Fabi's Lootr** | Resource Pack | Active | 15K+ |
| **Create F&M 3** | Modpack (Tech) | Discontinued | 15K+ |
| **Create F&M 2** | Modpack (Tech) | Discontinued | 2K+ |

Available on [CurseForge](https://www.curseforge.com/members/fabimvurice_interactive/projects) and [Modrinth](https://modrinth.com/user/FabiMvurice_Interactive).

## Tech Stack

| | |
|---|---|
| **Framework** | [Astro](https://astro.build/) 5.3 (static output) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) 4.0 via `@tailwindcss/vite` |
| **Language** | TypeScript |
| **SEO** | `@astrojs/sitemap` for auto-generated sitemaps |
| **Fonts** | Inter (body) + Space Grotesk (display) |
| **Hosting** | GitHub Pages |

Zero runtime dependencies. No React, Vue, or Svelte... pure Astro components with vanilla JS.

## Getting Started

**Prerequisites:** Node.js 18+, Git

```bash
# Clone
git clone https://github.com/FmStudios-MC/FmStudios-Site.git
cd FmStudios-Site

# Install
npm install

# Develop
npm run dev

# Build
npm run build

# Preview production build
npm run preview
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with hero, featured projects, news, and community CTA |
| `/projects` | Project showcase with search and category filters |
| `/projects/[slug]` | Individual project detail pages |
| `/news` | Announcements with category filtering |
| `/news/[slug]` | Individual news articles |
| `/roadmap` | Development roadmap with progress tracking |
| `/changelog` | Version history per project |
| `/gallery` | Screenshot gallery with lightbox viewer |
| `/faq` | Two-column FAQ accordion |
| `/downloads` | Centralized download hub |
| `/about` | Studio info, team, and milestones |
| `/community` | Discord and social links |
| `/hosting` | Kinetic Hosting partnership page |
| `/404` | Custom "Page Not Found" |

## Project Structure

```
src/
├── components/     Astro components (NavBar, Footer, Icon, modals, cards)
├── data/           TypeScript data files (projects, news, roadmap, etc.)
├── layouts/        Layout with sidebar nav, SEO meta, hex grid, embers
├── pages/          14 pages (see table above)
├── scripts/        Client-side TS (animations, lightbox, modals, search, theme)
└── styles/         Design tokens and component styles (global.css)
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push and open a Pull Request

## License

Proprietary — all rights reserved by FabiMvurice Interactive. See [LICENSE](LICENSE) for details.
