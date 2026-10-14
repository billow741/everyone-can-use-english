import { useState, useEffect } from "react";
import { TMM_CURATED_EXERCISES, TmmCuratedExercise } from "@renderer/data/tmm-curated-exercises";

const STORAGE_KEY = "sb_daily_sentence_index";
const CHANGE_EVENT = "sb-daily-sentence-change";

// Determine today's default index by day of the year
export const getDefaultDailyIndex = (): number => {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return dayOfYear % (TMM_CURATED_EXERCISES.length || 1);
};

export const getStoredDailyIndex = (): number => {
  const val = localStorage.getItem(STORAGE_KEY);
  if (val !== null && !isNaN(parseInt(val, 10))) {
    return parseInt(val, 10) % TMM_CURATED_EXERCISES.length;
  }
  return getDefaultDailyIndex();
};

export const setStoredDailyIndex = (index: number): void => {
  const safeIdx = (index + TMM_CURATED_EXERCISES.length) % TMM_CURATED_EXERCISES.length;
  localStorage.setItem(STORAGE_KEY, safeIdx.toString());
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: safeIdx }));
};

export const getDailySentence = (index?: number): TmmCuratedExercise => {
  const idx = typeof index === "number" ? index : getStoredDailyIndex();
  return (
    TMM_CURATED_EXERCISES[idx % TMM_CURATED_EXERCISES.length] || {
      id: "default-daily",
      text: "The sun is shining bright, and our little bridge connects the world.",
      translation: "阳光洒在大地上，我们的小小彩虹桥连通大世界。",
      phonicsFocus: "/ʌ/ 核心短元音 · /aɪ/ 饱满双元音",
      audioUrl: "",
      source: "SunnyBridge 阳光桥金句",
    }
  );
};

export const useDailySentence = () => {
  const [index, setIndex] = useState<number>(getStoredDailyIndex());

  useEffect(() => {
    const handleStorage = () => {
      setIndex(getStoredDailyIndex());
    };
    window.addEventListener(CHANGE_EVENT, handleStorage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const nextSentence = () => {
    const nextIdx = (index + 1) % TMM_CURATED_EXERCISES.length;
    setStoredDailyIndex(nextIdx);
    setIndex(nextIdx);
  };

  const sentence = getDailySentence(index);

  return {
    index,
    sentence,
    nextSentence,
    totalCount: TMM_CURATED_EXERCISES.length,
  };
};
