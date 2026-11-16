import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "@/services/tmdb";
import {
  filtersToSearch,
  loadInitialFilters,
  loadShownIds,
  parseFiltersFromSearch,
  saveFilters,
  saveShownIds,
} from "./persistence";

describe("persistence", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    localStorage.clear();
  });

  describe("URL serialization", () => {
    it("round-trips non-default filters", () => {
      const filters = {
        contentType: "tv" as const,
        genres: [18, 35],
        yearFrom: "2010",
        yearTo: "2020",
        language: "ko",
        minRating: 7.5,
      };

      expect(parseFiltersFromSearch(filtersToSearch(filters))).toEqual(filters);
    });

    it("produces a clean URL for the default filters", () => {
      expect(filtersToSearch(DEFAULT_FILTERS)).toBe("");
    });

    it("ignores invalid values from an untrusted URL", () => {
      const parsed = parseFiltersFromSearch("?type=evil&genres=abc,-1,28&from=20x0&lang=<script>&rating=99");

      expect(parsed).toEqual({ genres: [28] });
    });
  });

  describe("loadInitialFilters", () => {
    it("falls back to defaults when nothing is stored", () => {
      expect(loadInitialFilters()).toEqual(DEFAULT_FILTERS);
    });

    it("restores filters saved in localStorage", () => {
      saveFilters({ ...DEFAULT_FILTERS, contentType: "miniseries", minRating: 6 });
      window.history.replaceState(null, "", "/");

      expect(loadInitialFilters()).toMatchObject({ contentType: "miniseries", minRating: 6 });
    });

    it("lets URL params win over localStorage and keeps the URL in sync when saving", () => {
      localStorage.setItem("lumiere.filters.v1", JSON.stringify({ ...DEFAULT_FILTERS, contentType: "tv" }));
      window.history.replaceState(null, "", "/?type=movie&lang=fr");

      const filters = loadInitialFilters();
      expect(filters).toMatchObject({ contentType: "movie", language: "fr" });

      saveFilters({ ...filters, genres: [12] });
      expect(window.location.search).toBe("?genres=12&lang=fr");
    });

    it("survives corrupted localStorage", () => {
      localStorage.setItem("lumiere.filters.v1", "{not json");

      expect(loadInitialFilters()).toEqual(DEFAULT_FILTERS);
    });
  });

  describe("shown ids", () => {
    it("stores ids per filter set and caps the history", () => {
      saveShownIds("a", Array.from({ length: 250 }, (_, i) => i));
      saveShownIds("b", [1, 2]);

      expect(loadShownIds("a")).toHaveLength(200);
      expect(loadShownIds("a").at(-1)).toBe(249);
      expect(loadShownIds("b")).toEqual([1, 2]);
      expect(loadShownIds("missing")).toEqual([]);
    });

    it("evicts the least recently used filter sets", () => {
      for (let i = 0; i < 25; i++) saveShownIds(`k${i}`, [i]);

      expect(loadShownIds("k0")).toEqual([]);
      expect(loadShownIds("k24")).toEqual([24]);
    });
  });
});
