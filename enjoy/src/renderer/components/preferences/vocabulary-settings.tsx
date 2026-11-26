import { t } from "i18next";
import { Switch } from "@renderer/components/ui";
import { useContext } from "react";
import { AppSettingsProviderContext } from "@renderer/context";

export const VocabularySettings = () => {
  const { vocabularyConfig, setVocabularyConfig } = useContext(
    AppSettingsProviderContext
  );

  return (
    <div className="flex items-start justify-between py-4">
      <div className="">
        <label htmlFor="vocab-hover-switch" className="mb-2 block cursor-pointer">
          {t("lookupOnMouseOver")}
        </label>
      </div>

      <div className="">
        <Switch
          id="vocab-hover-switch"
          aria-label={t("lookupOnMouseOver")}
          checked={vocabularyConfig.lookupOnMouseOver}
          onCheckedChange={() => {
            setVocabularyConfig({
              ...vocabularyConfig,
              lookupOnMouseOver: !vocabularyConfig.lookupOnMouseOver,
            });
          }}
        />
      </div>
    </div>
  );
};
