import React, { createContext, useContext, useState, useCallback } from "react";

export interface PronunciationCoachOptions {
  referenceText: string;
  audioUrl?: string;
  translation?: string;
  phonicsFocus?: string;
  source?: "story" | "phonics" | "phonemes" | "chat" | "vocabulary" | "home" | "custom";
  contextTitle?: string;
  bookMeta?: {
    bookId?: string;
    bookTitle?: string;
    page?: number | string;
    returnToModal?: boolean | string;
  };
  onSuccess?: (assessment: PronunciationAssessmentType) => void;
  onCancel?: () => void;
}

interface PronunciationCoachContextType {
  isOpen: boolean;
  options: PronunciationCoachOptions | null;
  openAssessment: (options: PronunciationCoachOptions) => void;
  closeAssessment: () => void;
  lastAssessment: PronunciationAssessmentType | null;
  setLastAssessment: (assessment: PronunciationAssessmentType | null) => void;
}

export const PronunciationCoachContext = createContext<PronunciationCoachContextType>({
  isOpen: false,
  options: null,
  openAssessment: () => {},
  closeAssessment: () => {},
  lastAssessment: null,
  setLastAssessment: () => {},
});

export const PronunciationCoachProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<PronunciationCoachOptions | null>(null);
  const [lastAssessment, setLastAssessment] = useState<PronunciationAssessmentType | null>(null);

  const openAssessment = useCallback((newOptions: PronunciationCoachOptions) => {
    setOptions(newOptions);
    setIsOpen(true);
  }, []);

  const closeAssessment = useCallback(() => {
    if (options?.onCancel) {
      try {
        options.onCancel();
      } catch (err) {
        console.warn("Pronunciation coach cancel callback error:", err);
      }
    }
    setIsOpen(false);
    setOptions(null);
  }, [options]);

  return (
    <PronunciationCoachContext.Provider
      value={{
        isOpen,
        options,
        openAssessment,
        closeAssessment,
        lastAssessment,
        setLastAssessment,
      }}
    >
      {children}
    </PronunciationCoachContext.Provider>
  );
};

export const usePronunciationCoach = () => useContext(PronunciationCoachContext);
