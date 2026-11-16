import { Sparkles } from "lucide-react";
import { DEFAULT_FILTERS, type ContentType, type Filters, type Genre } from "@/services/tmdb";
import { useI18n } from "@/i18n";
import { Button } from "./ui/button";
import ContentTypeSelector from "./ContentTypeSelector";
import AdvancedFilters from "./AdvancedFilters";

interface FilterPanelProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onGetSuggestion: () => void;
  isLoading: boolean;
  availableGenres: Genre[];
  genresError?: boolean;
  onRetryGenres?: () => void;
  actionLabel?: string;
}

const FilterPanel = ({
  filters,
  onFiltersChange,
  onGetSuggestion,
  isLoading,
  availableGenres,
  genresError = false,
  onRetryGenres,
  actionLabel,
}: FilterPanelProps) => {
  const { t } = useI18n();

  const handleContentTypeChange = (contentType: ContentType) => {
    // Genre IDs differ between movies and TV, so the selection is dropped.
    onFiltersChange({ ...filters, contentType, genres: [] });
  };

  const handleGenreChange = (genreId: number, checked: boolean) => {
    const genres = checked
      ? [...filters.genres, genreId]
      : filters.genres.filter((id) => id !== genreId);
    onFiltersChange({ ...filters, genres });
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
        <div className="space-y-2" role="group" aria-labelledby="content-type-label">
          <span id="content-type-label" className="text-sm font-medium">
            {t("filters.contentType")}
          </span>
          <ContentTypeSelector value={filters.contentType} onChange={handleContentTypeChange} />
        </div>

        <AdvancedFilters
          selectedGenres={filters.genres}
          yearFrom={filters.yearFrom}
          yearTo={filters.yearTo}
          language={filters.language}
          minRating={filters.minRating}
          availableGenres={availableGenres}
          genresError={genresError}
          onRetryGenres={onRetryGenres}
          onGenreChange={handleGenreChange}
          onYearRangeChange={(from, to) =>
            onFiltersChange({ ...filters, yearFrom: String(from), yearTo: String(to) })
          }
          onLanguageChange={(language) => onFiltersChange({ ...filters, language })}
          onMinRatingChange={(minRating) => onFiltersChange({ ...filters, minRating })}
          onReset={() => onFiltersChange(DEFAULT_FILTERS)}
        />
      </div>

      <div className="border-t border-border p-5">
        <Button
          variant="spotlight"
          size="lg"
          className="w-full h-12 text-base"
          onClick={onGetSuggestion}
          disabled={isLoading}
          title={t("action.shortcut")}
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          {isLoading ? t("action.searching") : actionLabel ?? t("action.find")}
        </Button>
      </div>
    </div>
  );
};

export default FilterPanel;
