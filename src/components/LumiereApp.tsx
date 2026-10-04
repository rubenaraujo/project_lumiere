import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import Header from "./Header";
import FilterPanel from "./FilterPanel";
import ContentCard from "./ContentCard";
import Footer from "./Footer";

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Sparkles } from "lucide-react";
import {
  getRandomSuggestion,
  getGenresForContentType,
  clearSuggestionPool,
  type ContentItem,
  type Filters
} from "../services/tmdb";

const LumiereApp = () => {
  const { toast } = useToast();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shownContentIds, setShownContentIds] = useState<Set<number>>(new Set());
  const [currentFilters, setCurrentFilters] = useState<Filters>({
    contentType: 'movie',
    genres: [],
    yearFrom: '',
    yearTo: '',
    language: 'en',
    minRating: 8
  });
  // Tracks the AbortController for the suggestion request currently in
  // flight, so a new request (filter change, extra click) can cancel a
  // stale one instead of racing with it.
  const suggestionAbortRef = useRef<AbortController | null>(null);

  // Genres are cached per content type by react-query, so switching between
  // "movie"/"tv"/"miniseries" and back doesn't refetch, and in-flight
  // requests are automatically cancelled if they become stale.
  const { data: genres = [], error: genresError } = useQuery({
    queryKey: ['genres', currentFilters.contentType],
    queryFn: ({ signal }) => getGenresForContentType(currentFilters.contentType, signal),
    staleTime: 24 * 60 * 60 * 1000, // genre lists rarely change
  });

  useEffect(() => {
    if (genresError) {
      console.error('❌ Error loading genres:', genresError);
      toast({
        title: "Erro ao carregar géneros",
        description: "Não foi possível carregar a lista de géneros.",
        variant: "destructive",
      });
    }
  }, [genresError, toast]);

  // Abort any in-flight suggestion request when the component unmounts.
  useEffect(() => {
    return () => {
      suggestionAbortRef.current?.abort();
    };
  }, []);

  const handleFiltersChange = (filters: Filters) => {
    // Cancel any suggestion fetch still in flight for the previous filters.
    suggestionAbortRef.current?.abort();
    setCurrentFilters(filters);
    // Clear current content and cache when filters change
    setContent(null);
    setShownContentIds(new Set());
    // Clear the global suggestion pool
    clearSuggestionPool();
  };

  const handleGetSuggestion = async () => {
    // Cancel any suggestion fetch still in flight before starting a new one.
    suggestionAbortRef.current?.abort();
    const controller = new AbortController();
    suggestionAbortRef.current = controller;

    setIsLoading(true);
    try {
      const suggestion = await getRandomSuggestion(
        currentFilters,
        Array.from(shownContentIds),
        controller.signal
      );

      if (suggestion) {
        setContent(suggestion);

        // Check if this is a reset (same ID as first suggestion means pool was exhausted)
        if (shownContentIds.has(suggestion.id)) {
          setShownContentIds(new Set([suggestion.id]));
        } else {
          // Add to shown content cache
          setShownContentIds(prev => new Set([...prev, suggestion.id]));
        }

        // Auto scroll to the suggestion after a short delay
        setTimeout(() => {
          const contentElement = document.getElementById('content-suggestion');
          if (contentElement) {
            contentElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }, 100);
      } else {
        toast({
          title: "Nenhuma sugestão encontrada",
          description: "Tenta ajustar os filtros para encontrar mais conteúdo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        // Superseded by a newer request; nothing to do.
        return;
      }
      console.error('Error getting suggestion:', error);
      toast({
        title: "Erro ao procurar sugestão",
        description: "Por favor tenta novamente dentro de instantes.",
        variant: "destructive",
      });
    } finally {
      if (suggestionAbortRef.current === controller) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Panel */}
          <div className="lg:col-span-1">
            <FilterPanel
              onFiltersChange={handleFiltersChange}
              onGetSuggestion={handleGetSuggestion}
              isLoading={isLoading}
              availableGenres={genres}
            />
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {content ? (
              <div id="content-suggestion" className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground">
                  Sugestão para ti
                </h2>

                <ContentCard
                  content={content}
                  contentType={currentFilters.contentType}
                  genres={genres}
                />
              </div>
            ) : (
              <Card className="shadow-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Pronto para descobrir algo incrível?
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Define os filtros ao lado e clica em "Encontrar conteúdo" para descobrir
                    filmes, séries e minisséries de qualidade personalizados para ti.
                  </p>
                  <Button
                    variant="spotlight"
                    size="lg"
                    className="lg:hidden"
                    onClick={handleGetSuggestion}
                    disabled={isLoading}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isLoading ? "A procurar..." : "Encontrar conteúdo"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Sticky Button - Only show when content is displayed */}
      {content && (
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <Button
            variant="spotlight"
            size="sm"
            className="shadow-lg h-10 px-4"
            onClick={handleGetSuggestion}
            disabled={isLoading}
          >
            <Sparkles className="w-4 h-4 mr-1" />
            {isLoading ? "..." : "Sugerir"}
          </Button>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default LumiereApp;