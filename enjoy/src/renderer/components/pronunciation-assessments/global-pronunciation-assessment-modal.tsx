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
        overlayClassName="bg-black/70 backdrop-blur-md"
        className="w-full sm:max-w-2xl lg:max-w-3xl flex flex-col h-full max-h-screen p-0 bg-background/98 backdrop-blur-md border-l-2 border-amber-400/40 shadow-2xl z-[80] overflow-hidden"
        aria-describedby={undefined}
      >
        <SheetHeader className="p-4 sm:p-6 pb-3 text-left border-b border-border/50 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-lg sm:text-xl font-black text-foreground">
            <MicIcon className="size-5 text-amber-500" />
            <span>AI 发音纠错</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-400/30">
              AI 帮你听发音
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
          source={options.source}
          archiveContext={options.archiveContext}
          className="flex-1 min-h-0 flex flex-col"
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
            const queryParts: string[] = [];
            if (bookMeta?.bookId) {
              queryParts.push(`bookId=${encodeURIComponent(bookMeta.bookId)}`);
              queryParts.push(`bookTitle=${encodeURIComponent(bookMeta.bookTitle || "")}`);
              if (bookMeta.page !== undefined) {
                queryParts.push(`page=${encodeURIComponent(String(bookMeta.page))}`);
              }
              if (bookMeta.returnToModal !== undefined) {
                queryParts.push(`returnToModal=${encodeURIComponent(String(bookMeta.returnToModal))}`);
              }
            }
            if (options.source) {
              queryParts.push(`source=${encodeURIComponent(options.source)}`);
            }
            const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
            navigate(`/pronunciation_assessments/${created?.id || ""}${qs}`);
          }}
        />
      </SheetContent>
    </Sheet>
  );
};
