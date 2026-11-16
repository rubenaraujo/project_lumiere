import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";

const NotFound = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-foreground">404</h1>
        <p className="text-xl text-muted-foreground mb-4">{t("notFound.title")}</p>
        <Link to="/" className="text-primary hover:underline">
          {t("notFound.back")}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
