import {
  getPhonemeCoach,
  getWordPhonetics,
  isFakeIpa,
  isLetterPhonemes,
  PhonemeGuide,
} from "@renderer/lib/phonetics-coach";
import { formatIpa, getCachedWordIpa, WordIpaResult } from "@renderer/lib/ldoce-dictionary";

export const WORD_PASS_THRESHOLD = 80;
export const PHONEME_PASS_THRESHOLD = 75;
export const OVERALL_MID_THRESHOLD = 60;
export const OVERALL_PASS_THRESHOLD = 80;

export const ERROR_TYPE_LABELS: Record<string, string> = {
  Mispronunciation: "音素发错",
  Omission: "漏读了",
  Insertion: "多读了音",
  UnexpectedBreak: "停顿太多",
  MissingBreak: "缺少停顿",
  Monotone: "语调太单调",
};

export const formatErrorTypeLabel = (errorType?: string): string => {
  if (!errorType || errorType === "None") return "";
  return ERROR_TYPE_LABELS[errorType] || errorType;
};

export interface AnalyzedPhoneme {
  phoneme: string;
  score: number | null;
  isError: boolean;
  phonemeIndex: number;
  guide: PhonemeGuide;
}

export interface AnalyzedWrongPhoneme {
  phoneme: string;
  score: number;
  phonemeIndex: number;
  guide: PhonemeGuide;
}

export interface AnalyzedWord {
  word: string;
  cleanWord: string;
  accuracy: number | null;
  errorType: string;
  errorTypeLabel: string;
  phonemes: AnalyzedPhoneme[];
  wrongPhonemes: AnalyzedWrongPhoneme[];
  hasIssue: boolean;
  ipa: string;
  translation: string;
  coachingHint?: string;
  offset: number;
  duration: number;
}

export const analyzeAssessmentWords = (
  rawWords: any[],
  options?: { ldoceMap?: Record<string, WordIpaResult> }
): AnalyzedWord[] => {
  const ldoceMap = options?.ldoceMap || {};

  return (rawWords || []).map((item) => {
    const rawWord = item?.word || "";
    const cleanWord = rawWord.toLowerCase().replace(/[^a-z]/g, "");
    const errorType =
      item?.pronunciationAssessment?.errorType || item?.errorType || "None";
    const errorTypeLabel = formatErrorTypeLabel(errorType);

    const rawAccuracy =
      item?.pronunciationAssessment?.accuracyScore ?? item?.accuracyScore;
    const accuracy =
      errorType === "Omission"
        ? null
        : typeof rawAccuracy === "number" && !isNaN(rawAccuracy)
        ? rawAccuracy
        : null;

    const dictData = getWordPhonetics(cleanWord);
    const ldoce = ldoceMap[cleanWord] || getCachedWordIpa(cleanWord);
    const effectiveLdoceIpa =
      ldoce?.source === "ldoce5" && ldoce.us && !isFakeIpa(ldoce.us, rawWord)
        ? formatIpa(ldoce.us)
        : "";
    const coachIpa =
      dictData.ipa && !isFakeIpa(dictData.ipa, rawWord) ? dictData.ipa : "";
    const displayIpa = effectiveLdoceIpa || coachIpa || "";

    const isLetters = isLetterPhonemes(item?.phonemes, rawWord);
    const hasRealPhonemes = Boolean(
      errorType !== "Omission" &&
        !isLetters &&
        Array.isArray(item?.phonemes) &&
        item.phonemes.length > 0
    );

    const phonemes: AnalyzedPhoneme[] = hasRealPhonemes
      ? item.phonemes.map((p: any, pIdx: number) => {
          const ph = typeof p === "string" ? p : p?.phoneme || "";
          const rawScore =
            p?.pronunciationAssessment?.accuracyScore ??
            p?.accuracyScore ??
            p?.accuracy;
          const score =
            typeof rawScore === "number" && !isNaN(rawScore) ? rawScore : null;
          const isError =
            typeof score === "number" && score < PHONEME_PASS_THRESHOLD;
          return {
            phoneme: ph,
            score,
            isError,
            phonemeIndex: pIdx,
            guide: getPhonemeCoach(ph, { word: cleanWord, phonemeIndex: pIdx }),
          };
        })
      : [];

    const wrongPhonemes: AnalyzedWrongPhoneme[] = phonemes
      .filter((p): p is AnalyzedPhoneme & { score: number } => p.isError && typeof p.score === "number")
      .map((p) => ({
        phoneme: p.phoneme,
        score: p.score,
        phonemeIndex: p.phonemeIndex,
        guide: p.guide,
      }));

    const hasIssue =
      (typeof accuracy === "number" && accuracy < WORD_PASS_THRESHOLD) ||
      errorType !== "None" ||
      wrongPhonemes.length > 0;

    return {
      word: rawWord,
      cleanWord,
      accuracy,
      errorType,
      errorTypeLabel,
      phonemes,
      wrongPhonemes,
      hasIssue,
      ipa: displayIpa,
      translation: dictData.translation || "",
      coachingHint: dictData.coachingHint,
      offset: typeof item?.offset === "number" ? item.offset : 0,
      duration: typeof item?.duration === "number" ? item.duration : 0,
    };
  });
};

export interface AssessmentConclusion {
  scoreVerdict: string;
  conclusionText: string;
  hasValidWordData: boolean;
  topWeakPhonemes: string[];
  emptyPraiseAllowed: boolean;
}

