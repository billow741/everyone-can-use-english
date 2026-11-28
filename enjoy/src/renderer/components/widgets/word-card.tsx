import React, { useEffect, useMemo, useRef, useState } from "react";
import { Star, Volume2, X } from "lucide-react";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { isWordFaved, toggleFavWord } from "@renderer/lib/listening-sync";
import {
  fetchWordDictionary,
  getCachedWordDictionary,
  resolvePhonetic,
  type WordDictionaryResult,
} from "@renderer/lib/ldoce-dictionary";
import { normalizeVocabDict, type VocabEntry } from "@renderer/pages/listening/types";

export interface WordAnchorRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface WordCardProps {
  word: string;
  vocabMap: Map<string, VocabEntry>;
  phrasesForSentence?: Array<{ en: string; zh: string }>;
  book: string;
  chapter: string;
  onClose: () => void;
  onFavChange?: (word: string, faved: boolean) => void;
  sentenceEn?: string;
  anchorRect?: WordAnchorRect | null;
  bottomSafeMobile?: number;
}

/**
 * 复用听故事播放页同款三层查词卡（精读词条 / LDOCE 词典异步兜底 / 收藏进生词本）。
 */
export const WordCard: React.FC<WordCardProps> = ({
  word,
  vocabMap,
  phrasesForSentence = [],
  book,
  chapter,
  onClose,
  onFavChange,
  sentenceEn,
  anchorRect,
  bottomSafeMobile = 88,
}) => {
  const cleanWord = word.trim();
  const entry = vocabMap.get(cleanWord.toLowerCase()) ?? vocabMap.get(cleanWord);
  const senses = normalizeVocabDict(entry);
  const hasDict = senses.length > 0;
  const [faved, setFaved] = useState(() => isWordFaved(book, chapter, cleanWord));
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [dictResult, setDictResult] = useState<WordDictionaryResult | null>(() => {
    if (hasDict) return null;
    return getCachedWordDictionary(cleanWord);
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (hasDict) return false;
    return !getCachedWordDictionary(cleanWord);
  });

  useEffect(() => {
    setFaved(isWordFaved(book, chapter, cleanWord));
  }, [book, chapter, cleanWord]);

  useEffect(() => {
    if (hasDict) {
      setLoading(false);
      setDictResult(null);
      return;
    }
    const cached = getCachedWordDictionary(cleanWord);
    if (cached) {
      setDictResult(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    setDictResult(null);
    let active = true;
    fetchWordDictionary(cleanWord, sentenceEn)
      .then((res) => {
        if (active) {
          setDictResult(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setDictResult(null);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [cleanWord, sentenceEn, hasDict]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (cardRef.current?.contains(target)) return;
      if (target.closest("[data-word-token='true']")) return;
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onClose]);

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = toggleFavWord(book, chapter, cleanWord);
    setFaved(newState);
    onFavChange?.(cleanWord, newState);
  };

  const matchedPhrases = phrasesForSentence.filter((p) =>
    p.en.toLowerCase().includes(cleanWord.toLowerCase())
  );

  const firstTranslation = (dictResult?.translation || "").split(/；|\n/)[0]?.trim() || "";
  const displayIpa = entry?.ipa || (dictResult ? resolvePhonetic(dictResult) : "");
  const displayPos =
    dictResult?.pos &&
    dictResult.pos !== "word" &&
    !firstTranslation.startsWith(dictResult.pos)
      ? dictResult.pos
      : "";

  const hasDefinition = !!firstTranslation;
  const hasPhonetic = !!displayIpa;

  const cardStyle = useMemo<React.CSSProperties>(() => {
    if (!anchorRect || typeof window === "undefined") {
      return { bottom: bottomSafeMobile, left: "50%", transform: "translateX(-50%)" };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = Math.min(336, vw - 24);
    const left = Math.max(12, Math.min(anchorRect.left, vw - cardW - 12));
    const bottomSafe = vw < 1280 ? bottomSafeMobile : 24;
    const spaceBelow = vh - anchorRect.bottom - bottomSafe;
    if (spaceBelow >= 230 || anchorRect.top - 12 < 230) {
      const top = Math.min(anchorRect.bottom + 8, Math.max(68, vh - bottomSafe - 230));
      return { top, left };
    }
    const bottomOffset = Math.max(bottomSafe, vh - anchorRect.top + 8);
    return { bottom: Math.min(bottomOffset, vh - 80), left };
  }, [anchorRect, bottomSafeMobile]);

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      data-testid="world-word-card"
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 w-80 max-w-[90vw] max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain bg-white border border-[#D3E4DE] rounded-2xl shadow-2xl p-4 space-y-3"
    >
      {/* 词头栏：单词 + 音标 + 发音 + 收藏 + 关闭 */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#E7F2EF]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-lg text-[#123B3C]">{cleanWord}</span>
          {displayIpa && (
            <span className="text-xs text-[#4E6B69] font-mono bg-[#E7F2EF] px-1.5 py-0.5 rounded">
              {displayIpa}
            </span>
          )}
          {displayPos && (
            <span className="text-xs text-[#4E6B69] italic">{displayPos}</span>
          )}
          <button
            type="button"
            onClick={() =>
              playStandardTts(cleanWord, {
                voice: "en-GB-SoniaNeural",
                rate: "-5%",
              })
            }
            className="p-1 rounded-full text-[#0F7B7A] hover:bg-[#E7F2EF] transition-colors cursor-pointer"
            title="听发音"
            aria-label="听发音"
          >
            <Volume2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleFav}
            className="p-1 rounded-full hover:bg-[#E7F2EF] transition-colors cursor-pointer"
            title={faved ? "取消收藏生词" : "收藏生词"}
            aria-label={faved ? "取消收藏生词" : "收藏生词"}
          >
            {faved ? (
              <Star className="w-4 h-4 text-[#F2A93B] fill-[#F2A93B]" aria-hidden="true" />
            ) : (
              <Star className="w-4 h-4 text-[#4E6B69] hover:text-[#123B3C]" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[#4E6B69] hover:text-[#123B3C] hover:bg-[#E7F2EF] transition-colors cursor-pointer"
            title="关闭"
            aria-label="关闭"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 1. 句中含义 */}
      {entry?.ctx && (
        <div className="text-sm space-y-0.5">
          <p className="text-xs text-[#4E6B69] font-bold tracking-wide">句中含义</p>
          <p className="text-[#123B3C] leading-relaxed">{entry.ctx}</p>
        </div>
      )}

      {/* 2. 短语搭配 */}
      {matchedPhrases.length > 0 && (
        <div className="text-sm space-y-1">
          <p className="text-xs text-[#4E6B69] font-bold tracking-wide">短语搭配</p>
          {matchedPhrases.map((p, i) => (
            <div key={i} className="bg-[#E7F2EF] rounded-lg px-2.5 py-1 text-xs text-[#123B3C]">
              <span className="font-bold">{p.en}</span>
              <span className="text-[#4E6B69] ml-2">{p.zh}</span>
            </div>
          ))}
        </div>
      )}

      {/* 3. 字典释义 / 查询中加载态 / 兜底提示 */}
      {senses.length > 0 ? (
        <div className="text-sm space-y-1">
          <p className="text-xs text-[#4E6B69] font-bold tracking-wide">字典释义</p>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {senses.map((sense, idx) => (
              <div
                key={idx}
                className={`space-y-0.5 text-xs ${
                  idx > 0 ? "pt-2 border-t border-[#E7F2EF]" : ""
                }`}
              >
                {(sense.pos || sense.def_cn) && (
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    {sense.pos && (
                      <span className="text-xs italic text-[#4E6B69] font-medium shrink-0">
                        {sense.pos}
                      </span>
                    )}
                    {sense.def_cn && (
                      <span className="text-sm text-[#123B3C] font-normal">
                        {sense.def_cn}
                      </span>
                    )}
                  </div>
                )}
                {sense.def_en && (
                  <p className="text-xs text-[#4E6B69] leading-relaxed">{sense.def_en}</p>
                )}
                {(sense.example_en || sense.example_cn) && (
                  <div className="text-[11px] text-[#4E6B69] leading-relaxed pl-2 border-l-2 border-[#D3E4DE]">
                    {sense.example_en && <p>{sense.example_en}</p>}
                    {sense.example_cn && <p>{sense.example_cn}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : loading ? (
        <p className="text-xs text-[#4E6B69] italic">查询中…</p>
      ) : hasDefinition ? (
        <div className="text-sm space-y-0.5">
          <p className="text-xs text-[#4E6B69] font-bold tracking-wide">字典释义</p>
          <p className="text-[#123B3C] leading-relaxed">{firstTranslation}</p>
        </div>
      ) : (
        !hasPhonetic && (
          <p className="text-xs text-[#4E6B69] italic">
            暂无该词释义，可收藏至生词本复习。
          </p>
        )
      )}
    </div>
  );
};
