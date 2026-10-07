import {
  PronunciationAssessmentFulltextResult,
  PronunciationAssessmentScoreResult,
  PronunciationDiagnosticDetail,
  WavesurferPlayer,
} from "@renderer/components";
import { Separator, ScrollArea, toast, Button } from "@renderer/components/ui";
import { useState, useContext, useEffect } from "react";
import { AppSettingsProviderContext } from "@renderer/context";
import { Tooltip } from "react-tooltip";
import { usePronunciationAssessments } from "@renderer/hooks";
import { useNavigate } from "react-router-dom";
import { RotateCcwIcon, MicIcon } from "lucide-react";
import { t } from "i18next";

export const RecordingDetail = (props: {
  recording?: RecordingType;
  pronunciationAssessment?: PronunciationAssessmentType;
  onAssess?: (assessment: PronunciationAssessmentType) => void;
  onPlayOrigin?: (word: string, index: number) => void;
}) => {
  const { onAssess, onPlayOrigin } = props;
  const navigate = useNavigate();

  const [pronunciationAssessment, setPronunciationAssessment] =
    useState<PronunciationAssessmentType>(
      props.pronunciationAssessment || props.recording?.pronunciationAssessment
    );

  const effectiveRecording: RecordingType =
    props.recording ||
    (pronunciationAssessment?.target as RecordingType) ||
    ({
      id:
        pronunciationAssessment?.targetId ||
        pronunciationAssessment?.id ||
        `rec_${Date.now()}`,
      referenceText:
        pronunciationAssessment?.referenceText ||
        pronunciationAssessment?.result?.display ||
        "",
      src: "",
      duration: pronunciationAssessment?.result?.duration || 5000,
      language: pronunciationAssessment?.language || "en-US",
    } as any);

  const recording = effectiveRecording;
  const { result } = pronunciationAssessment || {};
  const [currentTime, setCurrentTime] = useState<number>(0);

  const { learningLanguage } = useContext(AppSettingsProviderContext);
  const { createAssessment } = usePronunciationAssessments();
  const [assessing, setAssessing] = useState(false);

  const assess = () => {
    if (assessing) return;
    if (result) return;
    if (!recording?.src) return;

    if (recording.duration > 60 * 1000) {
      toast.error(t("recordingIsTooLongToAssess"));
      return;
    }
    setAssessing(true);
    createAssessment({
      recording,
      reference: recording.referenceText?.replace(/[—]/g, ", ") || "",
      language: recording.language || learningLanguage,
    })
      .then((assessment) => {
        onAssess && onAssess(assessment);
        setPronunciationAssessment(assessment);
      })
      .catch((err) => {
        toast.error(err.message);
      })
      .finally(() => {
        setAssessing(false);
      });
  };

  return (
    <div className="">
      {recording.src ? (
        <div className="flex justify-center mb-6">
          <WavesurferPlayer
            id={recording.id}
            src={recording.src}
            setCurrentTime={setCurrentTime}
          />
        </div>
      ) : null}

      <Separator />

      {result ? (
        <PronunciationAssessmentFulltextResult
          className="py-4"
          words={result.words}
          currentTime={currentTime}
          src={recording.src}
          onPlayOrigin={onPlayOrigin}
        />
      ) : (
        <ScrollArea className="min-h-72 py-4 px-8 select-text">
          {(recording?.referenceText || "").split("\n").map((line, index) => (
            <div key={index} className="text-xl font-serif tracking-wide mb-2">
              {line}
            </div>
          ))}
        </ScrollArea>
      )}

      <Separator />

      <PronunciationAssessmentScoreResult
        pronunciationScore={pronunciationAssessment?.pronunciationScore}
        accuracyScore={pronunciationAssessment?.accuracyScore}
        fluencyScore={pronunciationAssessment?.fluencyScore}
        completenessScore={pronunciationAssessment?.completenessScore}
        prosodyScore={pronunciationAssessment?.prosodyScore}
        assessing={assessing}
        onAssess={assess}
      />

      {/* 🎯 重点发音问题与音素诊断报告 + TTS 标准示范 */}
      {result?.words && (
        <div className="mt-4 border-t pt-4">
          <PronunciationDiagnosticDetail
            words={result.words}
            referenceText={recording.referenceText}
            recordingSrc={recording.src}
          />
        </div>
      )}

      {/* 🔄 重新再次录音评估操作区 */}
      {recording.referenceText && (
        <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-center">
          <Button
            size="lg"
            className="w-full max-w-md h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-md gap-2 text-sm md:text-base cursor-pointer transition-all hover:scale-[1.01]"
            onClick={() => {
              navigate(
                `/pronunciation_assessments/new?text=${encodeURIComponent(
                  recording.referenceText || ""
                )}`
              );
            }}
          >
            <RotateCcwIcon className="size-4.5" />
            <span>🔄 重新再次录音评估</span>
          </Button>
        </div>
      )}

      <Tooltip id="recording-tooltip" />
    </div>
  );
};
