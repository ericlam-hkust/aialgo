import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ variant = "icon" }: { variant?: "icon" | "compact" }) {
  const { locale, setLocale, t } = useI18n();
  const active = LOCALES.find((l) => l.id === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" aria-label={t("shell.language")}>
            <Languages className="h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" aria-label={t("shell.language")} className="gap-1.5">
            <Languages className="h-4 w-4" aria-hidden />
            <span className="text-xs">{active?.short}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.id}
            onSelect={() => setLocale(l.id as Locale)}
            className={cn(l.id === locale && "font-medium text-primary")}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