export const buildAssessmentConclusion = (params: {
  totalScore: number | null;
  analyzedWords: AnalyzedWord[];
  issueWords: AnalyzedWord[];
}): AssessmentConclusion => {
  const { totalScore, analyzedWords, issueWords } = params;
  const hasWordsWithScore =
    analyzedWords.length > 0 &&
    analyzedWords.some((w) => typeof w.accuracy === "number");

  // 没有任何词或词分全 null 且无漏读/错误词
  if (!hasWordsWithScore && issueWords.length === 0) {
    return {
      scoreVerdict: "没测到有效数据",
      conclusionText: "这次没测到有效数据，重新读一遍",
      hasValidWordData: false,
      topWeakPhonemes: [],
      emptyPraiseAllowed: false,
    };
  }

  const effectiveScore =
    typeof totalScore === "number" && !isNaN(totalScore) ? totalScore : null;

  const omissionWords = issueWords.filter((w) => w.errorType === "Omission");
  const scoredIssueWords = issueWords.filter((w) => w.errorType !== "Omission");

  // 收集全部弱音素并按分升序取前 2 个
  const allPhonemeHits: Array<{
    word: string;
    phoneme: string;
    score: number;
  }> = [];
  for (const w of scoredIssueWords) {
    for (const wp of w.wrongPhonemes) {
      allPhonemeHits.push({
        word: w.word,
        phoneme: wp.phoneme,
        score: wp.score,
      });
    }
  }
  allPhonemeHits.sort((a, b) => a.score - b.score);

  const topWeakPhonemes: string[] = [];
  for (const hit of allPhonemeHits) {
    if (!topWeakPhonemes.includes(hit.phoneme)) {
      topWeakPhonemes.push(hit.phoneme);
      if (topWeakPhonemes.length >= 2) break;
    }
  }

  // 按词归因分组：仅展示命中 topWeakPhonemes 的词及其对应音素；漏读词单列「没读出来」
  const phonemeGroups: string[] = [];
  if (topWeakPhonemes.length > 0) {
    const topSet = new Set(topWeakPhonemes);
    const wordGroups: Array<{ word: string; phonemes: string[]; minScore: number }> = [];
    for (const w of scoredIssueWords) {
      const matched = w.wrongPhonemes.filter((wp) => topSet.has(wp.phoneme));
      if (matched.length === 0) continue;
      const uniquePhs: string[] = [];
      let minScore = Infinity;
      for (const m of matched) {
        if (!uniquePhs.includes(m.phoneme)) uniquePhs.push(m.phoneme);
        if (m.score < minScore) minScore = m.score;
      }
      wordGroups.push({ word: w.word, phonemes: uniquePhs, minScore });
    }
    wordGroups.sort((a, b) => a.minScore - b.minScore);
    for (const g of wordGroups.slice(0, 2)) {
      phonemeGroups.push(
        `${g.word} 的 ${g.phonemes.map((p) => `/${p}/`).join("、")}`
      );
    }
  } else if (scoredIssueWords.length > 0) {
    const sortedWords = [...scoredIssueWords].sort(
      (a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0)
    );
    const focusWords = sortedWords.slice(0, 2).map((w) => w.word);
    phonemeGroups.push(`${focusWords.join("、")} 整词需要再练`);
  }

  let omittedPart = "";
  if (omissionWords.length > 0) {
    const omittedNames = omissionWords.slice(0, 3).map((w) => w.word).join("、");
    omittedPart =
      omissionWords.length > 3
        ? `${omittedNames} 等 ${omissionWords.length} 个词没读出来`
        : `${omittedNames} 没读出来`;
  }

  const phonemePart = phonemeGroups.join("；");
  const focusSummary = [phonemePart, omittedPart].filter(Boolean).join("；");
  const cardCount = issueWords.length;

  // 分档生成结论句与定性反馈（同源同向）
  if (effectiveScore !== null && effectiveScore < OVERALL_MID_THRESHOLD) {
    const scoreVerdict =
      cardCount > 0 ? `继续加油 · 先练准 ${cardCount} 个词` : "继续加油 · 再试一遍";
    let conclusionText = "这句有点难，没关系，先听一遍示范再跟着慢慢读";
    if (cardCount > 0) {
      if (phonemePart && omittedPart) {
        conclusionText = `这句有点难，没关系，先把 ${phonemePart} 练准；${omittedPart}`;
      } else if (phonemePart) {
        conclusionText = `这句有点难，没关系，先把 ${phonemePart} 练准`;
      } else if (omittedPart) {
        conclusionText = `这句有点难，没关系，${omittedPart}，跟着示范完整读一遍`;
      }
    }
    return {
      scoreVerdict,
      conclusionText,
      hasValidWordData: hasWordsWithScore,
      topWeakPhonemes,
      emptyPraiseAllowed: false,
    };
  }

  if (effectiveScore !== null && effectiveScore < OVERALL_PASS_THRESHOLD) {
    const scoreVerdict =
      cardCount > 0 ? `读得不错 · 再练 ${cardCount} 个词` : "读得不错 · 继续保持";
    const conclusionText =
      cardCount > 0 && focusSummary
        ? `这次读得不错，重点练练 ${focusSummary}`
        : "这次读得不错，再多读几遍流畅度会更好";
    return {
      scoreVerdict,
      conclusionText,
      hasValidWordData: hasWordsWithScore,
      topWeakPhonemes,
      emptyPraiseAllowed: hasWordsWithScore && cardCount === 0,
    };
  }

  // ≥ 80
  const scoreVerdict =
    cardCount > 0 ? `读得很棒 · 微调 ${cardCount} 个词` : "读得很棒 · 全部达标";
  const conclusionText =
    cardCount > 0 && focusSummary
      ? `读得很棒！把 ${focusSummary} 练稳就更好了`
      : "读得很棒！全句发音纯正地道，继续保持！";

  return {
    scoreVerdict,
    conclusionText,
    hasValidWordData: hasWordsWithScore,
    topWeakPhonemes,
    emptyPraiseAllowed: hasWordsWithScore && cardCount === 0,
  };
};
