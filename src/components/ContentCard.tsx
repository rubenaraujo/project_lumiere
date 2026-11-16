import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Star,
  Play,
  User,
  Clapperboard,
  Tv,
  Bookmark,
  Share2,
} from "lucide-react";
import {
  getContentDetails,
  getCast,
  getWatchProviders,
  getTrailerKey,
  type ContentItem,
  type ContentType,
  type Genre,
} from "@/services/tmdb";
import { TMDB_LANGUAGE, useI18n } from "@/i18n";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import SimilarTitles from "./SimilarTitles";
import { toast } from "@/hooks/use-toast";
import { buildShareUrl } from "@/lib/persistence";
import { useWatchlist } from "@/lib/watchlist";

const TrailerDialog = lazy(() => import("./TrailerDialog"));

interface ContentCardProps {
  content: ContentItem;
  contentType: ContentType;
  genres: Genre[];
  onPickSimilar: (item: ContentItem) => void;
}

const IMAGE_BASE = "https://image.tmdb.org/t/p";
const imageUrl = (size: string, path: string) => `${IMAGE_BASE}/${size}${path}`;

const posterSrcSet = (path: string) =>
  [342, 500, 780].map((w) => `${imageUrl(`w${w}`, path)} ${w}w`).join(", ");

const ContentCard = ({
  content,
  contentType,
  genres,
  onPickSimilar,
}: ContentCardProps) => {
  const { t, locale } = useI18n();
  const { has, toggle } = useWatchlist();
  const [trailerOpen, setTrailerOpen] = useState(false);
  const saved = has(content.id, contentType);

  // Cached per locale + content type + id by react-query: revisiting a
  // suggestion is instant, and an in-flight request is aborted as soon as
  // the content changes.
  const { data: details, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["content-details", locale, contentType, content.id],
    queryFn: ({ signal }) => getContentDetails(contentType, content.id, signal),
  });

  const isMovie = contentType === "movie";
  const director = isMovie
    ? (details?.credits?.crew?.find((person) => person.job === "Director")
        ?.name ?? "")
    : "";
  const creator = !isMovie ? (details?.created_by?.[0]?.name ?? "") : "";
  const runtime = isMovie
    ? (details?.runtime ?? null)
    : (details?.episode_run_time?.[0] ?? null);
  const cast = getCast(details);
  const watchProviders = getWatchProviders(details);

  const releaseDate = content.release_date || content.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : "";
  const originalTitle = content.original_title || content.original_name;
  const isOriginalTitleDifferent =
    originalTitle && originalTitle !== content.title;
  const score = content.vote_average.toFixed(1);

  const contentGenres = content.genre_ids
    .map((id) => genres.find((g) => g.id === id)?.name)
    .filter(Boolean)
    .slice(0, 3);

  const trailerKey = getTrailerKey(details);
  const shareUrl = buildShareUrl(content.id, contentType);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: content.title, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: t("card.linkCopied") });
    } catch {
      // Sharing cancelled by the user, or clipboard unavailable.
    }
  };

  const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(content.title + " trailer")}`;
  const tmdbUrl = `https://www.themoviedb.org/${isMovie ? "movie" : "tv"}/${content.id}`;
  const imdbId = details?.imdb_id || details?.external_ids?.imdb_id;
  const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : null;

  const providerGroups = watchProviders
    ? (
        [
          { label: t("card.streaming"), providers: watchProviders.flatrate },
          { label: t("card.rent"), providers: watchProviders.rent },
          { label: t("card.buy"), providers: watchProviders.buy },
        ] as const
      ).filter((group) => group.providers && group.providers.length > 0)
    : [];

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-5xl overflow-hidden bg-card/85 shadow-card backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none">
        <CardContent className="p-5 md:p-8">
          <div className="grid gap-8 md:grid-cols-[minmax(220px,300px)_1fr]">
            <div className="mx-auto w-full max-w-[300px] md:mx-0">
              {content.poster_path ? (
                <div className="group overflow-hidden rounded-xl bg-muted shadow-card aspect-[2/3]">
                  <img
                    src={imageUrl("w500", content.poster_path)}
                    srcSet={posterSrcSet(content.poster_path)}
                    sizes="(min-width: 768px) 300px, 80vw"
                    alt={content.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </div>
              ) : (
                <div className="w-full aspect-[2/3] bg-muted rounded-xl flex items-center justify-center">
                  <span className="text-muted-foreground">
                    {t("card.noImage")}
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-6">
              <header className="space-y-3">
                <h3 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
                  {content.title}
                </h3>
                {isOriginalTitleDifferent && (
                  <p className="text-sm italic text-muted-foreground">
                    {t("card.originalTitle", { title: originalTitle })}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <div
                    className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 py-1 pl-3 pr-4"
                    role="img"
                    aria-label={t("card.score", { score })}
                  >
                    <Star
                      className="h-5 w-5 fill-primary text-primary"
                      aria-hidden="true"
                    />
                    <span
                      className="font-display text-2xl font-semibold leading-none text-primary"
                      aria-hidden="true"
                    >
                      {score}
                    </span>
                    <span className="text-xs" aria-hidden="true">
                      {t("card.votes", {
                        count: content.vote_count.toLocaleString(
                          TMDB_LANGUAGE[locale],
                        ),
                      })}
                    </span>
                  </div>
                  {year && <span>{year}</span>}
                  {runtime && (
                    <span>
                      {t(isMovie ? "card.minutes" : "card.minutesPerEpisode", {
                        count: runtime,
                      })}
                    </span>
                  )}
                </div>
              </header>

              <div className="flex flex-wrap gap-2 items-center">
                {contentGenres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs">
                  {content.original_language.toUpperCase()}
                </Badge>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">
                  {t("card.synopsis")}
                </h4>
                <p className="max-w-prose text-base leading-7 text-foreground/90">
                  {content.overview || t("card.noSynopsis")}
                </p>
              </div>

              {isLoadingDetails && (
                <div
                  className="space-y-3"
                  aria-hidden="true"
                  data-testid="details-skeleton"
                >
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}

              {(director || creator) && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" aria-hidden="true" />
                    {isMovie ? t("card.director") : t("card.creator")}
                  </h4>
                  <Badge variant="outline">{director || creator}</Badge>
                </div>
              )}

              {cast.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Clapperboard className="w-4 h-4" aria-hidden="true" />
                    {t("card.cast")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {cast.map((member) => (
                      <Badge
                        key={member.id}
                        variant="outline"
                        title={member.character}
                      >
                        {member.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {providerGroups.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Tv className="w-4 h-4" aria-hidden="true" />
                    {t("card.whereToWatch")}
                  </h4>
                  <div className="space-y-4">
                    {providerGroups.map(({ label, providers }) => (
                      <div key={label} className="space-y-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {label}
                        </span>
                        <ul className="flex flex-wrap gap-2">
                          {providers?.map((provider) => (
                            <li
                              key={provider.provider_id}
                              className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 py-1.5 pl-1.5 pr-3 text-sm"
                            >
                              <img
                                src={imageUrl("w92", provider.logo_path)}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                width={28}
                                height={28}
                                className="h-7 w-7 rounded-md"
                              />
                              {provider.provider_name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-wrap gap-2">
                {trailerKey ? (
                  <Button
                    size="lg"
                    className="basis-full sm:basis-auto sm:flex-1"
                    onClick={() => setTrailerOpen(true)}
                  >
                    <Play className="w-4 h-4" aria-hidden="true" />
                    {t("card.trailer")}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="basis-full sm:basis-auto sm:flex-1"
                    asChild
                  >
                    <a
                      href={trailerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Play className="w-4 h-4" aria-hidden="true" />
                      {t("card.trailer")}
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-pressed={saved}
                  aria-label={saved ? t("watchlist.remove") : t("card.save")}
                  title={saved ? t("watchlist.remove") : t("card.save")}
                  onClick={() => toggle(content, contentType)}
                >
                  <Bookmark
                    className={`w-5 h-5 ${saved ? "fill-primary text-primary" : ""}`}
                    aria-hidden="true"
                  />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label={t("card.share")}
                  title={t("card.share")}
                  onClick={share}
                >
                  <Share2 className="w-5 h-5" aria-hidden="true" />
                </Button>
                {imdbUrl ? (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0 bg-[#f5c518] border-[#f5c518] hover:bg-[#f5c518]/90"
                    asChild
                  >
                    <a
                      href={imdbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("card.openImdb")}
                      title={t("card.openImdb")}
                    >
                      <img
                        src="https://www.imdb.com/favicon.ico"
                        alt=""
                        className="w-7 h-7"
                      />
                    </a>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0 bg-[#f5c518] border-[#f5c518]"
                    disabled
                    aria-label={t("card.imdbUnavailable")}
                    title={t("card.imdbUnavailable")}
                  >
                    <img
                      src="https://www.imdb.com/favicon.ico"
                      alt=""
                      className="w-7 h-7"
                    />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 bg-[#0d253f] border-[#0d253f] hover:bg-[#0d253f]/90"
                  asChild
                >
                  <a
                    href={tmdbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("card.openTmdb")}
                    title={t("card.openTmdb")}
                  >
                    <img
                      src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg"
                      alt=""
                      className="w-7 h-7"
                    />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SimilarTitles
        contentType={contentType}
        id={content.id}
        onPick={onPickSimilar}
      />

      {trailerOpen && trailerKey && (
        <Suspense fallback={null}>
          <TrailerDialog
            videoKey={trailerKey}
            title={content.title}
            onClose={() => setTrailerOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ContentCard;
