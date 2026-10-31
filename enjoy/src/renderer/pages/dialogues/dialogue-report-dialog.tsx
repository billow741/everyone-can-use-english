import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
} from "@renderer/components/ui";
import {
  PronunciationAssessmentScoreResult,
  PronunciationDiagnosticDetail,
} from "@renderer/components/pronunciation-assessments";
import {
  SparklesIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { Tooltip } from "react-tooltip";

export interface DialogueReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: PronunciationAssessmentType | null;
  recordingUrl?: string | null;
  teacherAudioSrc?: string;
  referenceText?: string;
}

export const DialogueReportDialog: React.FC<DialogueReportDialogProps> = ({
  open,
  onOpenChange,
  assessment,
  recordingUrl,
  teacherAudioSrc,
  referenceText,
}) => {
  if (!assessment) return null;

  let parsedResult: any = assessment.result;
  if (typeof parsedResult === "string") {
    try {
      parsedResult = JSON.parse(parsedResult);
    } catch {
      parsedResult = null;
    }
  }

  const isSimulatedFallback =
    parsedResult?.evaluationSource === "simulated-fallback";
  const words = parsedResult?.words || [];
  const effectiveRefText =
    referenceText ||
    assessment.referenceText ||
    parsedResult?.display ||
    "";
  const effectiveRecSrc =
    recordingUrl ||
    (assessment as any)?.recordingSrc ||
    (assessment.target as any)?.src ||
    "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-[#FFFDF9] dark:bg-slate-900 border-2 border-amber-300 shadow-2xl">
        {/* 报告头部 */}
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                🎯
              </span>
              <DialogTitle className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                跟读精准评测报告
              </DialogTitle>
            </div>

            {isSimulatedFallback ? (
              <Badge
                variant="outline"
                className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-300"
              >
                练习反馈 · 模拟估算
              </Badge>
            ) : (
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold gap-1 shadow-2xs">
                <CheckCircle2Icon className="size-3" /> Azure 真实声学评测
              </Badge>
            )}
          </div>

          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
            <span>本句跟读目标：</span>
            <span className="font-serif font-black text-foreground text-sm">
              &ldquo;{effectiveRefText}&rdquo;
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* 诚实标注兜底状态 */}
        {isSimulatedFallback && (
          <div className="my-2 rounded-xl border border-amber-400/40 bg-amber-500/15 p-3 text-xs font-semibold text-amber-800 dark:text-amber-200">
            练习反馈 · 本次未能连接微软 Azure 真实评测，分数为模拟估算，仅供练习参考。
          </div>
        )}

        {/* 多维打分面板：总分 + 准确度、流利度、完整度、韵律度 */}
        <div className="rounded-2xl border border-amber-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 p-3 sm:p-4 my-2 shadow-2xs">
          <div className="text-xs font-black text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1.5">
            <SparklesIcon className="size-3.5 text-amber-600" />
            <span>多维度发音打分 (Pronunciation Score Breakdown)</span>
          </div>

          <PronunciationAssessmentScoreResult
            pronunciationScore={assessment.pronunciationScore}
            accuracyScore={assessment.accuracyScore}
            fluencyScore={assessment.fluencyScore}
            completenessScore={assessment.completenessScore}
            prosodyScore={assessment.prosodyScore}
          />
        </div>

        {/* 诊断详情：内嵌 PitchContourOverlay（双轨语调走势叠图对比） + ArticulatoryTongueVisualizer（发音动画面板） */}
        <div className="mt-2">
          <PronunciationDiagnosticDetail
            words={words}
            referenceText={effectiveRefText}
            recordingSrc={effectiveRecSrc}
            teacherAudioSrc={teacherAudioSrc}
          />
        </div>

        <Tooltip id="recording-tooltip" />
      </DialogContent>
    </Dialog>
  );
};
