import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  Check,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Star,
  Printer,
  Volume2,
  X,
  Languages,
} from "lucide-react";
import { DesktopSidebar } from "./desktop-sidebar";
import { DesktopFooter } from "./desktop-footer";
import {
  loadChapterData,
  loadCatalog,
  markChapterFinished,
  isChapterFinished,
  toggleFavWord,
  isWordFaved,
  toggleFavSentence,
  isSentenceFaved,
  getFavWordsLocal,
  getFavSentencesLocal,
} from "@renderer/lib/listening-sync";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { saveRecentListening } from "@renderer/lib/desktop-data";
import {
  fetchWordDictionary,
  getCachedWordDictionary,
  resolvePhonetic,
  type WordDictionaryResult,
} from "@renderer/lib/ldoce-dictionary";
import { animateHighlightFollow, ChapterCelebration } from "@renderer/lib/motion";
import {
  normalizeVocabDict,
  type ListeningChapter,
  type ListeningSentence,
  type VocabEntry,
} from "@renderer/pages/listening/types";

function fmt(sec: number): string {
  if (!sec || isNaN(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const DEFAULT_BOOK_TITLES: Record<string, string> = {
  treasury_beatrixpotter_0910: "彼得兔合集",
  velveteenduet_librivox: "绒布小兔",
  world: "环球漫游",
};

const STORAGE_KEY_SHOW_ZH = "sunnybridge_player_show_zh_v1";

// ---- G-PLAY-01 & G-PLAY-02: 点词查词三层卡组件（含字典异步兜底） ----
interface WordCardProps {
  word: string;
  vocabMap: Map<string, VocabEntry>;
  phrasesForSentence: Array<{ en: string; zh: string }>;
  book: string;
  chapter: string;
  onClose: () => void;
  onFavChange?: () => void;
  sentenceEn?: string;
}

const WordCard: React.FC<WordCardProps> = ({
  word,
  vocabMap,
  phrasesForSentence,
  book,
  chapter,
  onClose,
  onFavChange,
  sentenceEn,
}) => {
  const cleanWord = word.trim();
  const entry = vocabMap.get(cleanWord.toLowerCase()) ?? vocabMap.get(cleanWord);
  const senses = normalizeVocabDict(entry);
  const hasDict = senses.length > 0;
  const [faved, setFaved] = useState(() => isWordFaved(book, chapter, cleanWord));

  // 查词卡字典兜底状态（仅在无精读词条或 dict 为空时触发）
  const [dictResult, setDictResult] = useState<WordDictionaryResult | null>(() => {
    if (hasDict) return null;
    return getCachedWordDictionary(cleanWord);
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (hasDict) return false;
    return !getCachedWordDictionary(cleanWord);
  });

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

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = toggleFavWord(book, chapter, cleanWord);
    setFaved(newState);
    onFavChange?.();
  };

  const matchedPhrases = phrasesForSentence.filter((p) =>
    p.en.toLowerCase().includes(cleanWord.toLowerCase())
  );

  // 首条字典释义（按 ； 或换行切分第一条）
  const firstTranslation = (dictResult?.translation || "").split(/；|\n/)[0]?.trim() || "";

  // 音标显示：有精读词条用 entry.ipa；无词条用兜底音标回落规则（us -> uk -> phonetic）
  const displayIpa = entry?.ipa || (dictResult ? resolvePhonetic(dictResult) : "");

  // 词性显示：兜底 pos 仅在非默认 "word" 且未在首释义前缀重复时显示
  const displayPos =
    dictResult?.pos &&
    dictResult.pos !== "word" &&
    !firstTranslation.startsWith(dictResult.pos)
      ? dictResult.pos
      : "";

  const hasDefinition = !!firstTranslation;
  const hasPhonetic = !!displayIpa;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-88 max-w-[92vw] bg-white border border-[#D3E4DE] rounded-2xl shadow-2xl p-4 space-y-3"
      onClick={(e) => e.stopPropagation()}
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
            onClick={() => playStandardTts(cleanWord)}
            className="p-1 rounded-full text-[#0F7B7A] hover:bg-[#E7F2EF] transition-colors"
            title="播放范读"
            aria-label="播放范读"
          >
            <Volume2 className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleFav}
            className="p-1 rounded-full hover:bg-[#E7F2EF] transition-colors"
            title={faved ? "取消收藏生词" : "收藏生词"}
            aria-label={faved ? "取消收藏生词" : "收藏生词"}
          >
            {faved ? (
              <Star className="size-4.5 text-amber-500 fill-amber-400" aria-hidden="true" />
            ) : (
              <Star className="size-4.5 text-[#4E6B69] hover:text-[#123B3C]" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[#4E6B69] hover:text-[#123B3C] hover:bg-[#E7F2EF] transition-colors"
            title="关闭"
            aria-label="关闭"
          >
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 第 1 层：句中含义（仅精读词条拥有，兜底不编造） */}
      {entry?.ctx && (
        <div className="text-sm space-y-0.5">
          <p className="text-xs text-[#4E6B69] font-bold tracking-wide">句中含义</p>
          <p className="text-[#123B3C] leading-relaxed">{entry.ctx}</p>
        </div>
      )}

      {/* 第 2 层：短语搭配 */}
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
      {entry?.phrase && matchedPhrases.length === 0 && (
        <div className="text-sm space-y-1">
          <p className="text-xs text-[#4E6B69] font-bold tracking-wide">短语搭配</p>
          <div className="bg-[#E7F2EF] rounded-lg px-2.5 py-1 text-xs text-[#123B3C] font-medium">
            {entry.phrase}
          </div>
        </div>
      )}

      {/* 第 3 层：字典释义 / 查询中加载态 / 兜底提示 */}
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
                  <p className="text-xs text-[#4E6B69] leading-relaxed">
                    {sense.def_en}
                  </p>
                )}
                {(sense.example_en || sense.example_cn) && (
                  <div className="text-[11px] text-[#4E6B69] leading-relaxed pl-2 border-l-2 border-[#D3E4DE]">
                    {sense.example_en && <p>{sense.example_en}</p>}
                    {sense.example_cn && <p>{sense.example_cn}</p>}
                  </div>
                )}
                {sense.audio_href && (
                  <p className="text-[10px] text-[#4E6B69]/70 truncate font-mono">
                    {sense.audio_href}
                  </p>
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
            本章暂无该词的精读词条，可收藏至生词本继续跟读学习
          </p>
        )
      )}
    </div>
  );
};

