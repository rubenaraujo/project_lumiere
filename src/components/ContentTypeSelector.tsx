import { Film, Tv, Clock } from "lucide-react";
import type { ContentType } from "@/services/tmdb";
import { useI18n, type MessageKey } from "@/i18n";

interface ContentTypeSelectorProps {
  value: ContentType;
  onChange: (value: ContentType) => void;
}

const options: { value: ContentType; labelKey: MessageKey; icon: typeof Film }[] = [
  { value: "movie", labelKey: "type.movie", icon: Film },
  { value: "tv", labelKey: "type.tv", icon: Tv },
  { value: "miniseries", labelKey: "type.miniseries", icon: Clock },
];

const ContentTypeSelector = ({ value, onChange }: ContentTypeSelectorProps) => {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-xl">
      {options.map(({ value: optionValue, labelKey, icon: Icon }) => {
        const isSelected = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(optionValue)}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-smooth active:scale-95 ${
              isSelected
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
};

export default ContentTypeSelector;
