import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSuggestionPool,
  discoverContent,
  getCast,
  getContentDetails,
  getGenres,
  getGenresForContentType,
  getRandomSuggestion,
  getWatchProviders,
  type Filters,
} from "./tmdb";

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

const baseFilters: Filters = {
  contentType: "movie",
  genres: [],
  yearFrom: "",
  yearTo: "",
  language: "en",
  minRating: 8,
};

describe("tmdb service", () => {
  beforeEach(() => {
    clearSuggestionPool();
    vi.restoreAllMocks();
  });

  describe("getGenres", () => {
    it("requests the genre list without duplicating the 'language' query param", async () => {
      const fetchMock = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(jsonResponse({ genres: [{ id: 28, name: "Action" }] }) as Response);

      const genres = await getGenres("movie");

      expect(genres).toEqual([{ id: 28, name: "Action" }]);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
      expect(requestedUrl.pathname).toBe("/3/genre/movie/list");
      // Regression test: a duplicated 'language' param previously caused
      // TMDb to respond with a 400 "Invalid parameters" error.
      expect(requestedUrl.searchParams.getAll("language")).toEqual(["pt-PT"]);
    });

    it("throws a descriptive error when the API responds with a non-ok status", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse({}, false, 400) as Response);

      await expect(getGenres("movie")).rejects.toThrow("TMDb API error: 400");
    });
  });

  describe("getGenresForContentType", () => {
    it("maps 'miniseries' to the 'tv' genre endpoint", async () => {
      const fetchMock = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(jsonResponse({ genres: [] }) as Response);

      await getGenresForContentType("miniseries");

      const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
      expect(requestedUrl.pathname).toBe("/3/genre/tv/list");
    });

    it("passes through 'movie' and 'tv' unchanged", async () => {
      const fetchMock = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(jsonResponse({ genres: [] }) as Response);

      await getGenresForContentType("tv");

      const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
      expect(requestedUrl.pathname).toBe("/3/genre/tv/list");
    });
  });

  describe("discoverContent", () => {
    it("builds discover params from filters and normalizes movie results", async () => {
      const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
        jsonResponse({
          results: [
            {
              id: 1,
              title: "Example Movie",
              release_date: "2020-01-01",
              genre_ids: [28],
            },
          ],
          total_pages: 1,
          total_results: 1,
        }) as Response
      );

      const result = await discoverContent(
        { ...baseFilters, genres: [28, 12], yearFrom: "2000", yearTo: "2010" },
        2
      );

      const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
      expect(requestedUrl.pathname).toBe("/3/discover/movie");
      expect(requestedUrl.searchParams.get("page")).toBe("2");
      expect(requestedUrl.searchParams.get("with_genres")).toBe("28,12");
      expect(requestedUrl.searchParams.get("primary_release_date.gte")).toBe("2000-01-01");
      expect(requestedUrl.searchParams.get("primary_release_date.lte")).toBe("2010-12-31");
      expect(requestedUrl.searchParams.get("with_original_language")).toBe("en");

      expect(result.results[0].title).toBe("Example Movie");
    });

    it("uses TV date filters and searches the 'tv' endpoint for miniseries", async () => {
      const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
        jsonResponse({
          results: [{ id: 2, name: "Example Show", first_air_date: "2021-05-05", genre_ids: [] }],
          total_pages: 1,
          total_results: 1,
        }) as Response
      );

      const result = await discoverContent({
        ...baseFilters,
        contentType: "miniseries",
        yearFrom: "2021",
      });

      const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
      expect(requestedUrl.pathname).toBe("/3/discover/tv");
      expect(requestedUrl.searchParams.get("first_air_date.gte")).toBe("2021-01-01");

      // Results are normalized so TV 'name' becomes 'title'.
      expect(result.results[0].title).toBe("Example Show");
    });

    it("omits 'with_original_language' when language is 'all'", async () => {
      const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
        jsonResponse({ results: [], total_pages: 0, total_results: 0 }) as Response
      );

      await discoverContent({ ...baseFilters, language: "all" });

      const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
      expect(requestedUrl.searchParams.has("with_original_language")).toBe(false);
    });
  });

  describe("getContentDetails", () => {
    it("requests details without duplicating the 'language' query param", async () => {
      const fetchMock = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(jsonResponse({ id: 1, credits: {} }) as Response);

      await getContentDetails("movie", 1);

      const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
      expect(requestedUrl.pathname).toBe("/3/movie/1");
      expect(requestedUrl.searchParams.get("append_to_response")).toBe("credits,watch/providers");
      // Regression test: a duplicated 'language' param previously caused
      // TMDb to respond with a 400 "Invalid parameters" error.
      expect(requestedUrl.searchParams.getAll("language")).toEqual(["pt-PT"]);
    });

    it("maps 'miniseries' to the 'tv' details endpoint", async () => {
      const fetchMock = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(jsonResponse({ id: 5 }) as Response);

      await getContentDetails("miniseries", 5);

      const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
      expect(requestedUrl.pathname).toBe("/3/tv/5");
    });
  });

  describe("getRandomSuggestion", () => {
    it("returns an item that has not been excluded yet", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue(
        jsonResponse({
          results: [
            { id: 1, title: "A", genre_ids: [] },
            { id: 2, title: "B", genre_ids: [] },
          ],
          total_pages: 1,
          total_results: 2,
        }) as Response
      );

      const suggestion = await getRandomSuggestion(baseFilters, [1]);

      expect(suggestion?.id).toBe(2);
    });

    it("returns null instead of throwing when the request fails", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse({}, false, 500) as Response);

      const suggestion = await getRandomSuggestion(baseFilters, []);

      expect(suggestion).toBeNull();
    });

    it("resolves with the first page without waiting for subsequent pages to finish loading", async () => {
      let resolveSecondPage!: (value: Response) => void;
      const secondPagePromise = new Promise<Response>((resolve) => {
        resolveSecondPage = resolve;
      });

      vi.spyOn(global, "fetch").mockImplementation(async (input) => {
        const url = new URL(input as string);
        if (url.searchParams.get("page") === "1") {
          return jsonResponse({
            results: [{ id: 1, title: "A", genre_ids: [] }],
            total_pages: 2,
            total_results: 2,
          }) as Response;
        }
        // Page 2+: left pending on purpose for the duration of this test.
        return secondPagePromise;
      });

      const suggestion = await getRandomSuggestion(baseFilters, []);

      expect(suggestion?.id).toBe(1);

      // Clean up the still-pending request so it doesn't leak into other tests.
      resolveSecondPage(
        jsonResponse({ results: [], total_pages: 2, total_results: 0 }) as Response
      );
    });

    it("uses the same 'sort_by' value for every page within a single pool build", async () => {
      const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (input) => {
        const url = new URL(input as string);
        const page = url.searchParams.get("page");
        return jsonResponse({
          results: [{ id: page === "1" ? 1 : 2, title: page === "1" ? "A" : "B", genre_ids: [] }],
          total_pages: 2,
          total_results: 2,
        }) as Response;
      });

      await getRandomSuggestion(baseFilters, []);
      // Give the background continuation (page 2) a chance to run.
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const sortByValues = fetchMock.mock.calls.map(
        ([input]) => new URL(input as string).searchParams.get("sort_by")
      );
      expect(sortByValues[0]).toBe(sortByValues[1]);
    });

    it("propagates an AbortError instead of swallowing it as a regular failure", async () => {
      const controller = new AbortController();
      vi.spyOn(global, "fetch").mockImplementation(() =>
        Promise.reject(new DOMException("Aborted", "AbortError"))
      );

      await expect(
        getRandomSuggestion(baseFilters, [], controller.signal)
      ).rejects.toMatchObject({ name: "AbortError" });
    });
  });

  describe("getCast", () => {
    it("maps and limits the top-billed cast members", () => {
      const details = {
        credits: {
          cast: [
            { id: 1, name: "Actor One", character: "Hero", profile_path: "/one.jpg" },
            { id: 2, name: "Actor Two", character: "Villain", profile_path: null },
            { id: 3, name: "Actor Three", character: "Sidekick", profile_path: "/three.jpg" },
          ],
        },
      };

      const cast = getCast(details, 2);

      expect(cast).toEqual([
        { id: 1, name: "Actor One", character: "Hero", profile_path: "/one.jpg" },
        { id: 2, name: "Actor Two", character: "Villain", profile_path: null },
      ]);
    });

    it("returns an empty array when there is no cast information", () => {
      expect(getCast({})).toEqual([]);
    });
  });

  describe("getWatchProviders", () => {
    const details = {
      "watch/providers": {
        results: {
          PT: { link: "https://tmdb.org/pt", flatrate: [{ provider_id: 1, provider_name: "Netflix", logo_path: "/n.jpg" }] },
          US: { link: "https://tmdb.org/us", flatrate: [{ provider_id: 2, provider_name: "Hulu", logo_path: "/h.jpg" }] },
        },
      },
    };

    it("returns providers for the requested region", () => {
      expect(getWatchProviders(details, "PT")).toEqual(details["watch/providers"].results.PT);
    });

    it("falls back to the US region when the requested region has no data", () => {
      expect(getWatchProviders(details, "FR")).toEqual(details["watch/providers"].results.US);
    });

    it("returns null when there is no watch provider information", () => {
      expect(getWatchProviders({}, "PT")).toBeNull();
    });
  });
});
