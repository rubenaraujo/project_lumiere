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
  onGenreChange: (genreId: number, checked: boolean) => void;
  onYearRangeChange: (yearFrom: number, yearTo: number) => void;
  onLanguageChange: (value: string) => void;
  onMinRatingChange: (value: number) => void;
  onReset: () => void;
}

const genres = [
  { id: 28, name: "Acção" },
  { id: 35, name: "Comédia" },
  { id: 18, name: "Drama" },
  { id: 27, name: "Terror" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Ficção científica" },
  { id: 53, name: "Thriller" },
  { id: 16, name: "Animação" },
  { id: 12, name: "Aventura" },
  { id: 14, name: "Fantasia" },
  { id: 36, name: "História" },
  { id: 10402, name: "Música" },
  { id: 9648, name: "Mistério" },
  { id: 80, name: "Crime" },
  { id: 10751, name: "Família" },
  { id: 10752, name: "Guerra" }
];

const languages = [
  { code: "pt", name: "Português" },
  { code: "en", name: "Inglês" },
  { code: "es", name: "Espanhol" },
  { code: "fr", name: "Francês" },
  { code: "de", name: "Alemão" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "Japonês" },
  { code: "ko", name: "Coreano" },
];

const AdvancedFilters = ({
  selectedGenres,
  yearFrom,
  yearTo,
  language,
  minRating,
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
            <span className="font-medium">Filtros avançados</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Minimum Rating */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Pontuação mínima</Label>
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

            {/* Genres */}
            <div className="space-y-3">
              <Label>Géneros</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {genres.map((genre) => (
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
            </div>

            {/* Year Range */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Ano de lançamento</Label>
                <span className="text-sm text-muted-foreground">
                  {yearFrom || '1970'} - {yearTo || new Date().getFullYear()}
                </span>
              </div>
              <Slider
                value={[parseInt(yearFrom) || 1970, parseInt(yearTo) || new Date().getFullYear()]}
                onValueChange={(value) => onYearRangeChange(value[0], value[1])}
                max={new Date().getFullYear()}
                min={1970}
                step={1}
                className="w-full"
              />
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
              <Select value={language} onValueChange={onLanguageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer idioma</SelectItem>
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
              Limpar filtros
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default AdvancedFilters;