import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";

interface AdvancedFiltersProps {
  selectedGenres: number[];
  yearFrom: string;
  yearTo: string;
  language: string;
  minRating: number;
  availableGenres: { id: number; name: string; }[];
  onGenreChange: (genreId: number, checked: boolean) => void;
  onYearRangeChange: (yearFrom: number, yearTo: number) => void;
  onLanguageChange: (value: string) => void;
  onMinRatingChange: (value: number) => void;
  onReset: () => void;
}

const languages = [
  { code: "pt", name: "Portuguese" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
];

const AdvancedFilters = ({
  selectedGenres,
  yearFrom,
  yearTo,
  language,
  minRating,
  availableGenres,
  onGenreChange,
  onYearRangeChange,
  onLanguageChange,
  onMinRatingChange,
  onReset
}: AdvancedFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="shadow-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4">
            <span className="font-medium">Advanced Filters</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Minimum Rating */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Minimum Rating</Label>
                <span className="text-sm text-muted-foreground">{minRating}/10</span>
              </div>
              <Slider
                value={[minRating]}
                onValueChange={(value) => onMinRatingChange(value[0])}
                max={10}
                min={0}
                step={0.5}
                className="w-full"
              />
            </div>

            {/* Genres - Now Dynamic */}
            <div className="space-y-3">
              <Label>Genres</Label>
              {availableGenres.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableGenres.map((genre) => (
                    <div key={genre.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`genre-${genre.id}`}
                        checked={selectedGenres.includes(genre.id)}
                        onCheckedChange={(checked) => onGenreChange(genre.id, checked as boolean)}
                      />
                      <Label
                        htmlFor={`genre-${genre.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {genre.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Loading genres...
                </div>
              )}
            </div>

            {/* Year Range */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Release Year</Label>
                <span className="text-sm text-muted-foreground">
                  {yearFrom || '2000'} - {yearTo || new Date().getFullYear()}
                </span>
              </div>
              <Slider
                value={[parseInt(yearFrom) || 2000, parseInt(yearTo) || new Date().getFullYear()]}
                onValueChange={(value) => onYearRangeChange(value[0], value[1])}
                max={new Date().getFullYear()}
                min={2000}
                step={1}
                className="w-full"
              />
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={onLanguageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any language</SelectItem>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onReset}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear filters
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default AdvancedFilters;