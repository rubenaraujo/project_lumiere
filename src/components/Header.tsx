import { Bookmark } from "lucide-react";
import { LOCALES, useI18n } from "@/i18n";

interface HeaderProps {
  watchlistCount: number;
  watchlistActive: boolean;
  onToggleWatchlist: () => void;
}

const Header = ({
  watchlistCount,
  watchlistActive,
  onToggleWatchlist,
}: HeaderProps) => {
  const { t, locale, setLocale } = useI18n();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <img
            src={`${import.meta.env.BASE_URL}logo/lumiere-logo.png`}
            alt={t("header.logoAlt")}
            className="w-8 h-8"
          />
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Lumiere
          </h1>
          <span className="hidden md:block text-sm text-muted-foreground pl-3 ml-1 border-l border-border">
            {t("header.tagline")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleWatchlist}
            aria-pressed={watchlistActive}
            aria-label={t("watchlist.title")}
            className={`flex min-h-11 items-center gap-2 rounded-full px-3 text-sm transition-quick ${
              watchlistActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bookmark className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("watchlist.title")}</span>
            {watchlistCount > 0 && (
              <span className="tabular-nums">{watchlistCount}</span>
            )}
          </button>
          <div
            role="group"
            aria-label={t("header.language")}
            className="flex items-center"
          >
            {LOCALES.map((code, i) => (
              <span key={code} className="flex items-center">
                {i > 0 && (
                  <span className="text-border" aria-hidden="true">
                    /
                  </span>
                )}
                <button
                  type="button"
                  aria-pressed={locale === code}
                  onClick={() => setLocale(code)}
                  className={`min-h-11 min-w-11 px-2 text-xs font-medium uppercase tracking-wider transition-quick ${
                    locale === code
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {code}
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
