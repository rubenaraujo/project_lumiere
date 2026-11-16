import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import type { Genre } from "@/services/tmdb";
import { useI18n } from "@/i18n";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";

interface AdvancedFiltersProps {
  selectedGenres: number[];
  yearFrom: string;
  yearTo: string;
  language: string;
  minRating: number;
  availableGenres: Genre[];
  genresError?: boolean;
  onRetryGenres?: () => void;
  onGenreChange: (genreId: number, checked: boolean) => void;
  onYearRangeChange: (yearFrom: number, yearTo: number) => void;
  onLanguageChange: (value: string) => void;
  onMinRatingChange: (value: number) => void;
  onReset: () => void;
}

const LANGUAGE_CODES = ["pt", "en", "es", "fr", "de", "it", "ja", "ko"];
const MIN_YEAR = 2000;

const AdvancedFilters = ({
  selectedGenres,
  yearFrom,
  yearTo,
  language,
  minRating,
  availableGenres,
  genresError = false,
  onRetryGenres,
  onGenreChange,
  onYearRangeChange,
  onLanguageChange,
  onMinRatingChange,
  onReset,
}: AdvancedFiltersProps) => {
  const { t, locale } = useI18n();
  const currentYear = new Date().getFullYear();

  // Language names come from the browser's locale data, so they follow the UI language.
  const languages = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "language" });
    return LANGUAGE_CODES.map((code) => {
      const name = names.of(code) ?? code;
      return { code, name: name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) };
    });
  }, [locale]);

  const scale = (labels: (string | number)[]) => (
    <div className="flex justify-between text-xs text-muted-foreground" aria-hidden="true">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <Label id="min-rating-label" className="text-sm font-medium">
            {t("filters.minRating")}
          </Label>
          <span className="font-display text-xl font-semibold text-primary tabular-nums">
            {minRating.toFixed(1)}
            <span className="text-xs text-muted-foreground font-sans"> /10</span>
          </span>
        </div>
        <Slider
          aria-labelledby="min-rating-label"
          value={[minRating]}
          onValueChange={(value) => onMinRatingChange(value[0])}
          max={10}
          min={0}
          step={0.5}
        />
        {scale([0, 5, 10])}
      </div>

      <div className="space-y-3">
        <Label id="year-label" className="text-sm font-medium">
          {t("filters.year")}
        </Label>
        <div className="flex justify-between items-baseline font-display text-xl font-semibold text-primary tabular-nums">
          <span>{yearFrom || MIN_YEAR}</span>
          <span className="text-muted-foreground text-base" aria-hidden="true">
            –
          </span>
          <span>{yearTo || currentYear}</span>
        </div>
        <Slider
          aria-labelledby="year-label"
          value={[parseInt(yearFrom) || MIN_YEAR, parseInt(yearTo) || currentYear]}
          onValueChange={(value) => onYearRangeChange(value[0], value[1])}
          max={currentYear}
          min={MIN_YEAR}
          step={1}
        />
        {scale([MIN_YEAR, 2010, 2020, currentYear])}
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">{t("filters.genres")}</Label>
        {genresError ? (
          <div className="flex items-center justify-between gap-2 text-sm text-destructive" role="alert">
            <span>{t("filters.genresError")}</span>
            {onRetryGenres && (
              <Button variant="outline" size="sm" onClick={onRetryGenres}>
                {t("filters.retry")}
              </Button>
            )}
          </div>
        ) : availableGenres.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableGenres.map((genre) => {
              const selected = selectedGenres.includes(genre.id);
              return (
                <button
                  key={genre.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onGenreChange(genre.id, !selected)}
                  className={`min-h-11 rounded-full border px-4 text-sm transition-smooth active:scale-95 ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "border-border text-foreground hover:border-primary/60 hover:bg-muted"
                  }`}
                >
                  {genre.name}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{t("filters.genresLoading")}</div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="language" className="text-sm font-medium">
          {t("filters.language")}
        </Label>
        <Select value={language} onValueChange={onLanguageChange}>
          <SelectTrigger id="language" className="h-11">
            <SelectValue placeholder={t("filters.languagePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.anyLanguage")}</SelectItem>
            {languages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onReset}>
        <RotateCcw className="w-4 h-4" aria-hidden="true" />
        {t("filters.reset")}
      </Button>
    </div>
  );
};

export default AdvancedFilters;
