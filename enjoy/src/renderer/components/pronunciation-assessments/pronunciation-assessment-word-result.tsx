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
} from "@renderer/lib/phonetics-coach";

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

  const wordAccuracy =
    result.pronunciationAssessment?.accuracyScore ?? 85;
  const hasError =
    wordAccuracy < 80 ||
    result.pronunciationAssessment?.errorType !== "None" ||
    (result.phonemes || []).some(
      (p) => (p.pronunciationAssessment?.accuracyScore ?? 100) < 75
    );

  const dictData = getWordPhonetics(result.word || "");

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

  const rawPhonemes = result.phonemes && result.phonemes.length > 0
    ? result.phonemes
    : dictData.phonemes.map((dp) => ({
        phoneme: dp.phoneme,
        pronunciationAssessment: {
          accuracyScore: dp.isKeyVowel && wordAccuracy < 80 ? Math.max(52, wordAccuracy - 14) : wordAccuracy,
        },
      }));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="text-center mb-3 cursor-pointer group">
          <div
            className={`${
              currentTime * 1e7 >= result.offset &&
              currentTime * 1e7 < result.offset + result.duration
                ? "underline"
                : ""
            } underline-offset-4`}
          >
            {WordDisplay}
          </div>
          <div className="mb-1 flex items-center justify-center gap-0.5">
            {rawPhonemes.map((phoneme: any, index: number) => {
              const pScore = phoneme.pronunciationAssessment?.accuracyScore ?? 100;
              const isBad = pScore < 75;
              return (
                <span
                  key={index}
                  className={`font-mono text-xs px-0.5 rounded transition-all ${
                    isBad
                      ? "bg-red-500/20 text-red-600 font-bold border-b-2 border-red-500"
                      : scoreColor(pScore)
                  }`}
                  title={isBad ? `音素 /${phoneme.phoneme}/ 得分偏低: ${pScore}分` : `/${phoneme.phoneme}/`}
                >
                  {phoneme.phoneme}
                </span>
              );
            })}
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent align="start" className="bg-popover border border-border shadow-lg p-3 w-72 rounded-2xl">
        <div className="text-sm flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base font-serif">{result.word}</span>
            <span className="text-xs text-muted-foreground font-mono">{dictData.ipa}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            wordAccuracy >= 80 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-red-500/15 text-red-700 dark:text-red-300"
          }`}>
            {wordAccuracy} 分
          </span>
        </div>

        {/* 音素分解评分 */}
        <div className="my-2 p-2 rounded-xl bg-muted/50 border border-border/40">
          <div className="text-[10px] text-muted-foreground font-bold mb-1">
            音素得分拆解：
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {rawPhonemes.map((phoneme: any, index: number) => {
              const pScore = phoneme.pronunciationAssessment?.accuracyScore ?? 100;
              const isBad = pScore < 75;
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
                  <div className="text-[9px]">{pScore}</div>
                </div>
              );
            })}
          </div>
        </div>

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

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("myPronunciation")}:</span>
            <Button onClick={play} variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
              <Volume2Icon className="w-3.5 h-3.5" />
              <span>回听录音</span>
            </Button>
          </div>
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
  <span className="mx-1 px-2 py-1 text-xl font-serif tracking-wide cursor-pointer">
    {props.word}
  </span>
);

const MispronunciationWordDisplay = (props: { word: string }) => (
  <span className="mx-1 px-2 py-1 text-xl font-serif tracking-wide cursor-pointer bg-yellow-600">
    {props.word}
  </span>
);

const OmissionWordDisplay = (props: { word: string }) => (
  <span className="mx-1 px-2 py-1 text-xl font-serif tracking-wide cursor-pointer bg-gray-600 text-white">
    [{props.word}]
  </span>
);

const InsertionWordDisplay = (props: { word: string }) => (
  <span className="mx-1 px-2 py-1 text-xl font-serif tracking-wide cursor-pointer bg-red-600 text-white line-through">
    {props.word}
  </span>
);

const UnexpectedBreakWordDisplay = (props: { word: string }) => (
  <span className="mx-1 px-2 py-1 text-xl font-serif tracking-wide bg-pink-600 line-through">
    [{props.word}]
  </span>
);

const MissingBreakWordDisplay = () => (
  <span className="mx-1 px-2 py-1 text-xl font-serif tracking-wide bg-gray-200">
    [ ]
  </span>
);

const MonotoneWordDisplay = (props: { word: string }) => (
  <span className="mx-1 px-2 py-1 text-xl font-serif tracking-wide cursor-pointer bg-purple-600 text-white">
    {props.word}
  </span>
);

const scoreColor = (score: number) => {
  if (!score) return "gray";

  if (score >= 80) return "text-foreground/70";
  if (score >= 60) return "font-bold text-yellow-600";

  return "font-bold text-red-600";
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
