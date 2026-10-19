import { t } from "i18next";
import { useState, useEffect, useRef, useContext } from "react";
import { Button, ScrollArea, Separator, Badge } from "@renderer/components/ui";
import Mark from "mark.js";
import { useHotkeys } from "react-hotkeys-hook";
import { HotKeysSettingsProviderContext } from "@renderer/context";
import { Sentence } from "@renderer/components";
import {
  findPhonicsWord,
  PhonicsWord,
} from "@renderer/lib/open-phonics-service";
import { PhonicsWordBlendingModal } from "@renderer/components/phonics/phonics-word-blending-modal";
import { LayersIcon, SparklesIcon } from "lucide-react";

export const MeaningMemorizingCard = (props: { meaning: MeaningType }) => {
  const {
    meaning: { word, lookups },
  } = props;
  const { currentHotkeys, enabled } = useContext(
    HotKeysSettingsProviderContext
  );
  const [side, setSide] = useState<"front" | "back">("front");
  const [phonicsWord, setPhonicsWord] = useState<PhonicsWord | null>(null);
  const [isBlendingOpen, setIsBlendingOpen] = useState(false);

  useEffect(() => {
    setSide("front");
    let mounted = true;
    findPhonicsWord(word).then((res) => {
      if (mounted) setPhonicsWord(res);
    });
    return () => {
      mounted = false;
    };
  }, [word]);

  useHotkeys(
    [currentHotkeys.PlayOrPause],
    () => {
      document.getElementById("vocabulary-toggle-side-button").click();
    },
    {
      preventDefault: true,
    },
    [side]
  );

  return (
    <>
      {side === "front" ? (
        <FrontSide
          word={word}
          lookups={lookups}
          phonicsWord={phonicsWord}
          onOpenBlending={() => setIsBlendingOpen(true)}
          onFlip={() => setSide("back")}
        />
      ) : (
        <BackSide
          meaning={props.meaning}
          phonicsWord={phonicsWord}
          onOpenBlending={() => setIsBlendingOpen(true)}
          onFlip={() => setSide("front")}
        />
      )}

      {/* 自然拼读 3D 积木点读与魔法滑读弹窗 */}
      <PhonicsWordBlendingModal
        word={phonicsWord}
        open={isBlendingOpen}
        onOpenChange={setIsBlendingOpen}
      />
    </>
  );
};

const FrontSide = (props: {
  word: string;
  lookups: LookupType[];
  phonicsWord?: PhonicsWord | null;
  onOpenBlending?: () => void;
  onFlip: () => void;
}) => {
  const { word, lookups, phonicsWord, onOpenBlending, onFlip } = props;
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    if (!ref.current) return;

    const mark = new Mark(ref.current);
    mark.mark([word], {
      separateWordSearch: false,
      caseSensitive: false,
      acrossElements: true,
    });

    return () => {
      mark.unmark();
    };
  }, [word, ref]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <h2 className="pt-8 pb-3 text-4xl font-bold font-serif text-center">
          {word}
        </h2>

        {phonicsWord && (
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-400/40 shadow-2xs">
              <span>🌱 自然拼读 Phase {phonicsWord.phase} · L{phonicsWord.lesson}</span>
              <span className="font-mono opacity-70">({phonicsWord.sounds.join(" · ")})</span>
            </span>
            {onOpenBlending && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenBlending}
                className="h-7 px-2.5 text-xs rounded-xl font-black gap-1 border-amber-400/80 bg-amber-500 text-slate-950 hover:bg-amber-600 hover:text-white shadow-xs cursor-pointer"
              >
                <LayersIcon className="size-3.5" />
                <span>🧩 拼读滑读</span>
              </Button>
            )}
          </div>
        )}

        <div className="px-6">
          <div className="mb-4 italic text-sm">{t("context")}</div>
        </div>
        <div className="px-6 text-lg font-serif">
          <div ref={ref} className="">
            {lookups.map((lookup) => (
              <p key={lookup.id} className="mb-8">
                <Sentence sentence={lookup.context} />
              </p>
            ))}
          </div>
        </div>
      </ScrollArea>
      <div className="mt-4 flex items-center justify-center">
        <Button
          id="vocabulary-toggle-side-button"
          variant="default"
          onClick={onFlip}
        >
          {t("backSide")}
        </Button>
      </div>
    </div>
  );
};

const BackSide = (props: {
  meaning: MeaningType;
  phonicsWord?: PhonicsWord | null;
  onOpenBlending?: () => void;
  onFlip: () => void;
}) => {
  const {
    meaning: {
      id,
      word,
      lemma,
      pronunciation,
      pos,
      definition,
      translation,
      lookups,
    },
    phonicsWord,
    onOpenBlending,
    onFlip,
  } = props;

  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    if (!ref.current) return;

    const mark = new Mark(ref.current);
    mark.mark([word], {
      separateWordSearch: false,
      caseSensitive: false,
      acrossElements: true,
    });

    return () => {
      mark.unmark();
    };
  }, [id, ref]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1">
        <h2 className="pt-8 pb-3 text-4xl font-bold font-serif text-center">
          {word}
        </h2>

        {phonicsWord && (
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-400/40 shadow-2xs">
              <span>🌱 自然拼读 Phase {phonicsWord.phase} · L{phonicsWord.lesson}</span>
              <span className="font-mono opacity-70">({phonicsWord.sounds.join(" · ")})</span>
            </span>
            {onOpenBlending && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenBlending}
                className="h-7 px-2.5 text-xs rounded-xl font-black gap-1 border-amber-400/80 bg-amber-500 text-slate-950 hover:bg-amber-600 hover:text-white shadow-xs cursor-pointer"
              >
                <LayersIcon className="size-3.5" />
                <span>🧩 拼读滑读</span>
              </Button>
            )}
          </div>
        )}

        <div className="px-6">
          <div className="mb-2">
            {pos && (
              <span className="italic text-sm text-muted-foreground mr-2">
                {pos}
              </span>
            )}
            {pronunciation && (
              <span className="text-sm mr-2">
                /{pronunciation.replaceAll("/", "")}/
              </span>
            )}
            {lemma && lemma !== word && (
              <span className="text-sm">({lemma})</span>
            )}
          </div>
          {translation && <div className="mb-2">{translation}</div>}
          <div className="mb-2">
            <span>{definition}</span>
          </div>

          <Separator className="my-6" />
          <div className="mb-4 italic text-sm">{t("context")}</div>
        </div>

        <div className="px-6 text-lg font-serif">
          <div ref={ref} className="">
            {lookups.map((lookup) => (
              <div key={lookup.id} className="mb-8">
                <Sentence sentence={lookup.context} />
                <div className="text-base mt-2">
                  {lookup.contextTranslation}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      <div className="mt-4 flex items-center justify-center">
        <Button
          id="vocabulary-toggle-side-button"
          variant="secondary"
          onClick={onFlip}
        >
          {t("frontSide")}
        </Button>
      </div>
    </div>
  );
};
