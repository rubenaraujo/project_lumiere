import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/i18n";

interface FiltersSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

// Mobile bottom sheet. Closes on Escape or backdrop tap, locks page scroll.
const FiltersSheet = ({ open, onClose, children }: FiltersSheetProps) => {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="presentation">
      <div className="absolute inset-0 bg-black/70 animate-in fade-in duration-200" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("filters.title")}
        className="relative flex max-h-[88vh] w-full flex-col rounded-t-2xl border border-border bg-card shadow-card animate-in slide-in-from-bottom duration-300"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-2">
          <h2 className="text-lg font-semibold">{t("filters.title")}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("filters.close")}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default FiltersSheet;
