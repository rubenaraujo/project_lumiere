import { Bookmark, X } from "lucide-react";
import { useI18n } from "@/i18n";
import type { ContentType } from "@/services/tmdb";
import { useWatchlist, type WatchlistEntry } from "@/lib/watchlist";

interface WatchlistViewProps {
  onOpen: (entry: WatchlistEntry) => void;
}

const POSTER_BASE = "https://image.tmdb.org/t/p";

const WatchlistView = ({ onOpen }: WatchlistViewProps) => {
  const { t } = useI18n();
  const { entries, toggle } = useWatchlist();

  return (
    <section className="space-y-6" aria-labelledby="watchlist-title">
      <h2 id="watchlist-title" className="text-3xl font-semibold tracking-tight">
        {t("watchlist.title")}
      </h2>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Bookmark className="w-8 h-8" aria-hidden="true" />
          <p className="max-w-sm">{t("watchlist.empty")}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {entries.map((entry) => (
            <li key={`${entry.contentType}-${entry.item.id}`} className="relative">
              <button
                type="button"
                onClick={() => onOpen(entry)}
                className="group block w-full text-left"
                aria-label={entry.item.title}
              >
                <div className="overflow-hidden rounded-lg bg-muted shadow-soft aspect-[2/3] transition-smooth group-active:scale-95">
                  {entry.item.poster_path && (
                    <img
                      src={`${POSTER_BASE}/w342${entry.item.poster_path}`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium">{entry.item.title}</p>
              </button>
              <button
                type="button"
                onClick={() => toggle(entry.item, entry.contentType as ContentType)}
                aria-label={`${t("watchlist.remove")}: ${entry.item.title}`}
                title={t("watchlist.remove")}
                className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-background/80 backdrop-blur hover:bg-background"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default WatchlistView;