export const DesktopPlayer: React.FC = () => {
  const { book = "treasury_beatrixpotter_0910", chapter = "01" } = useParams<{
    book: string;
    chapter: string;
  }>();
  const navigate = useNavigate();

  const [chapterData, setChapterData] = useState<ListeningChapter | null>(null);
  const [catalogBooks, setCatalogBooks] = useState<Record<string, string>>(DEFAULT_BOOK_TITLES);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSentIdx, setCurrentSentIdx] = useState(0);
  const [playMode, setPlayMode] = useState<"continuous" | "single">("continuous");
  const [isFinished, setIsFinished] = useState(false);

  // 中文翻译显隐状态（存 localStorage，缺省 true）
  const [showZh, setShowZh] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_ZH);
      if (saved === null) return true;
      return saved !== "false";
    } catch {
      return true;
    }
  });

  const handleToggleShowZh = useCallback(() => {
    setShowZh((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SHOW_ZH, String(next));
      } catch (err) {
        console.warn("Failed to save show_zh to localStorage", err);
      }
      return next;
    });
  }, []);

  // 词卡与收藏状态
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedSentIdx, setSelectedSentIdx] = useState<number | null>(null);
  const [, setFavUpdateVer] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const highlightBackdropRef = useRef<HTMLDivElement | null>(null);
  const isFirstHighlightRef = useRef(true);
  const triggerWordRef = useRef<HTMLElement | null>(null);

  // 完成庆祝动效状态与会话内章节守卫 (以 book+chapter 为键)
  const [showCelebration, setShowCelebration] = useState(false);
  const celebratedChaptersRef = useRef<Set<string>>(new Set());

  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;
  const currentSentIdxRef = useRef(currentSentIdx);
  currentSentIdxRef.current = currentSentIdx;
  const chapterDataRef = useRef(chapterData);
  chapterDataRef.current = chapterData;

  // seek 加固：单句循环与跳句验真 ref
  const pendingSeekRef = useRef<{ target: number; tries: number } | null>(null);
  const pendingJumpRef = useRef<{ target: number; prevIdx: number; tries: number } | null>(null);
  const jumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 章节切换时重置初次高亮快照
  useEffect(() => {
    isFirstHighlightRef.current = true;
  }, [book, chapter]);

  // 完成庆祝触发守卫：只在变为已听完那一刻播一次，同一章节会话内不重播
  const triggerCelebrationIfEligible = useCallback(() => {
    if (!book || !chapter) return;
    const key = `${book}/${chapter}`;
    if (!celebratedChaptersRef.current.has(key)) {
      celebratedChaptersRef.current.add(key);
      setShowCelebration(true);
    }
  }, [book, chapter]);

  // 加载绘本书单（用于面包屑精准书名映射）
  useEffect(() => {
    loadCatalog().then((cat) => {
      if (cat?.books) {
        const bookMap: Record<string, string> = { ...DEFAULT_BOOK_TITLES };
        for (const b of cat.books) {
          bookMap[b.book] = b.title_zh || b.title_en || b.book;
        }
        setCatalogBooks(bookMap);
      }
    });
  }, []);

  // 加载章节数据
  useEffect(() => {
    if (!book || !chapter) return;
    setLoading(true);
    setSelectedWord(null);
    setSelectedSentIdx(null);
    loadChapterData(book, chapter).then((data) => {
      if (data) {
        setChapterData(data);
        setDuration(data.duration || 0);
        const finished = isChapterFinished(book, chapter);
        setIsFinished(finished);
        if (finished) {
          // 页面加载时已是已听完，记入已庆祝，不播庆祝
          celebratedChaptersRef.current.add(`${book}/${chapter}`);
        }
      }
      setLoading(false);
    });
  }, [book, chapter]);

  // 高亮底衬跟随滑动 (复用 Motion Prompt #057 / #060 模式，约 0.24s power2.out)
  useLayoutEffect(() => {
    if (!highlightBackdropRef.current || !chapterData?.sentences?.length) return;
    const targetEl = lineRefs.current[currentSentIdx];
    if (!targetEl) return;

    if (isFirstHighlightRef.current) {
      isFirstHighlightRef.current = false;
      animateHighlightFollow(highlightBackdropRef.current, targetEl, { duration: 0, popLine: false });
    } else {
      animateHighlightFollow(highlightBackdropRef.current, targetEl);
    }
  }, [currentSentIdx, chapterData]);

  const sentences = useMemo<ListeningSentence[]>(() => {
    return chapterData?.sentences || [];
  }, [chapterData]);

  // 词表 Map 索引
  const vocabMap = useMemo(() => {
    const m = new Map<string, VocabEntry>();
    if (!chapterData?.vocab) return m;
    for (const v of chapterData.vocab) {
      if (v.w) m.set(v.w.toLowerCase(), v);
      for (const f of v.forms ?? []) {
        if (f) m.set(f.toLowerCase(), v);
      }
    }
    return m;
  }, [chapterData]);

  // 是否有逐句中文译文
  const hasZh = useMemo(() => {
    return sentences.some((s) => !!s.zh);
  }, [sentences]);

  // 梗概文本
  const overviewText = chapterData?.summary_zh || chapterData?.zh_full;
  const showOverview = !hasZh && !!overviewText;
  const isWorld = book === "world" || chapterData?.book === "world";
  const bookTitle = catalogBooks[book] || chapterData?.book || book;

  // 音频事件监听
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      pendingSeekRef.current = null;
    };
    const onLoadedMetadata = () => {
      if (audio.duration && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      const t = audio.currentTime;
      setCurrentTime(t);

      const chData = chapterDataRef.current;
      const sents = chData?.sentences || [];
      const curIdx = currentSentIdxRef.current;
      const isSingleLoop = playModeRef.current === "single";

      // 跳句 seek 验真与回滚（未生效重试一次，仍失败恢复原高亮，避免高亮撒谎）
      if (pendingJumpRef.current) {
        const pj = pendingJumpRef.current;
        const diff = Math.abs(t - pj.target);
        if (diff <= 1.5) {
          pendingJumpRef.current = null;
          if (jumpTimeoutRef.current) {
            clearTimeout(jumpTimeoutRef.current);
            jumpTimeoutRef.current = null;
          }
        } else if (!audio.paused) {
          if (pj.tries < 2) {
            pj.tries += 1;
            audio.currentTime = pj.target;
            return;
          } else {
            const fallbackIdx = pj.prevIdx;
            pendingJumpRef.current = null;
            if (jumpTimeoutRef.current) {
              clearTimeout(jumpTimeoutRef.current);
              jumpTimeoutRef.current = null;
            }
            setCurrentSentIdx(fallbackIdx);
            return;
          }
        } else {
          return;
        }
      }

      // 单句循环 seek 验真与重试（重试最多 3 次，失败暂停保高亮，不让跟随循环改回第 1 句）
      if (pendingSeekRef.current) {
        const pending = pendingSeekRef.current;
        const diff = Math.abs(t - pending.target);
        if (diff <= 1.5) {
          pendingSeekRef.current = null;
        } else if (!audio.paused) {
          if (pending.tries < 3) {
            pending.tries += 1;
            audio.currentTime = pending.target;
            return;
          } else {
            pendingSeekRef.current = null;
            audio.pause();
            setIsPlaying(false);
            return;
          }
        } else {
          return;
        }
      }

      // 单句循环控制
      if (isSingleLoop && sents[curIdx]) {
        const curSent = sents[curIdx];
        if (t >= curSent.end) {
          audio.currentTime = curSent.start;
          setCurrentTime(curSent.start);
          pendingSeekRef.current = {
            target: curSent.start,
            tries: 1,
          };
        }
        // 单句循环模式下锁定当前句，不让跟随循环把高亮改回第 1 句
        if (chData) {
          saveRecentListening({
            book,
            chapter,
            title: chData.title,
            level: chData.level,
            sentenceCount: sents.length,
            duration: chData.duration || audio.duration || 1,
            currentTime: t,
          });
        }
        return;
      }

      // 跟随寻找当前句子
      let foundIdx = -1;
      for (let i = 0; i < sents.length; i++) {
        if (t >= sents[i].start && t <= sents[i].end) {
          foundIdx = i;
          break;
        }
      }
      if (foundIdx >= 0 && foundIdx !== curIdx) {
        setCurrentSentIdx(foundIdx);
        // 平滑滚动文稿
        lineRefs.current[foundIdx]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      // 保存本地最近收听进度（保存真实章节级别）
      if (chData) {
        saveRecentListening({
          book,
          chapter,
          title: chData.title,
          level: chData.level,
          sentenceCount: sents.length,
          duration: chData.duration || audio.duration || 1,
          currentTime: t,
        });
      }
    };

    // D-07: 保留播完自动标记听完 (onEnded 不删)
    const onEnded = () => {
      setIsPlaying(false);
      markChapterFinished(book, chapter, true);
      setIsFinished(true);
      triggerCelebrationIfEligible();
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      if (jumpTimeoutRef.current) {
        clearTimeout(jumpTimeoutRef.current);
        jumpTimeoutRef.current = null;
      }
    };
  }, [book, chapter]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  const jumpToSentence = (idx: number) => {
    const audio = audioRef.current;
    if (!audio || !sentences[idx]) return;
    const sent = sentences[idx];
    const prevIdx = currentSentIdxRef.current;

    pendingSeekRef.current = null;
    if (jumpTimeoutRef.current) {
      clearTimeout(jumpTimeoutRef.current);
      jumpTimeoutRef.current = null;
    }

    pendingJumpRef.current = {
      target: sent.start,
      prevIdx,
      tries: 1,
    };

    audio.currentTime = sent.start;
    setCurrentTime(sent.start);
    setCurrentSentIdx(idx);
    audio.play().catch(() => {});

    // 定时兜底：若 300ms 内 timeupdate 偏离 > 1.5 重试一次；仍失败则恢复原高亮
    jumpTimeoutRef.current = setTimeout(() => {
      if (pendingJumpRef.current && pendingJumpRef.current.tries === 1) {
        const diff = Math.abs(audio.currentTime - sent.start);
        if (diff > 1.5) {
          pendingJumpRef.current.tries = 2;
          audio.currentTime = sent.start;
          jumpTimeoutRef.current = setTimeout(() => {
            if (pendingJumpRef.current && pendingJumpRef.current.tries >= 2) {
              const diff2 = Math.abs(audio.currentTime - sent.start);
              if (diff2 > 1.5) {
                const fallback = pendingJumpRef.current.prevIdx;
                pendingJumpRef.current = null;
                setCurrentSentIdx(fallback);
              } else {
                pendingJumpRef.current = null;
              }
            }
          }, 300);
        } else {
          pendingJumpRef.current = null;
        }
      }
    }, 300);
  };

  const handlePrevSentence = () => {
    if (currentSentIdx > 0) {
      jumpToSentence(currentSentIdx - 1);
    }
  };

  const handleNextSentence = () => {
    if (currentSentIdx < sentences.length - 1) {
      jumpToSentence(currentSentIdx + 1);
    }
  };

  const seekTo = (targetTime: number) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    const clamped = Math.max(0, Math.min(duration, targetTime));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
    for (let i = 0; i < sentences.length; i++) {
      if (clamped >= sentences[i].start && clamped <= sentences[i].end) {
        if (i !== currentSentIdx) {
          setCurrentSentIdx(i);
          lineRefs.current[i]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
        break;
      }
    }
  };

  const seekRelative = (delta: number) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    seekTo((audio.currentTime || currentTime) + delta);
  };

  const handleProgressKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      seekRelative(-5);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      seekRelative(5);
    } else if (e.key === "Home") {
      e.preventDefault();
      seekTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      seekTo(duration);
    }
  };

  const handleSeekWave = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(frac * duration);
  };

  // D-08: 标记听完状态切换
  const handleToggleCheckin = () => {
    const next = !isFinished;
    markChapterFinished(book, chapter, next);
    setIsFinished(next);
    if (next) {
      triggerCelebrationIfEligible();
    }
  };

  // G-PLAY-01: 点词查词点击处理
  const handleWordClick = useCallback((word: string, sentIdx: number, triggerEl?: HTMLElement | null) => {
    const clean = word.replace(/[^a-zA-Z'-]/g, "");
    if (!clean) return;
    if (triggerEl) {
      triggerWordRef.current = triggerEl;
    }
    setSelectedWord(clean);
    setSelectedSentIdx(sentIdx);
  }, []);

  const handleCloseWordCard = useCallback(() => {
    setSelectedWord(null);
    setSelectedSentIdx(null);
    setTimeout(() => {
      triggerWordRef.current?.focus();
    }, 0);
  }, []);

  // G-PLAY-02: 句尾收藏切换
  const handleToggleFavSentence = (idx: number) => {
    toggleFavSentence(book, chapter, idx);
    setFavUpdateVer((v) => v + 1);
  };

  // G-PLAY-03: 打印学习文稿
  const handlePrint = useCallback(() => {
    if (!chapterData || !book || !chapter) return;
    const favSentencesMap = getFavSentencesLocal();
    const favSentSet = new Set<number>(favSentencesMap[book]?.[chapter] ?? []);

    const favWordsMap = getFavWordsLocal();
    const favWordSet = new Set<string>(favWordsMap[book]?.[chapter] ?? []);

    const hasZhLocal = chapterData.sentences.some((s) => !!s.zh);
    const overview = chapterData.summary_zh || chapterData.zh_full;

    const html = `<!DOCTYPE html><html><head><title>${chapterData.title} · 学习文稿</title>
<style>
  body{font-family:serif;max-width:700px;margin:auto;padding:2rem;line-height:1.8;color:#123B3C}
  h1{font-size:1.4rem;margin-bottom:0.5rem}
  .meta{color:#4E6B69;font-size:0.85rem;margin-bottom:1.5rem}
  .summary{background:#E7F2EF;border-left:3px solid #0F7B7A;padding:0.75rem 1rem;margin-bottom:1.5rem;font-size:0.9rem}
  .sent{margin-bottom:0.75rem}
  .sent.faved{background:#E7F2EF;border-left:2px solid #0F7B7A;padding-left:0.5rem}
  .en{font-size:1rem}
  .zh{color:#4E6B69;font-size:0.88rem}
  .fav-section{margin-top:2rem;border-top:1px solid #D3E4DE;padding-top:1rem}
  .vocab-item{display:inline-block;margin:0.25rem;background:#D3E4DE;color:#123B3C;border-radius:4px;padding:0.1rem 0.5rem;font-size:0.85rem}
  @media print{body{max-width:100%}}
</style></head><body>
<h1>${chapterData.title}</h1>
<div class="meta">${bookTitle} · 第 ${chapterData.chapter} 章 · ${Math.round((chapterData.duration || 0) / 60)} 分钟</div>
${overview ? `<div class="summary"><strong>章节梗概：</strong>${overview}</div>` : ""}
<div class="sentences">
${chapterData.sentences
  .map(
    (s, i) =>
      `<div class="sent${favSentSet.has(i) ? " faved" : ""}">
  <div class="en">${s.text}</div>
  ${hasZhLocal && s.zh ? `<div class="zh">${s.zh}</div>` : ""}
</div>`
  )
  .join("")}
</div>
${
  favWordSet.size > 0
    ? `<div class="fav-section"><h3>收藏词汇</h3><div>
${[...favWordSet]
  .map((w) => {
    const e = vocabMap.get(w.toLowerCase());
    const senses = normalizeVocabDict(e);
    const first = senses[0];
    const desc = first?.def_cn
      ? " — " + first.def_cn
      : first?.def_en
      ? " — " + first.def_en
      : "";
    return `<span class="vocab-item">${w}${desc}</span>`;
  })
  .join("")}
</div></div>`
    : ""
}
${
  favSentSet.size > 0
    ? `<div class="fav-section"><h3>收藏句子</h3>
${chapterData.sentences
  .filter((_, i) => favSentSet.has(i))
  .map(
    (s) => `<div class="sent faved"><div class="en">${s.text}</div>${s.zh ? `<div class="zh">${s.zh}</div>` : ""}</div>`
  )
  .join("")}
</div>`
    : ""
}
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  }, [chapterData, book, chapter, bookTitle, vocabMap]);

  // 封面与级别
  const coverUrl =
    book === "velveteenduet_librivox"
      ? "/assets/covers/velveteen-cover.jpg"
      : "/assets/covers/treasury-cover.jpg";

  const level = (chapterData?.level || "a1").toLowerCase();

  const playedFraction = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="desktop-shell">
      <DesktopSidebar activeTab="listening" />

      {/* 真实音频元素 */}
      <audio
        ref={audioRef}
        src={
          (chapterData as any)?.audio_url?.startsWith("http")
            ? (chapterData as any).audio_url
            : `/listening-data/v2/${book}/${chapter}.mp3`
        }
        preload="auto"
      />

      <main className="sb-main">
        {/* 顶栏：G-PLAY-05 面包屑 + 返回书架标签 + G-PLAY-03 打印 + D-07 播完即记 + D-08 标记听完 */}
        <div className="sb-topbar flex flex-wrap items-center justify-between gap-3">
          <div className="left flex items-center gap-3 min-w-0 flex-1">
            <button
              className="sb-back !w-auto !rounded-full !px-3 !gap-1.5 flex items-center text-xs font-bold text-ink shrink-0"
              onClick={() => navigate("/listening")}
              title="返回听故事书架"
            >
              <ChevronLeft className="size-4 text-ink stroke-[2.5]" aria-hidden="true" />
              <span>书架</span>
            </button>

            {/* 三级面包屑导航 */}
            <nav className="flex items-center gap-1.5 text-xs md:text-sm text-[#4E6B69] min-w-0" aria-label="面包屑导航">
              <Link to="/listening" className="hover:text-ink transition-colors font-medium shrink-0">
                书架
              </Link>
              <span className="text-[#D3E4DE] shrink-0">/</span>
              <Link
                to={`/listening/${book}`}
                className="hover:text-ink transition-colors font-semibold underline-offset-4 hover:underline shrink-0"
                title={`返回 ${bookTitle} 章节列表`}
              >
                {bookTitle}
              </Link>
              <span className="text-[#D3E4DE] shrink-0">/</span>
              <span className="text-ink font-bold truncate max-w-[160px] md:max-w-[280px] lg:max-w-[420px]" title={chapterData?.title}>
                {chapterData?.title || `第 ${chapter} 章`}
              </span>
            </nav>
          </div>

          <div className="right flex items-center gap-3 shrink-0">
            {/* 中文翻译显隐开关（仅在有逐句中文译文时渲染，白底圆角 pill 形态，开态品牌青高亮，关态置灰） */}
            {hasZh && (
              <button
                type="button"
                className={`h-10 md:h-11 px-3.5 md:px-4 border rounded-full text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm whitespace-nowrap shrink-0 active:scale-95 ${
                  showZh
                    ? "border-[#0F7B7A] bg-white text-[#0F7B7A] hover:bg-[#E7F2EF]"
                    : "border-[#D3E4DE] bg-white text-[#4E6B69] hover:bg-[#F3FAF8]"
                }`}
                onClick={handleToggleShowZh}
                title={showZh ? "隐藏中文翻译" : "显示中文翻译"}
                aria-pressed={showZh}
              >
                <Languages className="size-4 shrink-0" aria-hidden="true" />
                <span>中文翻译</span>
              </button>
            )}

            {/* G-PLAY-03: 打印学习文稿 */}
            <button
              className="h-10 md:h-11 px-3.5 md:px-4 border border-[#D3E4DE] bg-white rounded-full text-xs md:text-sm font-semibold text-[#123B3C] flex items-center gap-1.5 hover:bg-[#F3FAF8] active:scale-95 transition-all shadow-sm"
              onClick={handlePrint}
              title="打印文稿"
            >
              <Printer className="size-4 text-[#4E6B69]" aria-hidden="true" />
              <span>打印文稿</span>
            </button>

            {/* D-08: 统一文案「标记听完 / 已听完」 */}
            <button
              className={`sb-btn-checkin ${isFinished ? "done" : ""}`}
              onClick={handleToggleCheckin}
              title={isFinished ? "已听完（点击取消）" : "点击标记听完"}
            >
              {isFinished && <Check className="size-4 stroke-[3]" aria-hidden="true" />}
              <span>{isFinished ? "已听完" : "标记听完"}</span>
            </button>
          </div>
        </div>

        {/* G-PLAY-04: B1/world 梗概卡（无逐句 zh 时在页顶展示；有 zh 的不显示） */}
        {showOverview && (
          <div className="sb-card sb-overview-card mb-5 p-4 md:p-5 bg-white border border-[#D3E4DE] rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-[#0F7B7A] tracking-wide uppercase px-2.5 py-0.5 bg-[#E7F2EF] rounded-md">
                {isWorld ? "导览" : "章节梗概"}
              </span>
              <span className="text-xs text-[#4E6B69]">
                （本章无逐句中文译文，请结合梗概导览理解文意）
              </span>
            </div>
            <p className="text-sm md:text-base leading-relaxed text-[#123B3C]">
              {overviewText}
            </p>
          </div>
        )}

        {/* 主区左右分栏 */}
        {loading ? (
          <div className="py-20 text-center text-sm text-warm-muted">
            正在加载故事音频与文稿…
          </div>
        ) : !chapterData ? (
          <div className="sb-card p-12 text-center text-warm-muted">
            未能找到章节数据，请返回重试。
          </div>
        ) : (
          <div className="sb-content flex flex-col lg:flex-row gap-6 items-start">
            {/* 左栏 400px：封面与播放控制器 */}
            <div className="sb-col-left w-full lg:w-[400px] shrink-0">
              <div className="sb-stack">
                {/* 封面卡 */}
                <div className="sb-card sb-cover-card">
                  <div
                    className="cover"
                    style={{ backgroundImage: `url(${coverUrl})` }}
                  />
                  <div className="mt-4">
                    <span className="sb-level-pill">
                      <span className={`sb-dot sb-dot-${level}`} />
                      LEVEL {level.toUpperCase()}
                    </span>
                  </div>
                  <h2>{chapterData.title}</h2>
                </div>

                {/* 播放器卡 */}
                <div className="sb-card sb-player">
                  {/* 细线进度轨道 */}
                  <div
                    className="sb-progress-track relative py-3 cursor-pointer select-none group"
                    onClick={handleSeekWave}
                    title="点击跳转播放进度"
                    role="slider"
                    aria-label="播放进度"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duration || 0)}
                    aria-valuenow={Math.round(currentTime || 0)}
                    aria-valuetext={`${fmt(currentTime)} / ${fmt(duration)}`}
                    tabIndex={0}
                    onKeyDown={handleProgressKeyDown}
                  >
                    <div className="relative h-[5px] w-full rounded-full bg-[#D3E4DE]">
                      <div
                        className="h-full rounded-full bg-[#0F7B7A] transition-[width] duration-200 ease-linear motion-reduce:transition-none"
                        style={{ width: `${Math.min(100, Math.max(0, playedFraction * 100))}%` }}
                      />
                      <div
                        className="sb-progress-thumb absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2.5 rounded-full bg-[#0F7B7A] pointer-events-none shadow-sm transition-[left] duration-200 ease-linear motion-reduce:transition-none"
                        style={{ left: `${Math.min(100, Math.max(0, playedFraction * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* 时间 */}
                  <div className="sb-times">
                    <span>{fmt(currentTime)}</span>
                    <span>{fmt(duration)}</span>
                  </div>

                  {/* 播放控制按钮 */}
                  <div className="sb-controls">
                    <button
                      className={`sb-ctl toggle ${playMode === "continuous" ? "on" : ""}`}
                      onClick={() => setPlayMode("continuous")}
                      title="连播模式"
                      aria-pressed={playMode === "continuous"}
                    >
                      <Repeat className="size-4" aria-hidden="true" />
                      <span>连播</span>
                    </button>

                    <button
                      className={`sb-ctl toggle ${playMode === "single" ? "on" : ""}`}
                      onClick={() => setPlayMode("single")}
                      title="单句循环模式"
                      aria-pressed={playMode === "single"}
                    >
                      <Repeat1 className="size-4" aria-hidden="true" />
                      <span>单句循环</span>
                    </button>

                    <button
                      className="sb-ctl"
                      onClick={handlePrevSentence}
                      disabled={currentSentIdx <= 0}
                      title="上一句"
                      aria-label="上一句"
                    >
                      <SkipBack className="size-5 fill-ink text-ink" aria-hidden="true" />
                    </button>

                    <button
                      className="sb-ctl play"
                      onClick={togglePlay}
                      title={isPlaying ? "暂停" : "播放"}
                      aria-label={isPlaying ? "暂停" : "播放"}
                    >
                      {isPlaying ? (
                        <Pause className="size-6 fill-white text-white" aria-hidden="true" />
                      ) : (
                        <Play className="size-6 fill-white text-white ml-0.5" aria-hidden="true" />
                      )}
                    </button>

                    <button
                      className="sb-ctl"
                      onClick={handleNextSentence}
                      disabled={currentSentIdx >= sentences.length - 1}
                      title="下一句"
                      aria-label="下一句"
                    >
                      <SkipForward className="size-5 fill-ink text-ink" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 右栏：文稿与逐句高亮 + 点词查词 + 行尾收藏 */}
            <div className="sb-col-mid flex-1 min-w-0 w-full">
              <div className="sb-card sb-transcript">
                <div className="sb-transcript-lines relative">
                  {/* 高亮底衬 (Motion Prompt #057 / #060) */}
                  <div
                    ref={highlightBackdropRef}
                    className="sb-line-indicator pointer-events-none absolute left-0 right-0 z-0 bg-[#E7F2EF] border-l-[3px] border-[#0F7B7A]"
                    aria-hidden="true"
                    style={{
                      top: 0,
                      height: 0,
                      opacity: 0,
                    }}
                  />
                  {sentences.map((sent, i) => {
                    const isNow = currentSentIdx === i;
                    const isSentFaved = isSentenceFaved(book, chapter, i);
                    return (
                      <div
                        key={i}
                        ref={(el) => {
                          lineRefs.current[i] = el;
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            jumpToSentence(i);
                          }
                        }}
                        className={`sb-line group flex items-start gap-3 relative z-[1] ${
                          isNow ? "now !bg-transparent !shadow-none" : ""
                        }`}
                        onClick={() => jumpToSentence(i)}
                      >
                        <div className="body flex-1 min-w-0">
                          {/* 英文句：单词恢复可点，生词高亮 */}
                          <div className="en">
                            {sent.text.split(/(\s+)/).map((token, ti) => {
                              const clean = token.replace(/[^a-zA-Z\x27-]/g, "");
                              if (!clean) return <span key={ti}>{token}</span>;
                              const inVocab = vocabMap.has(clean.toLowerCase());
                              return (
                                <span
                                  key={ti}
                                  role="button"
                                  tabIndex={isNow ? 0 : -1}
                                  aria-label={`查词：${clean}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleWordClick(clean, i, e.currentTarget);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleWordClick(clean, i, e.currentTarget);
                                    }
                                  }}
                                  className={`cursor-pointer hover:underline hover:decoration-dotted transition-colors ${
                                    inVocab ? "text-[#0F7B7A] font-bold" : ""
                                  }`}
                                  title={inVocab ? "查看生词释义卡" : "查词"}
                                >
                                  {token}
                                </span>
                              );
                            })}
                          </div>
                          {showZh && sent.zh && <div className="zh">{sent.zh}</div>}
                        </div>

                        {/* G-PLAY-02: 句尾收藏星 */}
                        <div className="flex items-center self-start pt-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavSentence(i);
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                            }}
                            title={isSentFaved ? "取消收藏句子" : "收藏句子"}
                            aria-label={isSentFaved ? "取消收藏句子" : "收藏句子"}
                            className={`p-1.5 rounded-full hover:bg-[#E7F2EF] transition-all ${
                              isSentFaved
                                ? "opacity-100"
                                : "opacity-60 md:opacity-0 md:group-hover:opacity-100"
                            }`}
                          >
                            <Star
                              className={`size-4 ${
                                isSentFaved
                                  ? "text-amber-500 fill-amber-400"
                                  : "text-[#4E6B69]"
                              }`}
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* G-PLAY-01 & G-PLAY-02: 点词弹出三层查词卡 + 遮罩 */}
        {selectedWord && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
              onClick={handleCloseWordCard}
            />
            <WordCard
              word={selectedWord}
              vocabMap={vocabMap}
              phrasesForSentence={
                selectedSentIdx !== null && chapterData?.phrases
                  ? chapterData.phrases[String(chapterData.sentences[selectedSentIdx]?.i)] ?? []
                  : []
              }
              book={book}
              chapter={chapter}
              sentenceEn={
                selectedSentIdx !== null && chapterData?.sentences[selectedSentIdx]?.text
                  ? chapterData.sentences[selectedSentIdx].text
                  : undefined
              }
              onClose={handleCloseWordCard}
              onFavChange={() => setFavUpdateVer((v) => v + 1)}
            />
          </>
        )}

        {/* 完成庆祝动效层 */}
        {showCelebration && (
          <ChapterCelebration onComplete={() => setShowCelebration(false)} />
        )}

        {/* 页脚 */}
        <DesktopFooter />
      </main>
    </div>
  );
};
