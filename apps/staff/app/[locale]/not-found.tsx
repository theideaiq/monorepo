import { Button } from "@repo/design-system/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";

const NotFound = () => {
  const t = useTranslations("common.notFound");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-semibold text-2xl">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("description")}</p>
      <Button asChild>
        <Link href="/">{t("home")}</Link>
      </Button>
    </div>
  );
};

export default NotFound;
