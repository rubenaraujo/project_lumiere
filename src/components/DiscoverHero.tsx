import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import {
  getTrending,
  type ContentItem,
  type ContentType,
} from "@/services/tmdb";
import { Button } from "./ui/button";

interface DiscoverHeroProps {
  contentType: ContentType;
  onPick: (item: ContentItem) => void;
}

const PAGE_SIZE = 8;
const MAX_PAGES = 5;
const POSTER_BASE = "https://image.tmdb.org/t/p";

const DiscoverHero = ({ contentType, onPick }: DiscoverHeroProps) => {
  const { t, locale } = useI18n();

  const [visible, setVisible] = useState(PAGE_SIZE);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["trending", locale, contentType],
      queryFn: ({ pageParam, signal }) =>
        getTrending(contentType, pageParam, signal),
      initialPageParam: 1,
      getNextPageParam: (_last, all) =>
        all.length < MAX_PAGES ? all.length + 1 : undefined,
      staleTime: 60 * 60 * 1000,
      retry: false,
    });

  // The same title can show up on two pages.
  const trending = [
    ...new Map(
      (data?.pages.flat() ?? []).map((item) => [item.id, item]),
    ).values(),
  ];
  const posters = trending.slice(0, visible);
  const canShowMore = visible < trending.length || hasNextPage;

  const showMore = () => {
    const next = visible + PAGE_SIZE;
    setVisible(next);
    if (next > trending.length && hasNextPage) fetchNextPage();
  };

  return (
    <section className="space-y-8 py-4 lg:py-10" aria-labelledby="hero-title">
      <div className="max-w-xl space-y-4">
        <h2
          id="hero-title"
          className="text-4xl sm:text-5xl font-semibold leading-[1.05] tracking-tight"
        >
          {t("app.emptyTitle")}
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed">
          {t("app.emptyBody")}
        </p>
      </div>

      {posters.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-sans font-medium uppercase tracking-widest text-muted-foreground">
            {t("app.trending")}
          </h3>
          <ul className="grid grid-cols-4 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {posters.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onPick(item)}
                  aria-label={item.title}
                  title={item.title}
                  className="group block w-full overflow-hidden rounded-lg bg-muted shadow-soft aspect-[2/3] active:scale-95 transition-smooth"
                >
                  <img
                    src={`${POSTER_BASE}/w342${item.poster_path}`}
                    srcSet={`${POSTER_BASE}/w185${item.poster_path} 185w, ${POSTER_BASE}/w342${item.poster_path} 342w`}
                    sizes="(min-width: 1280px) 12vw, 25vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </button>
              </li>
            ))}
          </ul>
          {canShowMore && (
            <Button
              variant="outline"
              onClick={showMore}
              disabled={isFetchingNextPage}
            >
              {t("app.more")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
};

export default DiscoverHero;
