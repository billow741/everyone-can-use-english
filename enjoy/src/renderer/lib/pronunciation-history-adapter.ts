import { calibrateScore } from "@renderer/hooks/use-pronunciation-assessments";

export interface BackendPronunciationAssessmentItem {
  id: number | string;
  client_event_id?: string;
  ts_ms: number;
  source?: string;
  context_ref?: string;
  ref_text: string;
  scores: {
    accuracy: number | null;
    fluency: number | null;
    completeness: number | null;
    prosody: number | null;
    overall: number | null;
  };
  words: Array<{
    word: string;
    accuracy: number | null;
    error_type?: string;
    phonemes?: Array<{
      phoneme: string;
      accuracy: number | null;
    }>;
  }>;
}

export interface BackendPronunciationHistoryResponse {
  status: string;
  user_id: string;
  assessments: BackendPronunciationAssessmentItem[];
  next_before_ts_ms: number | null;
  next_before_id: number | string | null;
  error?: string;
  message?: string;
}

export const getPronunciationSourceLabel = (source?: string): string => {
  if (!source) return "";
  switch (source) {
    case "quote":
      return "金句";
    case "dialogue":
      return "对话课";
    case "word-family":
      return "词族";
    case "listening":
      return "听故事";
    case "world":
      return "环球漫游";
    default:
      return source;
  }
};

export const adaptBackendAssessmentToLocal = (
  raw: BackendPronunciationAssessmentItem
): PronunciationAssessmentType => {
  const scores = raw.scores || {
    accuracy: null,
    fluency: null,
    completeness: null,
    prosody: null,
    overall: null,
  };

  const calibrateIfNotNull = (val: number | null | undefined): number | null => {
    if (typeof val === "number" && !isNaN(val)) {
      return calibrateScore(val);
    }
    return null;
  };

  const pronunciationScore = calibrateIfNotNull(scores.overall) as any;
  const accuracyScore = calibrateIfNotNull(scores.accuracy) as any;
  const fluencyScore = calibrateIfNotNull(scores.fluency) as any;
  const completenessScore = calibrateIfNotNull(scores.completeness) as any;
  const prosodyScore = calibrateIfNotNull(scores.prosody) as any;

  const createdAt = raw.ts_ms ? new Date(raw.ts_ms).toISOString() : new Date().toISOString();

  const words = (raw.words || []).map((w) => ({
    word: w.word,
    duration: 0,
    offset: 0,
    pronunciationAssessment: {
      accuracyScore: calibrateIfNotNull(w.accuracy) as any,
      errorType: (w.error_type || "None") as any,
    },
    phonemes: (w.phonemes || []).map((p) => ({
      duration: 0,
      offset: 0,
      phoneme: p.phoneme,
      pronunciationAssessment: {
        accuracyScore: calibrateIfNotNull(p.accuracy) as any,
      },
    })),
    syllables: undefined as any,
  }));

  const adapted: any = {
    id: String(raw.id),
    language: "en-US",
    referenceText: raw.ref_text || "",
    pronunciationScore,
    accuracyScore,
    fluencyScore,
    completenessScore,
    prosodyScore,
    createdAt: createdAt as any,
    updatedAt: createdAt as any,
    syncedAt: createdAt as any,
    isSynced: true,
    source: raw.source,
    context_ref: raw.context_ref,
    contextRef: raw.context_ref,
    clientEventId: raw.client_event_id,
    target: {
      id: String(raw.id),
      referenceText: raw.ref_text || "",
      source: raw.source,
      contextRef: raw.context_ref,
    },
    result: {
      display: raw.ref_text || "",
      words,
      pronunciationAssessment: {
        accuracyScore: accuracyScore ?? 0,
        completenessScore: completenessScore ?? 0,
        fluencyScore: fluencyScore ?? 0,
        pronScore: pronunciationScore ?? 0,
      },
      confidence: 1,
      itn: raw.ref_text || "",
      lexical: raw.ref_text || "",
      markedItn: raw.ref_text || "",
    },
  };

  return adapted as PronunciationAssessmentType;
};
