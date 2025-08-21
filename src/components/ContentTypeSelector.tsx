import { Button } from "./ui/button";
import { Film, Tv, Clock } from "lucide-react";

interface ContentTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const ContentTypeSelector = ({ value, onChange }: ContentTypeSelectorProps) => {
  const options = [
    { value: "movie", label: "Movies", icon: Film },
    { value: "tv", label: "TV Shows", icon: Tv },
    { value: "miniseries", label: "Miniseries", icon: Clock },
  ];

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        return (
          <Button
            key={option.value}
            variant={isSelected ? "default" : "ghost"}
            size="sm"
            onClick={() => onChange(option.value)}
            className={`flex-1 gap-2 transition-colors ${
              isSelected 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "hover:bg-muted-foreground/10"
            }`}
          >
            <Icon className="w-4 h-4" />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
};

export default ContentTypeSelector;