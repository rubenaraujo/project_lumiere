import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import { getRandomSuggestion, type ContentItem } from "@/services/tmdb";
import LumiereApp from "./LumiereApp";

vi.mock("@/services/tmdb", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/tmdb")>();
  return {
    ...actual,
    isTmdbConfigured: () => true,
    getGenresForContentType: vi.fn().mockResolvedValue([{ id: 18, name: "Drama" }]),
    getRandomSuggestion: vi.fn(),
    getContentDetails: vi.fn().mockResolvedValue({
      imdb_id: "tt0001",
      credits: {
        cast: [{ id: 1, name: "Actor One", character: "Hero" }],
        crew: [{ id: 2, job: "Director", name: "Jane Doe" }],
      },
    }),
  };
});

const getRandomSuggestionMock = vi.mocked(getRandomSuggestion);

const movie: ContentItem = {
  id: 1,
  title: "Movie One",
  overview: "A great film.",
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  vote_average: 8.4,
  vote_count: 1234,
  release_date: "2020-05-01",
  genre_ids: [18],
  original_language: "en",
  popularity: 10,
};

const clickFind = () => userEvent.click(screen.getAllByRole("button", { name: "Encontrar conteúdo" })[0]);

describe("LumiereApp", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    getRandomSuggestionMock.mockReset();
  });

  it("shows a skeleton while loading, then the suggestion with responsive lazy images", async () => {
    let resolveSuggestion!: (item: ContentItem) => void;
    getRandomSuggestionMock.mockReturnValue(new Promise((resolve) => (resolveSuggestion = resolve)));

    renderWithProviders(<LumiereApp />);
    await clickFind();

    expect(screen.getByTestId("content-skeleton")).toBeInTheDocument();

    resolveSuggestion(movie);

    expect(await screen.findByRole("heading", { name: "Movie One" })).toBeInTheDocument();
    expect(screen.queryByTestId("content-skeleton")).not.toBeInTheDocument();

    const poster = screen.getByAltText("Movie One");
    expect(poster).toHaveAttribute("loading", "lazy");
    expect(poster.getAttribute("srcset")).toContain("/w342/poster.jpg 342w");
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir no IMDb" })).toHaveAttribute(
      "href",
      "https://www.imdb.com/title/tt0001/"
    );
  });

  it("shows an error with a retry that recovers", async () => {
    getRandomSuggestionMock.mockRejectedValueOnce(new Error("TMDb API error: 500")).mockResolvedValue(movie);
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithProviders(<LumiereApp />);
    await clickFind();

    expect(await screen.findByText("Erro ao procurar sugestão")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByRole("heading", { name: "Movie One" })).toBeInTheDocument();
    expect(screen.queryByText("Erro ao procurar sugestão")).not.toBeInTheDocument();
  });

  it("tells the user when nothing matches the filters", async () => {
    getRandomSuggestionMock.mockResolvedValue(null);

    renderWithProviders(<LumiereApp />);
    await clickFind();

    expect(await screen.findByText("Nenhuma sugestão encontrada")).toBeInTheDocument();
  });

  it("restores filters from the URL and remembers shown suggestions across reloads", async () => {
    window.history.replaceState(null, "", "/?type=tv");
    getRandomSuggestionMock.mockResolvedValue(movie);

    const { unmount } = renderWithProviders(<LumiereApp />);
    await clickFind();
    await screen.findByRole("heading", { name: "Movie One" });

    expect(getRandomSuggestionMock.mock.calls[0][0]).toMatchObject({ contentType: "tv" });
    unmount();

    // Simulated reload: same URL, shown ids come back from localStorage.
    renderWithProviders(<LumiereApp />);
    await clickFind();
    await waitFor(() => expect(getRandomSuggestionMock).toHaveBeenCalledTimes(2));

    expect(getRandomSuggestionMock.mock.calls[1][1]).toEqual([1]);
  });

  it("asks for another suggestion with the space bar", async () => {
    getRandomSuggestionMock.mockResolvedValue(movie);

    renderWithProviders(<LumiereApp />);
    await userEvent.keyboard(" ");

    expect(await screen.findByRole("heading", { name: "Movie One" })).toBeInTheDocument();
    expect(getRandomSuggestionMock).toHaveBeenCalledTimes(1);
  });

  it("goes back from a picked trending title with the back button", async () => {
    getRandomSuggestionMock.mockResolvedValue(movie);

    renderWithProviders(<LumiereApp />);
    await clickFind();
    await screen.findByRole("heading", { name: "Movie One" });

    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));

    expect(screen.queryByRole("heading", { name: "Movie One" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Pronto para descobrir/ })).toBeInTheDocument();
  });

  it("saves a title to the watchlist and reopens it from the list", async () => {
    getRandomSuggestionMock.mockResolvedValue(movie);

    renderWithProviders(<LumiereApp />);
    await clickFind();
    await screen.findByRole("heading", { name: "Movie One" });

    await userEvent.click(screen.getByRole("button", { name: "Guardar na lista" }));
    await userEvent.click(screen.getByRole("button", { name: /A minha lista/ }));

    expect(await screen.findByRole("heading", { name: "A minha lista" })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Movie One" }));

    expect(await screen.findByRole("heading", { name: "Movie One", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover da lista" })).toHaveAttribute("aria-pressed", "true");
  });

  it("switches the interface language", async () => {
    renderWithProviders(<LumiereApp />);

    await userEvent.click(screen.getByRole("button", { name: /^en$/i }));

    expect(screen.getAllByRole("button", { name: "Find content" }).length).toBeGreaterThan(0);
    expect(document.documentElement.lang).toBe("en");
  });
});
