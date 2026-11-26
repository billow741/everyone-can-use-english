import { useTheme } from "@renderer/context";
import { MoonIcon, SunIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui";
import { t } from "i18next";

export const ThemeSettings = () => {
  const { setTheme, theme } = useTheme();

  return (
    <div className="flex items-start justify-between py-4">
      <div className="">
        <div className="mb-2">{t("theme")}</div>
        <div className="text-sm text-muted-foreground mb-2">{t(theme)}</div>
      </div>

      <div className="">
        <div className="flex items-center justify-end space-x-2 mb-2">
          <Select
            value={theme}
            onValueChange={(theme: "light" | "dark" | "system") => {
              setTheme(theme);
            }}
          >
            <SelectTrigger className="text-xs w-auto min-w-[110px] gap-2" aria-label="切换主题">
              {theme === "dark" ? (
                <MoonIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <SunIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <SelectValue placeholder="选择主题" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem className="text-xs" value="light">
                {t("light")}
              </SelectItem>
              <SelectItem className="text-xs" value="dark">
                {t("dark")}
              </SelectItem>
              <SelectItem className="text-xs" value="system">
                {t("system")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
