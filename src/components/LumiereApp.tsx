import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useSuggestion } from "@/hooks/useSuggestion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSwipeLeft } from "@/hooks/useSwipe";
import { useWatchlist, type WatchlistEntry } from "@/lib/watchlist";
import {
  loadInitialFilters,
  parseSharedItem,
  saveFilters,
} from "@/lib/persistence";
import {
  getGenresForContentType,
  getItemById,
  isTmdbConfigured,
  type ContentItem,
  type Filters,
} from "@/services/tmdb";
import Header from "./Header";
import FilterPanel from "./FilterPanel";
import FiltersSheet from "./FiltersSheet";
import DiscoverHero from "./DiscoverHero";
import ContentCard from "./ContentCard";
import ContentCardSkeleton from "./ContentCardSkeleton";
import Footer from "./Footer";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

const WatchlistView = lazy(() => import("./WatchlistView"));

const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";

// Read once, before saveFilters rewrites the URL.
const initialSharedItem = parseSharedItem(window.location.search);

// Keys that should keep their native behaviour when focus is on them.
const INTERACTIVE =
  'input, textarea, select, button, a, [role="slider"], [role="combobox"], [contenteditable="true"]';

const LumiereApp = () => {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState<Filters>(loadInitialFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)", true);
  const [view, setView] = useState<"discover" | "watchlist">("discover");
  const { entries } = useWatchlist();
  const {
    content,
    contentType,
    status,
    isLoading,
    fetchSuggestion,
    showItem,
    goBack,
  } = useSuggestion(filters, locale);

  // Opens a title from a shared link (?id=..&t=..).
  useEffect(() => {
    if (!initialSharedItem) return;
    const controller = new AbortController();
    getItemById(
      initialSharedItem.contentType,
      initialSharedItem.id,
      controller.signal,
    )
      .then((item) => showItem(item, initialSharedItem.contentType, false))
      .catch(() => {});
    return () => controller.abort();
  }, [showItem]);

  const pickSimilar = useCallback(
    (item: ContentItem) => showItem(item, contentType),
    [showItem, contentType],
  );

  const openFromWatchlist = (entry: WatchlistEntry) => {
    setView("discover");
    showItem(entry.item, entry.contentType);
  };

  const swipe = useSwipeLeft(() => {
    if (content && !isLoading && !sheetOpen) fetchSuggestion();
  }, !isDesktop);

  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  // Genres are cached per locale + content type by react-query, so switching
  // between types doesn't refetch and stale requests are cancelled.
  const {
    data: genres = [],
    isError: genresError,
    refetch: refetchGenres,
  } = useQuery({
    queryKey: ["genres", locale, filters.contentType],
    queryFn: ({ signal }) =>
      getGenresForContentType(filters.contentType, signal),
    staleTime: 24 * 60 * 60 * 1000, // genre lists rarely change
  });

  // The shown title may be of another type than the filters (watchlist, shared link).
  const { data: cardGenres = [] } = useQuery({
    queryKey: ["genres", locale, contentType],
    queryFn: ({ signal }) => getGenresForContentType(contentType, signal),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: contentType !== filters.contentType,
  });

  // Bring a new suggestion into view (matters on mobile).
  useEffect(() => {
    if (content) {
      const reduced = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      document.getElementById("content-suggestion")?.scrollIntoView?.({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    }
  }, [content]);

  // Space or right arrow asks for another suggestion, unless the user is
  // operating a control that already uses those keys.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "ArrowRight") return;
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.defaultPrevented
      )
        return;
      if (sheetOpen || isLoading) return;
      if ((event.target as HTMLElement | null)?.closest?.(INTERACTIVE)) return;
      event.preventDefault();
      fetchSuggestion();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fetchSuggestion, isLoading, sheetOpen]);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const panelProps = {
    filters,
    onFiltersChange: setFilters,
    isLoading,
    availableGenres: genres,
    genresError,
    onRetryGenres: () => refetchGenres(),
  };

  return (
    <div className="relative isolate min-h-screen flex flex-col bg-background">
      {/* Blurred backdrop of the current suggestion; it stays while the next one loads. */}
      {content?.backdrop_path && (
        <div
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
          aria-hidden="true"
        >
          <img
            key={content.backdrop_path}
            src={`${BACKDROP_BASE}${content.backdrop_path}`}
            alt=""
            className="h-full w-full scale-110 object-cover opacity-30 blur-2xl animate-in fade-in duration-700 motion-reduce:animate-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>
      )}

      <Header
        watchlistCount={entries.length}
        watchlistActive={view === "watchlist"}
        onToggleWatchlist={() =>
          setView((current) =>
            current === "watchlist" ? "discover" : "watchlist",
          )
        }
      />

      <main className="flex-1 container mx-auto px-4 py-6 pb-28 lg:py-8 lg:pb-8">
        {!isTmdbConfigured() && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("error.notConfigured")}</AlertDescription>
          </Alert>
        )}

        {view === "watchlist" ? (
          <Suspense fallback={null}>
            <WatchlistView onOpen={openFromWatchlist} />
          </Suspense>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
            {isDesktop && (
              <aside
                aria-label={t("filters.title")}
                className="sticky top-20 flex max-h-[calc(100vh-6.5rem)] flex-col self-start overflow-hidden rounded-2xl border border-border bg-card/85 shadow-card backdrop-blur-sm"
              >
                <FilterPanel
                  {...panelProps}
                  onGetSuggestion={fetchSuggestion}
                />
              </aside>
            )}

            <div
              className="min-w-0 space-y-6"
              aria-live="polite"
              aria-busy={isLoading}
            >
              {status === "error" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("error.title")}</AlertTitle>
                  <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
                    <span>{t("error.body")}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchSuggestion}
                    >
                      {t("filters.retry")}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {status === "empty" && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("error.noResultsTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("error.noResultsBody")}
                  </AlertDescription>
                </Alert>
              )}

              {isLoading && !content ? (
                <ContentCardSkeleton />
              ) : content ? (
                <div
                  id="content-suggestion"
                  {...swipe}
                  className={`space-y-4 scroll-mt-20 transition-opacity ${isLoading ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-sans font-medium uppercase tracking-widest text-muted-foreground">
                      {t("app.suggestionTitle")}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={goBack}>
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                      {t("app.back")}
                    </Button>
                  </div>
                  <ContentCard
                    key={content.id}
                    content={content}
                    contentType={contentType}
                    genres={
                      contentType === filters.contentType ? genres : cardGenres
                    }
                    onPickSimilar={pickSimilar}
                  />
                </div>
              ) : (
                <DiscoverHero
                  contentType={filters.contentType}
                  onPick={(item) => showItem(item, filters.contentType)}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile action bar: filters sheet plus the primary action. */}
      {!isDesktop && view === "discover" && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-border bg-background/90 px-4 py-3 backdrop-blur">
          <Button
            variant="outline"
            size="lg"
            className="h-12"
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            {t("filters.title")}
          </Button>
          <Button
            variant="spotlight"
            size="lg"
            className="h-12 flex-1 text-base"
            onClick={fetchSuggestion}
            disabled={isLoading}
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {isLoading
              ? t("action.searching")
              : content
                ? t("action.suggest")
                : t("action.find")}
          </Button>
        </div>
      )}

      {!isDesktop && (
        <FiltersSheet open={sheetOpen} onClose={closeSheet}>
          <FilterPanel
            {...panelProps}
            actionLabel={t("filters.apply")}
            onGetSuggestion={() => {
              closeSheet();
              fetchSuggestion();
            }}
          />
        </FiltersSheet>
      )}

      <Footer />
    </div>
  );
};

export default LumiereApp;
