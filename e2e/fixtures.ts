import { test as base, expect, type Page } from "@playwright/test";

const item = (id: number, title: string) => ({
  id,
  title,
  overview: `${title} synopsis.`,
  poster_path: `/p${id}.jpg`,
  backdrop_path: `/b${id}.jpg`,
  vote_average: 8.2,
  vote_count: 1500,
  release_date: "2021-03-04",
  genre_ids: [18],
  original_language: "en",
  popularity: 10,
});

export const SUGGESTED = item(100, "Suggested Film");
export const TRENDING = [item(201, "Trending One"), item(202, "Trending Two")];
export const SHARED = item(300, "Shared Film");

const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const json = (body: unknown) => ({ contentType: "application/json", body: JSON.stringify(body) });

// Every TMDb request is answered locally so the tests are fast and offline.
export const mockTmdb = async (page: Page) => {
  await page.route("https://image.tmdb.org/**", (route) =>
    route.fulfill({ contentType: "image/png", body: PIXEL })
  );
  await page.route("https://www.imdb.com/**", (route) => route.fulfill({ contentType: "image/png", body: PIXEL }));
  await page.route("https://www.themoviedb.org/**", (route) => route.fulfill({ contentType: "image/png", body: PIXEL }));

  await page.route("https://api.themoviedb.org/3/**", (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/3", "");
    if (path.startsWith("/genre/")) return route.fulfill(json({ genres: [{ id: 18, name: "Drama" }] }));
    if (path.startsWith("/trending/")) return route.fulfill(json({ results: TRENDING, total_pages: 1, total_results: 2 }));
    if (path.startsWith("/discover/"))
      return route.fulfill(json({ results: [SUGGESTED], total_pages: 1, total_results: 1 }));
    if (path.endsWith("/recommendations"))
      return route.fulfill(json({ results: [TRENDING[0]], total_pages: 1, total_results: 1 }));
    if (path === "/movie/300" && !url.searchParams.has("append_to_response")) return route.fulfill(json({ ...SHARED, genres: [{ id: 18, name: "Drama" }] }));
    return route.fulfill(
      json({
        imdb_id: "tt0000100",
        runtime: 120,
        credits: { cast: [], crew: [{ id: 1, job: "Director", name: "Jane Doe" }] },
        videos: { results: [{ key: "abc123", site: "YouTube", type: "Trailer", official: true }] },
      })
    );
  });
};

export const test = base.extend({
  page: async ({ page }, applyFixture) => {
    await mockTmdb(page);
    await applyFixture(page);
  },
});

export { expect };
