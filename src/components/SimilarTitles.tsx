import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import { getRecommendations, type ContentItem, type ContentType } from "@/services/tmdb";

interface SimilarTitlesProps {
  contentType: ContentType;
  id: number;
  onPick: (item: ContentItem) => void;
}

const POSTER_BASE = "https://image.tmdb.org/t/p";

const SimilarTitles = ({ contentType, id, onPick }: SimilarTitlesProps) => {
  const { t, locale } = useI18n();
  const { data: items = [] } = useQuery({
    queryKey: ["recommendations", locale, contentType, id],
    queryFn: ({ signal }) => getRecommendations(contentType, id, signal),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  if (items.length === 0) return null;

  return (
    <section className="w-full max-w-5xl space-y-3" aria-labelledby="similar-title">
      <h3 id="similar-title" className="text-sm font-sans font-medium uppercase tracking-widest text-muted-foreground">
        {t("card.similar")}
      </h3>
      {/* Horizontal scroller: swipe gestures on the page must not fire inside it. */}
      <ul data-no-swipe className="flex snap-x gap-3 overflow-x-auto pb-3">
        {items.slice(0, 12).map((item) => (
          <li key={item.id} className="w-28 shrink-0 snap-start sm:w-32">
            <button
              type="button"
              onClick={() => onPick(item)}
              aria-label={item.title}
              title={item.title}
              className="group block w-full overflow-hidden rounded-lg bg-muted shadow-soft aspect-[2/3] active:scale-95 transition-smooth"
            >
              <img
                src={`${POSTER_BASE}/w185${item.poster_path}`}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SimilarTitles;
