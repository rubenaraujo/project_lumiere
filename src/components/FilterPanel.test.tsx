import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_FILTERS } from "@/services/tmdb";
import { renderWithProviders } from "@/test/utils";
import FilterPanel from "./FilterPanel";

const genres = [
  { id: 28, name: "Ação" },
  { id: 35, name: "Comédia" },
];

const setup = (overrides: Partial<ComponentProps<typeof FilterPanel>> = {}) => {
  const props = {
    filters: DEFAULT_FILTERS,
    onFiltersChange: vi.fn(),
    onGetSuggestion: vi.fn(),
    isLoading: false,
    availableGenres: genres,
    ...overrides,
  };
  renderWithProviders(<FilterPanel {...props} />);
  return props;
};

describe("FilterPanel", () => {
  it("clears selected genres when the content type changes", async () => {
    const props = setup({ filters: { ...DEFAULT_FILTERS, genres: [28] } });

    await userEvent.click(screen.getByRole("button", { name: "Séries" }));

    expect(props.onFiltersChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      contentType: "tv",
      genres: [],
    });
  });

  it("toggles genres as filter chips", async () => {
    const props = setup({ filters: { ...DEFAULT_FILTERS, genres: [28] } });

    await userEvent.click(screen.getByRole("button", { name: "Comédia" }));
    expect(props.onFiltersChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, genres: [28, 35] });

    await userEvent.click(screen.getByRole("button", { name: "Ação" }));
    expect(props.onFiltersChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, genres: [] });
  });

  it("resets every filter to its default", async () => {
    const props = setup({ filters: { ...DEFAULT_FILTERS, contentType: "tv", minRating: 5 } });

    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(props.onFiltersChange).toHaveBeenCalledWith(DEFAULT_FILTERS);
  });

  it("offers a retry when genres fail to load", async () => {
    const onRetryGenres = vi.fn();
    setup({ availableGenres: [], genresError: true, onRetryGenres });

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(onRetryGenres).toHaveBeenCalledTimes(1);
  });
});
