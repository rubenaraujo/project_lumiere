# Lumiere - Discover Quality Movies and Series

A web app to discover high-quality movies, series and miniseries using the TMDb API. Available in Portuguese and English.

## Features

- **Smart filtering**: content type (movie / series / miniseries), genres, release years, original language and minimum rating
- **Random quality suggestions** that don't repeat, even after a reload
- **Shareable filters**: the current filters live in the URL and are also remembered in `localStorage`
- **Full details**: synopsis, cast, director/creator, where to watch, IMDb/TMDb links and trailer search
- **Bilingual UI** (PT / EN): the interface and the TMDb content follow the selected language
- **Responsive, dark cinematic design**

## Tech stack

React 18 + TypeScript (strict), Vite, Tailwind CSS, shadcn/ui (Radix), TanStack Query, Vitest + Testing Library.

## Setup

1. Install dependencies: `npm install`
2. Get TMDb credentials at <https://www.themoviedb.org/settings/api>
3. Copy `.env.example` to `.env.local` and fill in **one** of:
   - `VITE_TMDB_READ_TOKEN`: the v4 *API Read Access Token* (sent as a Bearer header; preferred)
   - `VITE_TMDB_API_KEY`: the v3 *API Key* (sent as a query parameter)
4. Run: `npm run dev`

> Vite inlines `VITE_*` variables into the client bundle, so the credentials are visible to anyone using the deployed site. TMDb keys are free and read-only, but don't reuse one that has other permissions.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (strict) |
| `npm test` | Unit and component tests |

## Project structure

```
src/
  components/      UI (filters, content card, skeletons) + shadcn primitives in ui/
  hooks/           useSuggestion: request lifecycle, cancellation, shown history
  i18n/            PT/EN messages, provider and useI18n hook
  lib/             persistence (URL + localStorage), utils
  services/tmdb/   client, types, discover, suggestions (pool), details
```

## Deployment

Pushes to `main` run lint, type check and tests, then build and deploy to GitHub Pages: <https://rubenaraujo.github.io/project_lumiere/>. Pull requests run the checks and a build, without deploying.

Add the credentials as repository **secrets** (Settings → Secrets and variables → Actions): `VITE_TMDB_READ_TOKEN` and/or `VITE_TMDB_API_KEY`.

## Credits

Developed by Ruben Araujo. Data provided by [The Movie Database (TMDb)](https://www.themoviedb.org/); this product uses the TMDb API but is not endorsed or certified by TMDb.
