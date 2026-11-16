import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/i18n";

interface TrailerDialogProps {
  videoKey: string;
  title: string;
  onClose: () => void;
}

const TrailerDialog = ({ videoKey, title, onClose }: TrailerDialogProps) => {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/80 animate-in fade-in duration-200" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("card.trailerTitle", { title })}
        className="relative w-full max-w-4xl animate-in zoom-in-95 duration-200"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("card.trailerClose")}
          className="absolute -top-12 right-0 flex h-11 w-11 items-center justify-center rounded-full bg-card hover:bg-muted"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-card">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoKey)}?autoplay=1&rel=0`}
            title={t("card.trailerTitle", { title })}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default TrailerDialog;
