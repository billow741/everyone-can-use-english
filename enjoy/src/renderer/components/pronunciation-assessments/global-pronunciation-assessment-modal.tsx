import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@renderer/components/ui";
import { usePronunciationCoach } from "@renderer/context";
import { useNavigate } from "react-router-dom";
import { PronunciationAssessmentForm } from "./pronunciation-assessment-form";
import { MicIcon } from "lucide-react";

export const GlobalPronunciationAssessmentModal: React.FC = () => {
  const {
    isOpen,
    options,
    closeAssessment,
    setLastAssessment,
  } = usePronunciationCoach();
  const navigate = useNavigate();

  if (!isOpen || !options) return null;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeAssessment();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-4 sm:p-6 bg-background/98 backdrop-blur-md border-l-2 border-amber-400/40 shadow-2xl z-[80]"
        aria-describedby={undefined}
      >
        <SheetHeader className="mb-4 text-left border-b border-border/50 pb-3">
          <SheetTitle className="flex items-center gap-2 text-lg sm:text-xl font-black text-foreground">
            <MicIcon className="size-5 text-amber-500" />
            <span>AI 发音纠错舱</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-400/30">
              音素级声学诊断
            </span>
          </SheetTitle>
        </SheetHeader>

        <PronunciationAssessmentForm
          key={options.referenceText}
          defaultReferenceText={options.referenceText}
          audioUrl={options.audioUrl}
          translation={options.translation}
          phonicsFocus={options.phonicsFocus}
          bookMeta={options.bookMeta}
          onCancel={closeAssessment}
          onSuccess={(created) => {
            setLastAssessment(created);
            if (options.onSuccess) {
              try {
                options.onSuccess(created);
              } catch (e) {
                console.warn("Pronunciation coach onSuccess callback error:", e);
              }
            }
            closeAssessment();
            const bookMeta = options.bookMeta;
            const bookParams = bookMeta?.bookId
              ? `&bookId=${encodeURIComponent(bookMeta.bookId)}&bookTitle=${encodeURIComponent(bookMeta.bookTitle || "")}&page=${bookMeta.page !== undefined ? String(bookMeta.page) : ""}&returnToModal=${bookMeta.returnToModal !== undefined ? String(bookMeta.returnToModal) : "true"}`
              : "";
            const sourceQuery = options.source
              ? `&source=${encodeURIComponent(options.source)}`
              : "";
            navigate(
              `/pronunciation_assessments?selectId=${created?.id || ""}${bookParams}${sourceQuery}`
            );
          }}
        />
      </SheetContent>
    </Sheet>
  );
};
