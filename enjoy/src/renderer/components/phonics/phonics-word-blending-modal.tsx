import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@renderer/components/ui";
import { PhonicsWord } from "@renderer/lib/open-phonics-service";
import { PhonicsBlendingPanel } from "./phonics-blending-panel";

export interface PhonicsWordBlendingModalProps {
  word: PhonicsWord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlendComplete?: () => void;
}

export const PhonicsWordBlendingModal: React.FC<PhonicsWordBlendingModalProps> = ({
  word,
  open,
  onOpenChange,
  onBlendComplete,
}) => {
  if (!word) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full p-6 sm:p-7 rounded-3xl bg-[#FFFDF7] dark:bg-slate-900 border-2 border-amber-300/80 shadow-2xl space-y-6">
        <DialogHeader className="sr-only">
          <DialogTitle>{word.word}</DialogTitle>
          <DialogDescription>
            自然拼读积木动态滑读
          </DialogDescription>
        </DialogHeader>

        <PhonicsBlendingPanel
          word={word}
          onClose={() => onOpenChange(false)}
          onBlendComplete={onBlendComplete}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PhonicsWordBlendingModal;
