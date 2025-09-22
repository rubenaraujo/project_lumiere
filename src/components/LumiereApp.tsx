import { useState, useEffect } from "react";
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
  const [genres, setGenres] = useState<{ id: number; name: string; }[]>([]);
  const [shownContentIds, setShownContentIds] = useState<Set<number>>(new Set());
  const [currentFilters, setCurrentFilters] = useState<Filters>({
    contentType: 'movie',
    genres: [],
    yearFrom: '',
    yearTo: '',
    language: 'en',
    minRating: 8
  });

  // Load genres when content type changes
  useEffect(() => {
    const loadGenres = async () => {
      try {
        console.log(`🎭 Loading genres for content type: ${currentFilters.contentType}`);
        const genresData = await getGenresForContentType(currentFilters.contentType);
        setGenres(genresData);
        console.log(`🎭 Loaded ${genresData.length} genres for ${currentFilters.contentType}:`, genresData);
        
        // Debug: Check if Action genre is present
        const actionGenre = genresData.find(g => g.name.toLowerCase().includes('action'));
        if (actionGenre) {
          console.log(`✅ Found Action genre: ID ${actionGenre.id} - ${actionGenre.name}`);
        } else {
          console.log(`❌ No Action genre found in ${currentFilters.contentType} genres`);
        }
      } catch (error) {
        console.error('❌ Error loading genres:', error);
        toast({
          title: "Error loading genres",
          description: "Could not load the genre list.",
          variant: "destructive",
        });
      }
    };

    loadGenres();
  }, [currentFilters.contentType, toast]);

  const handleFiltersChange = (filters: Filters) => {
    setCurrentFilters(filters);
    // Clear current content and cache when filters change
    setContent(null);
    setShownContentIds(new Set());
    // Clear the global suggestion pool
    clearSuggestionPool();
  };

  const handleGetSuggestion = async () => {
    setIsLoading(true);
    try {
      const suggestion = await getRandomSuggestion(currentFilters, Array.from(shownContentIds));

      if (suggestion) {
        setContent(suggestion);

        // Check if this is a reset (same ID as first suggestion means pool was exhausted)
        if (shownContentIds.has(suggestion.id)) {
          console.log('🔄 Pool exhausted, resetting shown content cache');
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
          title: "No suggestion found",
          description: "Try adjusting the filters to find more content.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error getting suggestion:', error);
      toast({
        title: "Error fetching suggestion",
        description: "Please try again in a few moments.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
                  Suggestion for you
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
                    Ready to discover something amazing?
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Set the filters on the side and click "Find content" to discover
                    high-quality movies, series, and mini-series personalized for you.
                  </p>
                  <Button
                    variant="spotlight"
                    size="lg"
                    className="lg:hidden"
                    onClick={handleGetSuggestion}
                    disabled={isLoading}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isLoading ? "Finding..." : "Find content"}
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
            {isLoading ? "..." : "Suggest"}
          </Button>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default LumiereApp;