import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Calendar, Star, Users, Play, User } from "lucide-react";
import { getContentDetails } from "../services/tmdb";

interface ContentCardProps {
  content: {
    id: number;
    title: string;
    original_title?: string;
    original_name?: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    vote_average: number;
    vote_count: number;
    release_date?: string;
    first_air_date?: string;
    genre_ids: number[];
    original_language: string;
    popularity: number;
    created_by?: { id: number; name: string; }[];
    production_companies?: { id: number; name: string; }[];
  };
  contentType: string;
  genres: { id: number; name: string; }[];
}

const ContentCard = ({ content, contentType, genres }: ContentCardProps) => {
  const [director, setDirector] = useState<string>("");
  const [creator, setCreator] = useState<string>("");
  const [runtime, setRuntime] = useState<number | null>(null);
  
  const imageBaseUrl = "https://image.tmdb.org/t/p/w500";
  const backdropBaseUrl = "https://image.tmdb.org/t/p/w1280";
  
  const releaseDate = content.release_date || content.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : "";
  const originalTitle = content.original_title || content.original_name;
  const isOriginalTitleDifferent = originalTitle && originalTitle !== content.title;
  
  const contentGenres = content.genre_ids
    .map(id => genres.find(g => g.id === id)?.name)
    .filter(Boolean)
    .slice(0, 3);

  const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(content.title + ' trailer')}`;

  // Fetch detailed information to get director/creator and additional info
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const details = await getContentDetails(contentType, content.id);
        
        if (contentType === 'movie') {
          if (details.credits?.crew) {
            const directorInfo = details.credits.crew.find((person: any) => person.job === 'Director');
            if (directorInfo) {
              setDirector(directorInfo.name);
            }
          }
          if (details.runtime) {
            setRuntime(details.runtime);
          }
        } else if (contentType === 'tv' || contentType === 'miniseries') {
          if (details.created_by && details.created_by.length > 0) {
            setCreator(details.created_by[0].name);
          }
          if (details.episode_run_time && details.episode_run_time.length > 0) {
            setRuntime(details.episode_run_time[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching content details:', error);
      }
    };

    fetchDetails();
  }, [content.id, contentType]);

  return (
    <Card className="w-full max-w-4xl shadow-card overflow-hidden">
      {/* Backdrop Image */}
      {content.backdrop_path && (
        <div 
          className="h-48 bg-cover bg-center relative"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url(${backdropBaseUrl}${content.backdrop_path})`
          }}
        >
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">
              {content.title}
            </h1>
            {isOriginalTitleDifferent && (
              <p className="text-sm text-white/80 mb-2 italic drop-shadow">
                Título original: {originalTitle}
              </p>
            )}
            <div className="flex items-center gap-4 text-white/90 text-sm">
              {year && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {year}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                {content.vote_average.toFixed(1)}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {content.vote_count.toLocaleString()} votos
              </div>
            </div>
          </div>
        </div>
      )}

      <CardContent className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Poster */}
          <div className="md:col-span-1">
            {content.poster_path ? (
              <img
                src={`${imageBaseUrl}${content.poster_path}`}
                alt={content.title}
                className="w-full rounded-lg shadow-soft"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">Sem imagem</span>
              </div>
            )}
          </div>

          {/* Content Details */}
          <div className="md:col-span-2 space-y-4">
            {/* Title for mobile (hidden on desktop where it's in backdrop) */}
            {!content.backdrop_path && (
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">
                  {content.title}
                </h1>
                {isOriginalTitleDifferent && (
                  <p className="text-sm text-muted-foreground mb-2 italic">
                    Título original: {originalTitle}
                  </p>
                )}
                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  {year && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {year}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    {content.vote_average.toFixed(1)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {content.vote_count.toLocaleString()} votos
                  </div>
                </div>
              </div>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-2 items-center">
              {contentGenres.map((genre, index) => (
                <Badge key={index} variant="secondary">
                  {genre}
                </Badge>
              ))}
              <Badge variant="outline" className="text-xs">
                {content.original_language.toUpperCase()}
              </Badge>
            </div>

            {/* Overview */}
            <div>
              <h3 className="font-semibold text-foreground mb-2">Overview</h3>
              <p className="text-muted-foreground leading-relaxed">
                {content.overview || "Overview not available."}
              </p>
            </div>

            {/* Creator/Director Info */}
            {(director || creator) && (
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {contentType === 'movie' ? 'Director' : 'Creator'}
                </h3>
                <Badge variant="outline">
                  {director || creator}
                </Badge>
              </div>
            )}

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {runtime && (
                <div>
                  <span className="font-medium text-foreground">Duration:</span>
                  <span className="text-muted-foreground ml-1">
                    {runtime} min{contentType !== 'movie' ? '/episode' : ''}
                  </span>
                </div>
              )}
              {releaseDate && (
                <div>
                  <span className="font-medium text-foreground">
                    {contentType === 'movie' ? 'Release Date:' : 'First Aired:'}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    {new Date(releaseDate).toLocaleDateString('pt-PT', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <Button
                size="lg"
                className="w-full"
                onClick={() => window.open(trailerUrl, '_blank')}
              >
                <Play className="w-4 h-4 mr-2" />
                Ver Trailer
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentCard;