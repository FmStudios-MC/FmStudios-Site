# FabiMvurice Interactive (FMI) Site

The official website for FabiMvurice Interactive, a studio building Minecraft
modpacks, mods, resource packs, Roblox games, and programs. It is a static,
content-driven portfolio built with Astro, plus a small arcade of self-contained
browser games served from `/games`.

Live at [www.fabimvurice-interactive.de](https://www.fabimvurice-interactive.de).

## Stack

- Astro 5 (static output, zero JS by default)
- Hand-written CSS design tokens in OKLCH (no Tailwind), see `src/styles/tokens.css`
- Lenis for smooth scroll, IntersectionObserver for reveals (`src/scripts/motion.ts`)
- Projects and News modeled as content collections (`src/content.config.ts`)
- Self-hosted fonts: woff2 in `public/fonts/`, `@font-face` in `src/styles/fonts.css`
- Browser games in vanilla TS (no framework, no canvas for the idle game), persisting to `localStorage`

## Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at http://localhost:4321 |
| `npm run build` | Build the static site to `dist/` |
| `npm run preview` | Preview the production build locally |
| `node shot.mjs [routes...]` | Screenshot routes (desktop + mobile) into `shots/` against a running server; set `BASE` to target a non-default host |

There is no test, lint, or type-check script. `tsconfig.json` extends
`astro/tsconfigs/strict`; run `npx astro check` for type errors.

## Layout

- `src/pages/` - routes (home, `/work`, `/work/[id]`, `/news`, `/news/[id]`, `/roadmap`, `/about`, `/contact`, `/games`, `/games/server-farm-tycoon`, `/games/tower-defense`)
- `src/components/` - Nav, Footer, Mark, Button, ProjectCard, PageHeader (plus `games/` cards)
- `src/layouts/BaseLayout.astro` - shell, font preloads, head
- `src/styles/` - `tokens.css`, `fonts.css`, `global.css`, plus `games/` stylesheets
- `src/scripts/` - `motion.ts` (Lenis + reveals) and `games/` game logic
- `src/assets/` - brand and project art (optimized by Astro `<Image>`)
- `src/content/` - project and news markdown
- `PRODUCT.md` / `DESIGN.md` - strategy and visual system docs

## Content

### Adding a project

Drop a markdown file in `src/content/projects/` and put its art in
`src/assets/projects/`. Front matter is typed by `src/content.config.ts`. Set
`featured: true` to surface a project on the home page; `accent` (OKLCH) tints
the detail page. `links` is an array of `{ label, url }` rendered as buttons;
leave it empty until launch.

### Posting news

Drop a markdown file in `src/content/news/`. Front matter is typed by
`src/content.config.ts`. Tags are free-form; each distinct tag becomes a filter
on `/news`. `featured: true` pins a post; `draft: true` keeps it out of the
build. Posts sort newest-first by `date`.

### Editing the roadmap

The Roadmap page (`src/pages/roadmap.astro`) is a three-lane status board.
Items are hardcoded in the `board` array at the top of the file. Each item has
`title`, `kind`, `when`, and `summary`.

## Games

`/games` is a small arcade of self-contained browser games. Each runs entirely
client-side in vanilla TS, saves to `localStorage`, and asks nothing of the
visitor. They are listed on `src/pages/games/index.astro`; add an entry to its
`games` array to surface a new one.

- **Server-Farm Tycoon** (`/games/server-farm-tycoon`, code in
  `src/scripts/games/sft/`) - an idle/tycoon game that keeps simulating while
  you're away. Module boundaries are deliberate: `config.ts` holds all balancing
  data, `engine.ts` is the pure simulation (no DOM/storage), `ui.ts` is DOM
  binding only, and `index.ts` wires it together.
- **Signal Defense** (`/games/tower-defense`, code in `src/scripts/games/td/`) -
  a tower-defense game with a scheduled campaign and an endless high-score mode.

The `.astro` page owns the static HTML shell and `data-*` hooks; a `<script>`
mounts the game onto it. See `CLAUDE.md` for the full module-by-module breakdown.

## Deployment

Hosted on GitHub Pages, deployed by `.github/workflows/deploy.yml` on push to
`main`. `public/CNAME` holds the custom domain and is copied into `dist/` on
every build; keep it in sync with `site` in `astro.config.mjs`.

## Contributing

Issues and pull requests are welcome. You may read the source and submit
commits to improve this site. By submitting a contribution, you agree it may
be incorporated into the project under the project's license.

## License

Licensed under the [PolyForm Strict License 1.0.0](LICENSE). The source is
public so you can read it and contribute, but you may not distribute it or
make changes or new works based on it. Copyright (c) 2026 Itzz_Fabi.
