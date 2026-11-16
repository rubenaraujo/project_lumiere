import { useCallback, useEffect, useRef, useState } from "react";
import {
  getRandomSuggestion,
  isAbortError,
  type ContentItem,
  type ContentType,
  type Filters,
} from "@/services/tmdb";
import { loadShownIds, saveShownIds } from "@/lib/persistence";

export type SuggestionStatus = "idle" | "loading" | "success" | "empty" | "error";

// Owns the "give me a suggestion" flow: the current item, request status,
// cancellation of stale requests and the persisted list of already-shown ids.
// `locale` is only used to reset: titles/synopses are localized, so a
// suggestion fetched in another language is stale.
export const useSuggestion = (filters: Filters, locale: string) => {
  const [content, setContent] = useState<ContentItem | null>(null);
  // Type of the shown title: picked titles (trending, watchlist, shared) may differ from the filters.
  const [contentType, setContentType] = useState<ContentType>(filters.contentType);
  const [status, setStatus] = useState<SuggestionStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const filtersKey = JSON.stringify(filters);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const shownIdsRef = useRef<number[]>([]);
  // AbortController of the request in flight, so a new request (filter
  // change, extra click) cancels the stale one instead of racing with it.
  const abortRef = useRef<AbortController | null>(null);

  // New filters: cancel pending work, drop the current item and resume the
  // shown-ids history saved for these filters.
  useEffect(() => {
    abortRef.current?.abort();
    shownIdsRef.current = loadShownIds(filtersKey);
    setContent(null);
    setError(null);
    setStatus("idle");
  }, [filtersKey, locale]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const fetchSuggestion = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);

    try {
      const suggestion = await getRandomSuggestion(filtersRef.current, shownIdsRef.current, controller.signal);
      if (controller.signal.aborted) return;

      if (!suggestion) {
        setStatus("empty");
        return;
      }

      // Already shown means the pool was exhausted and restarted.
      const shown = shownIdsRef.current.includes(suggestion.id)
        ? [suggestion.id]
        : [...shownIdsRef.current, suggestion.id];
      shownIdsRef.current = shown;
      saveShownIds(JSON.stringify(filtersRef.current), shown);

      setContentType(filtersRef.current.contentType);
      setContent(suggestion);
      setStatus("success");
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error("Error getting suggestion:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    }
  }, []);

  // Shows a title the user picked directly (e.g. from the trending posters).
  // It adds a history entry so the browser's back button returns to the landing view.
  const pushedRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setContent(null);
    setError(null);
    setStatus("idle");
  }, []);

  const showItem = useCallback((item: ContentItem, type: ContentType, push = true) => {
    abortRef.current?.abort();
    if (push && !pushedRef.current) {
      window.history.pushState(window.history.state, "");
      pushedRef.current = true;
    }
    setError(null);
    setContentType(type);
    setContent(item);
    setStatus("success");
  }, []);

  useEffect(() => {
    const onPop = () => {
      pushedRef.current = false;
      reset();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [reset]);

  // Back button: undo the pushed entry if there is one, otherwise just reset.
  const goBack = useCallback(() => {
    if (pushedRef.current) window.history.back();
    else reset();
  }, [reset]);

  return { content, contentType, status, error, isLoading: status === "loading", fetchSuggestion, showItem, goBack };
};
