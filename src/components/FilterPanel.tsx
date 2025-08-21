import { useState } from "react";
import { Button } from "./ui/button";
import { Sparkles } from "lucide-react";
import ContentTypeSelector from "./ContentTypeSelector";
import AdvancedFilters from "./AdvancedFilters";

interface FilterPanelProps {
  onFiltersChange: (filters: any) => void;
  onGetSuggestion: () => void;
  isLoading: boolean;
}

const FilterPanel = ({ onFiltersChange, onGetSuggestion, isLoading }: FilterPanelProps) => {
  const [contentType, setContentType] = useState("movie");
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [language, setLanguage] = useState("en");
  const [minRating, setMinRating] = useState(8);

  const updateFilters = (type: string, genres: number[], from: string, to: string, lang: string, rating: number) => {
    onFiltersChange({
      contentType: type,
      genres,
      yearFrom: from,
      yearTo: to,
      language: lang,
      minRating: rating
    });
  };

  const handleReset = () => {
    setContentType("movie");
    setSelectedGenres([]);
    setYearFrom("");
    setYearTo("");
    setLanguage("en");
    setMinRating(8);
    updateFilters("movie", [], "", "", "en", 8);
  };

  const handleContentTypeChange = (value: string) => {
    setContentType(value);
    updateFilters(value, selectedGenres, yearFrom, yearTo, language, minRating);
  };

  const handleGenreChange = (genreId: number, checked: boolean) => {
    const newSelectedGenres = checked
      ? [...selectedGenres, genreId]
      : selectedGenres.filter(id => id !== genreId);
    
    setSelectedGenres(newSelectedGenres);
    updateFilters(contentType, newSelectedGenres, yearFrom, yearTo, language, minRating);
  };

  const handleYearRangeChange = (yearFromValue: number, yearToValue: number) => {
    const fromStr = yearFromValue.toString();
    const toStr = yearToValue.toString();
    setYearFrom(fromStr);
    setYearTo(toStr);
    updateFilters(contentType, selectedGenres, fromStr, toStr, language, minRating);
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    updateFilters(contentType, selectedGenres, yearFrom, yearTo, value, minRating);
  };

  const handleMinRatingChange = (value: number) => {
    setMinRating(value);
    updateFilters(contentType, selectedGenres, yearFrom, yearTo, language, value);
  };

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Content Type Selector - Outside filters */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Content Type</label>
        <ContentTypeSelector 
          value={contentType} 
          onChange={handleContentTypeChange} 
        />
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        selectedGenres={selectedGenres}
        yearFrom={yearFrom}
        yearTo={yearTo}
        language={language}
        minRating={minRating}
        onGenreChange={handleGenreChange}
        onYearRangeChange={handleYearRangeChange}
        onLanguageChange={handleLanguageChange}
        onMinRatingChange={handleMinRatingChange}
        onReset={handleReset}
      />

      {/* Suggestion Button - Hidden on mobile, visible on desktop */}
      <Button 
        variant="spotlight" 
        size="lg" 
        className="w-full hidden lg:flex"
        onClick={onGetSuggestion}
        disabled={isLoading}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {isLoading ? "Suggesting..." : "Suggest content"}
      </Button>
    </div>
  );
};

export default FilterPanel;