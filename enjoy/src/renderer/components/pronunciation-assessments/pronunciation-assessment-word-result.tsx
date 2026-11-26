import { t } from "i18next";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  ScrollArea,
  ScrollBar,
} from "@renderer/components/ui";
import { Volume2Icon } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import {
  playStandardTts,
  getPhonemeCoach,
  getWordPhonetics,
  isLetterPhonemes,
  isFakeIpa,
  looksLikeRealIpa,
} from "@renderer/lib/phonetics-coach";
import {
  fetchWordIpa,
  getCachedWordIpa,
  formatIpa,
  WordIpaResult,
} from "@renderer/lib/ldoce-dictionary";

export const PronunciationAssessmentWordResult = (props: {
  src?: string;
  result: PronunciationAssessmentWordResultType;
  errorDisplay?: {
    mispronunciation: boolean;
    omission: boolean;
    insertion: boolean;
    unexpectedBreak: boolean;
    missingBreak: boolean;
    monotone: boolean;
  };
  currentTime?: number;
  onPlayOrigin?: () => void;
}) => {
  const {
    result,
    errorDisplay = {
      mispronunciation: true,
      omission: true,
      insertion: true,
      unexpectedBreak: true,
      missingBreak: true,
      monotone: true,
    },
    currentTime = 0,
    onPlayOrigin,
  } = props;

  const audio = useRef<HTMLAudioElement>(null);
  const [playingTts, setPlayingTts] = useState(false);

  const rawWordAccuracy = result.pronunciationAssessment?.accuracyScore;
  const wordAccuracy =
    typeof rawWordAccuracy === "number" && !isNaN(rawWordAccuracy)
      ? rawWordAccuracy
      : null;
  const hasError =
    (typeof wordAccuracy === "number" && wordAccuracy < 80) ||
    result.pronunciationAssessment?.errorType !== "None" ||
    (result.phonemes || []).some((p) => {
      const s = p.pronunciationAssessment?.accuracyScore;
      return typeof s === "number" && s < 75;
    });

  const dictData = getWordPhonetics(result.word || "");

  const currentWord = result.word || "";
  const [ldoceIpa, setLdoceIpa] = useState<WordIpaResult | null>(() =>
    getCachedWordIpa(currentWord)
  );

  useEffect(() => {
    let isMounted = true;
    const wordToFetch = result.word || "";
    if (!wordToFetch) {
      setLdoceIpa(null);
      return;
    }

    const cached = getCachedWordIpa(wordToFetch);
    if (cached) {
      setLdoceIpa(cached);
      return;
    }

    // 加载期间先回落为 null 展示 coach 值，后端返回后再换成后端值
    setLdoceIpa(null);

    fetchWordIpa(wordToFetch).then((data) => {
      if (isMounted && (result.word || "") === wordToFetch) {
        if (data) {
          setLdoceIpa(data);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [result.word]);

  const handlePlayTts = async (text: string, isSlow: boolean = false) => {
    setPlayingTts(true);
    await playStandardTts(text, {
      rate: isSlow ? "-30%" : "-10%",
      onEnd: () => setPlayingTts(false),
    });
  };

  const WordDisplay = {
    None: <CorrectWordDisplay word={result.word} />,
    Mispronunciation: errorDisplay.mispronunciation ? (
      <MispronunciationWordDisplay word={result.word} />
    ) : (
      <CorrectWordDisplay word={result.word} />
    ),
    Omission: errorDisplay.omission ? (
      <OmissionWordDisplay word={result.word} />
    ) : (
      <CorrectWordDisplay word={result.word} />
    ),
    Insertion: errorDisplay.insertion ? (
      <InsertionWordDisplay word={result.word} />
    ) : (
      <CorrectWordDisplay word={result.word} />
    ),
    UnexpectedBreak: errorDisplay.unexpectedBreak ? (
      <UnexpectedBreakWordDisplay word={result.word} />
    ) : (
      <CorrectWordDisplay word={result.word} />
    ),
    MissingBreak: errorDisplay ? (
      <MissingBreakWordDisplay />
    ) : (
      <CorrectWordDisplay word={result.word} />
    ),
    Monotone: errorDisplay ? (
      <MonotoneWordDisplay word={result.word} />
    ) : (
      <CorrectWordDisplay word={result.word} />
    ),
  }[result.pronunciationAssessment.errorType];

  const play = () => {
    if (!audio.current || !props.src) return;

    const { offset, duration } = result;
    if (!offset || !duration) return;

    const startTime = (offset * 1.0) / 1e7;
    const endTime = ((offset + duration) * 1.0) / 1e7;

    audio.current.currentTime = startTime;

    // Add timeupdate listener to stop at the end of the segment
    const handleTimeUpdate = () => {
      if (audio.current.currentTime >= endTime) {
        audio.current.pause();
        audio.current.removeEventListener("timeupdate", handleTimeUpdate);
      }
    };

    audio.current.addEventListener("timeupdate", handleTimeUpdate);
    audio.current.play();
  };

  useEffect(() => {
    if (!audio.current) {
      audio.current = new Audio(props.src);
    }

    return () => {
      if (audio.current) {
        audio.current.pause();
        audio.current.removeEventListener("timeupdate", () => {});
        audio.current = null;
      }
    };
  }, [props.src]);

  const isMispronunciation =
    result.pronunciationAssessment?.errorType === "Mispronunciation";

  const isLetters = isLetterPhonemes(result.phonemes, result.word || "");
  const hasRealAzure = Boolean(
    !isLetters &&
    result.phonemes &&
    Array.isArray(result.phonemes) &&
    result.phonemes.length > 0
  );

  const rawPhonemes = (() => {
    // 分解优先级：coach 词典 / word-ipa.json → 存量 Azure 音素（仅当它像真音标时）→ 不显示
    const targetPhonemes =
      dictData.phonemes && dictData.phonemes.length > 0
        ? dictData.phonemes
        : hasRealAzure && looksLikeRealIpa(result.phonemes)
        ? result.phonemes
        : [];

    if (targetPhonemes.length === 0) {
      return [];
    }

    if (hasRealAzure) {
      const azurePhonemes = result.phonemes;
      const azureScores = azurePhonemes.map((p: any) => {
        const s =
          p.pronunciationAssessment?.accuracyScore ??
          p.accuracyScore ??
          p.accuracy;
        return typeof s === "number" && !isNaN(s) ? s : wordAccuracy;
      });
      const validAzureScores = azureScores.filter(
        (s: any): s is number => typeof s === "number" && !isNaN(s)
      );
      const minAzureScore =
        validAzureScores.length > 0 ? Math.min(...validAzureScores) : wordAccuracy;

      if (targetPhonemes === azurePhonemes) {
        return azurePhonemes.map((p: any, index: number) => ({
          phoneme: p.phoneme,
          pronunciationAssessment: {
            accuracyScore: azureScores[index] ?? wordAccuracy,
          },
        }));
      }

      return targetPhonemes.map((dp: any, index: number) => {
        let score: number | null;
        if (isMispronunciation && dp.isKeyVowel) {
          score = minAzureScore;
        } else if (index < azureScores.length) {
          score = azureScores[index];
        } else {
          score = wordAccuracy;
        }
        return {
          phoneme: dp.phoneme,
          pronunciationAssessment: {
            accuracyScore: score,
          },
        };
      });
    }

        // 无 Azure 数据（或存量字母被判定为无音素数据）：若词分缺失则不编造音素分
        return [];
  })();

  // 标题 IPA 优先级：后端 LDOCE 美音（us，且 source === "ldoce5" 时）→ coach dictData.ipa（仍过 isFakeIpa）→ 不显示
  const effectiveLdoceIpa =
    ldoceIpa?.source === "ldoce5" &&
    ldoceIpa.us &&
    !isFakeIpa(ldoceIpa.us, currentWord)
      ? formatIpa(ldoceIpa.us)
      : "";

  const coachIpa =
    dictData.ipa && !isFakeIpa(dictData.ipa, currentWord)
      ? dictData.ipa
      : "";

  const displayIpa = effectiveLdoceIpa || coachIpa || "";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-center mb-3 cursor-pointer group bg-transparent border-0 p-0"
        >
          <span
            className={`block ${
              currentTime * 1e7 >= result.offset &&
              currentTime * 1e7 < result.offset + result.duration
                ? "underline"
                : ""
            } underline-offset-4`}
          >
            {WordDisplay}
          </span>
          {rawPhonemes.length > 0 && (
            <span className="mt-1 mb-1 flex items-center justify-center gap-0.5">
              {rawPhonemes.map((phoneme: any, index: number) => {
                const rawPScore = phoneme.pronunciationAssessment?.accuracyScore;
                const pScore = typeof rawPScore === "number" && !isNaN(rawPScore) ? rawPScore : null;
                const isBad = typeof pScore === "number" && pScore < 75;
                return (
                  <span
                    key={index}
                    className={`font-mono text-xs px-0.5 rounded transition-all ${
                      isBad
                        ? "bg-red-500/20 text-red-600 font-bold border-b-2 border-red-500"
                        : typeof pScore === "number"
                        ? scoreColor(pScore)
                        : "text-muted-foreground"
                    }`}
                    title={
                      isBad
                        ? `音素 /${phoneme.phoneme}/ 得分偏低: ${pScore}分`
                        : `/${phoneme.phoneme}/`
                    }
                  >
                    {phoneme.phoneme}
                  </span>
                );
              })}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="bg-popover border border-border shadow-lg p-3 w-72 rounded-2xl">
        <div className="text-sm flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base font-serif">{result.word}</span>
            {displayIpa && (
              <span className="text-xs text-muted-foreground font-mono">{displayIpa}</span>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            typeof wordAccuracy === "number" && wordAccuracy >= 80
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : typeof wordAccuracy === "number"
              ? "bg-red-500/15 text-red-700 dark:text-red-300"
              : "bg-muted text-muted-foreground"
          }`}>
            {typeof wordAccuracy === "number" ? `${wordAccuracy} 分` : "—"}
          </span>
        </div>

        {/* 音素分解评分 */}
        {rawPhonemes.length > 0 && (
          <div className="my-2 p-2 rounded-xl bg-muted/50 border border-border/40">
            <div className="text-[11px] text-muted-foreground font-bold mb-1">
              音素得分拆解：
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {rawPhonemes.map((phoneme: any, index: number) => {
                const rawPScore = phoneme.pronunciationAssessment?.accuracyScore;
                const pScore = typeof rawPScore === "number" && !isNaN(rawPScore) ? rawPScore : null;
                const isBad = typeof pScore === "number" && pScore < 75;
                return (
                <div
                  key={index}
                  className={`text-center px-1.5 py-0.5 rounded border text-[11px] ${
                    isBad
                      ? "bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-300 font-bold"
                      : "bg-background border-border"
                  }`}
                >
                  <div className="font-mono font-bold">/{phoneme.phoneme}/</div>
                  <div className="text-[11px]">{typeof pScore === "number" ? pScore : "—"}</div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* 标准示范 TTS 按钮 */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between gap-1">
            <Button
              onClick={() => handlePlayTts(result.word, false)}
              variant="outline"
              size="sm"
              className={`h-7 flex-1 text-xs font-bold rounded-lg border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 gap-1 ${
                playingTts ? "bg-amber-500/20 ring-1 ring-amber-500" : ""
              }`}
            >
              <Volume2Icon className={`w-3.5 h-3.5 text-amber-600 ${playingTts ? "animate-bounce" : ""}`} />
              <span>{playingTts ? "示范中..." : "听标准示范"}</span>
            </Button>
            <Button
              onClick={() => handlePlayTts(result.word, true)}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground"
              title="慢速慢听"
            >
              <span>🐢 慢速</span>
            </Button>
          </div>

          {props.src &&
            typeof result.offset === "number" &&
            result.offset > 0 &&
            typeof result.duration === "number" &&
            result.duration > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("myPronunciation")}:</span>
                <Button onClick={play} variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                  <Volume2Icon className="w-3.5 h-3.5" />
                  <span>回听录音</span>
                </Button>
              </div>
            )}
        </div>

        {/* 针对性发音纠错建议 */}
        {hasError && (
          <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-100">
            <div className="font-bold flex items-center gap-1 mb-0.5 text-amber-800 dark:text-amber-200">
              <span>💡 敢敢纠音建议:</span>
            </div>
            <p className="leading-tight">{dictData.coachingHint || "注意听标准发音示范，发音时口型尽量张大，保持音素清晰饱满。"}</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const CorrectWordDisplay = (props: { word: string }) => (
  <span className="inline-block mx-1 px-2 py-1 text-xl font-serif tracking-wide cursor-pointer rounded-sm border border-border/80 bg-background/80 hover:border-primary/50 hover:bg-primary/5 transition-colors">
    {props.word}
  </span>
);

const MispronunciationWordDisplay = (props: { word: string }) => (
  <span className="inline-block mx-1 px-2 py-1 text-xl font-serif tracking-wide cursor-pointer rounded-sm bg-[#F2A93B] text-[#123B3C]">
    {props.word}
  </span>
);

const OmissionWordDisplay = (props: { word: string }) => (
  <span className="inline-block mx-1 px-2 py-1 text-xl font-serif tracking-wide cursor-pointer rounded-sm bg-gray-600 text-white">
    [{props.word}]
  </span>
);

const InsertionWordDisplay = (props: { word: string }) => (
  <span className="inline-block mx-1 px-2 py-1 text-xl font-serif tracking-wide cursor-pointer rounded-sm bg-red-600 text-white line-through">
    {props.word}
  </span>
);

const UnexpectedBreakWordDisplay = (props: { word: string }) => (
  <span className="inline-block mx-1 px-2 py-1 text-xl font-serif tracking-wide cursor-pointer rounded-sm bg-pink-600 line-through">
    [{props.word}]
  </span>
);

const MissingBreakWordDisplay = () => (
  <span className="inline-block mx-1 px-2 py-1 text-xl font-serif tracking-wide cursor-pointer rounded-sm bg-gray-200">
    [ ]
  </span>
);

const MonotoneWordDisplay = (props: { word: string }) => (
  <span className="inline-block mx-1 px-2 py-1 text-xl font-serif tracking-wide cursor-pointer rounded-sm bg-purple-600 text-white">
    {props.word}
  </span>
);

const scoreColor = (score: number) => {
  if (!score) return "gray";

  if (score >= 80) return "text-foreground/70";
  if (score >= 60) return "font-bold text-[#96690A]";

  return "font-bold text-red-700";
};

export const PronunciationAssessmentPhonemeResult = memo(
  (props: { result: PronunciationAssessmentWordResultType }) => {
    const { result } = props;

    return (
      <ScrollArea className="w-full">
        <div className="w-full flex items-center gap-2">
          {result.phonemes.map((phoneme, index) => (
            <div key={index} className="text-sm text-center">
              <div className="font-bold font-code">{phoneme.phoneme}</div>
              <div
                className={`text-xs font-serif ${scoreColor(
                  phoneme.pronunciationAssessment.accuracyScore
                )}`}
              >
                {phoneme.pronunciationAssessment.accuracyScore}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }
);
