# FabiMvurice Interactive (FMI) Site

The official website for FabiMvurice Interactive, a studio building Minecraft
modpacks, mods, resource packs, Roblox games, and programs. It is a static,
content-driven portfolio built with Astro.

Live at [www.fabimvurice-interactive.de](https://www.fabimvurice-interactive.de).

## Stack

- Astro 5 (static output, zero JS by default)
- Hand-written CSS design tokens in OKLCH (no Tailwind), see `src/styles/tokens.css`
- Lenis for smooth scroll, IntersectionObserver for reveals (`src/scripts/motion.ts`)
- Projects and News modeled as content collections (`src/content.config.ts`)
- Self-hosted fonts: woff2 in `public/fonts/`, `@font-face` in `src/styles/fonts.css`

## Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at http://localhost:4321 |
| `npm run build` | Build the static site to `dist/` |
| `npm run preview` | Preview the production build locally |

## Layout

- `src/pages/` - routes (home, `/work`, `/work/[id]`, `/news`, `/news/[id]`, `/roadmap`, `/about`, `/contact`)
- `src/components/` - Nav, Footer, Mark, Button, ProjectCard, PageHeader
- `src/layouts/BaseLayout.astro` - shell, font preloads, head
- `src/styles/` - `tokens.css`, `fonts.css`, `global.css`
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
