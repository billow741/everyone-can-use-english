import { useIsDesktop } from "@renderer/hooks";
import { DesktopPlayer } from "@renderer/components";
import { CANVAS_WARM_PALETTE } from "@renderer/lib/canvas-palette";
// /listening/:book/:chapter — 跟读播放器页
// 实现工单二第 2 节所有功能：左图右文、波形条、逐句高亮、点词查词卡、收藏生词、学习文稿打印
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat1,
  Star,
  StarOff,
  BookOpen,
  Volume2,
  ChevronDown,
  ChevronUp,
  Printer,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Heart,
  HeartOff,
  X,
  Languages,
} from "lucide-react";
import { Button, Badge, Separator } from "@renderer/components/ui";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { animateHighlightFollow, ChapterCelebration } from "@renderer/lib/motion";
import { saveRecentListening } from "@renderer/lib/desktop-data";
import {
  fetchWordDictionary,
  getCachedWordDictionary,
  resolvePhonetic,
  type WordDictionaryResult,
} from "@renderer/lib/ldoce-dictionary";
import {
  loadChapterData,
  loadCatalog,
  markChapterFinished,
  isChapterFinished,
  toggleFavSentence,
  isSentenceFaved,
  toggleFavWord,
  isWordFaved,
  fetchListeningProgressFromCloud,
  getFavSentencesLocal,
  getFavWordsLocal,
} from "@renderer/lib/listening-sync";
import {
  normalizeVocabDict,
  type ListeningChapter,
  type ListeningSentence,
  type VocabEntry,
} from "./types";

// ---- 工具函数 ----

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function chapterKey(ch: ListeningChapter): string {
  return String(ch.chapter).padStart(2, "0");
}

const DEFAULT_BOOK_TITLES: Record<string, string> = {
  treasury_beatrixpotter_0910: "彼得兔合集",
  velveteenduet_librivox: "绒布小兔",
  world: "环球漫游",
};

const STORAGE_KEY_SHOW_ZH = "sunnybridge_player_show_zh_v1";

interface WordAnchorRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// ---- 查词卡组件（含 LDOCE 字典异步兜底） ----
function WordCard({
  word,
  vocabMap,
  phrasesForSentence,
  book,
  chapter,
  onClose,
  sentenceEn,
  anchorRect,
}: {
  word: string;
  vocabMap: Map<string, VocabEntry>;
  phrasesForSentence: Array<{ en: string; zh: string }>;
  book: string;
  chapter: string;
  onClose: () => void;
  sentenceEn?: string;
  anchorRect?: WordAnchorRect | null;
}) {
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

  const handleFav = () => {
    const newState = toggleFavWord(book, chapter, cleanWord);
    setFaved(newState);
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

  const cardStyle = React.useMemo<React.CSSProperties>(() => {
    if (!anchorRect || typeof window === "undefined") {
      return { bottom: 184, left: "50%", transform: "translateX(-50%)" };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = Math.min(320, vw - 24);
    const left = Math.max(12, Math.min(anchorRect.left, vw - cardW - 12));
    const bottomSafe = vw < 1280 ? 184 : 24;
    if (anchorRect.top - 12 >= 240) {
      const bottomOffset = Math.max(bottomSafe, vh - anchorRect.top + 8);
      return { bottom: Math.min(bottomOffset, vh - 80), left };
    }
    const top = Math.min(anchorRect.bottom + 8, Math.max(68, vh - bottomSafe - 240));
    return { top, left };
  }, [anchorRect]);

  return (
    <div
      style={cardStyle}
      className="fixed z-50 w-80 max-w-[90vw] max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain bg-white border border-sand-border rounded-[14px] shadow-xl p-4 space-y-3"
    >
      {/* 词头 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-lg">{cleanWord}</span>
          {displayIpa && (
            <span className="text-xs text-muted-foreground font-mono">{displayIpa}</span>
          )}
          {displayPos && (
            <span className="text-xs text-muted-foreground italic">{displayPos}</span>
          )}
          <button
            type="button"
            onClick={() => playStandardTts(cleanWord)}
            className="text-primary hover:text-primary/80 transition-colors"
            title="播放范读"
            aria-label="播放范读"
          >
            <Volume2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleFav}
            title={faved ? "取消收藏生词" : "收藏生词"}
            aria-label={faved ? "取消收藏生词" : "收藏生词"}
          >
            {faved ? (
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" aria-hidden="true" />
            ) : (
              <Star className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="关闭"
            aria-label="关闭"
          >
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 1. 句中含义 */}
      {entry?.ctx && (
        <div className="text-sm space-y-0.5">
          <p className="text-xs text-muted-foreground font-medium">句中含义</p>
          <p>{entry.ctx}</p>
        </div>
      )}

      {/* 2. 短语搭配 */}
      {matchedPhrases.length > 0 && (
        <div className="text-sm space-y-1">
          <p className="text-xs text-muted-foreground font-medium">短语搭配</p>
          {matchedPhrases.map((p, i) => (
            <div key={i} className="bg-muted rounded px-2 py-1">
              <span className="font-medium">{p.en}</span>
              <span className="text-muted-foreground ml-2 text-xs">{p.zh}</span>
            </div>
          ))}
        </div>
      )}
      {entry?.phrase && matchedPhrases.length === 0 && (
        <div className="text-sm space-y-1">
          <p className="text-xs text-muted-foreground font-medium">短语搭配</p>
          <div className="bg-muted rounded px-2 py-1 text-xs">{entry.phrase}</div>
        </div>
      )}

      {/* 3. 字典释义 / 查询中加载态 / 兜底提示 */}
      {senses.length > 0 ? (
        <div className="text-sm space-y-1">
          <p className="text-xs text-muted-foreground font-medium">字典释义</p>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {senses.map((sense, idx) => (
              <div
                key={idx}
                className={`space-y-0.5 text-xs ${
                  idx > 0 ? "pt-2 border-t border-border/40" : ""
                }`}
              >
                {(sense.pos || sense.def_cn) && (
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    {sense.pos && (
                      <span className="text-xs italic text-muted-foreground font-medium shrink-0">
                        {sense.pos}
                      </span>
                    )}
                    {sense.def_cn && (
                      <span className="text-sm text-foreground font-normal">
                        {sense.def_cn}
                      </span>
                    )}
                  </div>
                )}
                {sense.def_en && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {sense.def_en}
                  </p>
                )}
                {(sense.example_en || sense.example_cn) && (
                  <div className="text-[11px] text-muted-foreground leading-relaxed pl-2 border-l-2 border-muted">
                    {sense.example_en && <p>{sense.example_en}</p>}
                    {sense.example_cn && <p>{sense.example_cn}</p>}
                  </div>
                )}
                {sense.audio_href && (
                  <p className="text-[10px] text-muted-foreground/70 truncate font-mono">
                    {sense.audio_href}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : loading ? (
        <p className="text-xs text-muted-foreground italic">查询中…</p>
      ) : hasDefinition ? (
        <div className="text-sm space-y-0.5">
          <p className="text-xs text-muted-foreground font-medium">字典释义</p>
          <p className="text-foreground leading-relaxed">{firstTranslation}</p>
        </div>
      ) : (
        !hasPhonetic && (
          <p className="text-xs text-muted-foreground italic">
            本章暂无该词的精读词条，可收藏至生词本继续跟读学习
          </p>
        )
      )}
    </div>
  );
}

// ---- 主播放器 ----
export default function ListeningPlayer() {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    return <DesktopPlayer />;
  }

  const { book, chapter } = useParams<{ book: string; chapter: string }>();
  const navigate = useNavigate();

  const [chapterData, setChapterData] = useState<ListeningChapter | null>(null);
  const [catalogBooks, setCatalogBooks] = useState<Record<string, string>>(DEFAULT_BOOK_TITLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 播放状态
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopSingle, setLoopSingle] = useState(false);
  const [currentSentIdx, setCurrentSentIdx] = useState(0);

  // UI 状态
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedSentIdx, setSelectedSentIdx] = useState<number | null>(null);
  const [wordAnchorRect, setWordAnchorRect] = useState<WordAnchorRect | null>(null);
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

  const [isDone, setIsDone] = useState(false);
  const [, forceUpdate] = useState(0);

  // 高亮底衬 ref 与完成庆祝状态
  const highlightBackdropRef = useRef<HTMLDivElement | null>(null);
  const isFirstHighlightRef = useRef(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const celebratedChaptersRef = useRef<Set<string>>(new Set());

  const sentenceRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const triggerWordRef = useRef<HTMLElement | null>(null);

  const chapterDataRef = useRef(chapterData);
  chapterDataRef.current = chapterData;

  const currentSentIdxRef = useRef(currentSentIdx);
  currentSentIdxRef.current = currentSentIdx;

  const loopSingleRef = useRef(loopSingle);
  loopSingleRef.current = loopSingle;

  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;

  const singlePlayEndRef = useRef<number | null>(null);

  // 章节切换时重置初次高亮快照
  useEffect(() => {
    isFirstHighlightRef.current = true;
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
    setChapterData(null);
    setError(null);
    fetchListeningProgressFromCloud().catch(() => {});
    loadChapterData(book, chapter).then((data) => {
      if (!data) {
        setError("无法加载章节数据，请检查网络或稍后重试。");
      } else {
        setChapterData(data);
        const done = isChapterFinished(book, chapter);
        setIsDone(done);
        if (done) {
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
    const targetEl = sentenceRefs.current[currentSentIdx];
    if (!targetEl) return;

    if (isFirstHighlightRef.current) {
      isFirstHighlightRef.current = false;
      animateHighlightFollow(highlightBackdropRef.current, targetEl, { duration: 0, popLine: false });
    } else {
      animateHighlightFollow(highlightBackdropRef.current, targetEl);
    }
  }, [currentSentIdx, chapterData]);

  function findCurrentSentence(sentences: ListeningSentence[], t: number): number {
    for (let i = sentences.length - 1; i >= 0; i--) {
      if (t >= sentences[i].start) return i;
    }
    return 0;
  }

  // 音频事件监听（随 audio 挂载注册，与 currentSentIdx/loopSingle 解耦，避免闭包旧值与连带重载）
  useEffect(() => {
    if (loading || !chapterData) return;
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const t = audio.currentTime;
      setCurrentTime(t);

      const cd = chapterDataRef.current;
      if (!cd) return;

      // 1. 单句模式检测：到句尾停播
      if (singlePlayEndRef.current !== null) {
        if (t >= singlePlayEndRef.current - 0.1 || audio.ended) {
          audio.pause();
          singlePlayEndRef.current = null;
          setIsPlaying(false);
          return;
        }
      }

      // 2. 单句循环检测：到句尾回跳本句开头
      if (loopSingleRef.current) {
        const sent = cd.sentences[currentSentIdxRef.current];
        if (sent && t >= sent.end - 0.1) {
          audio.currentTime = sent.start;
          setCurrentTime(sent.start);
          return;
        }
      }

      // 3. 计算当前句并高亮 / 自动滚动居中
      const idx = findCurrentSentence(cd.sentences, t);
      if (idx !== currentSentIdxRef.current) {
        currentSentIdxRef.current = idx;
        setCurrentSentIdx(idx);
        sentenceRefs.current[idx]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      // 保存本地最近收听进度
      if (book && chapter) {
        saveRecentListening({
          book,
          chapter,
          title: cd.title,
          level: cd.level,
          sentenceCount: cd.sentences.length,
          duration: cd.duration || audio.duration || 1,
          currentTime: t,
        });
      }
    };

    const onDuration = () => {
      setDuration(audio.duration || 0);
      if (playbackRateRef.current) {
        audio.playbackRate = playbackRateRef.current;
      }
    };

    const onEnded = () => {
      if (loopSingleRef.current) {
        const cd = chapterDataRef.current;
        if (cd) {
          const sent = cd.sentences[currentSentIdxRef.current];
          if (sent) {
            audio.currentTime = sent.start;
            audio.play().catch(() => {});
            return;
          }
        }
      }
      setIsPlaying(false);
      if (book && chapter) {
        markChapterFinished(book, chapter, true);
        setIsDone(true);
        const key = `${book}/${chapter}`;
        if (!celebratedChaptersRef.current.has(key)) {
          celebratedChaptersRef.current.add(key);
          setShowCelebration(true);
        }
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    if (audio.readyState >= 1 && audio.duration) {
      onDuration();
    }

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [book, chapter, loading, chapterData]);

  // 音频加载（随 book/chapter/loading/chapterData 变化且元素挂载后执行，与 currentSentIdx、loopSingle 解耦）
  useEffect(() => {
    if (loading || !chapterData || !book || !chapter) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = `/listening-data/v2/${book}/${chapter}.mp3`;
    audio.load();
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentSentIdx(0);
    currentSentIdxRef.current = 0;
    singlePlayEndRef.current = null;
  }, [book, chapter, loading, chapterData]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    singlePlayEndRef.current = null;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const seekToSentence = useCallback(
    (idx: number) => {
      const audio = audioRef.current;
      const cd = chapterDataRef.current;
      if (!audio || !cd) return;
      const sent = cd.sentences[idx];
      if (!sent) return;
      singlePlayEndRef.current = null;
      currentSentIdxRef.current = idx;
      setCurrentSentIdx(idx);
      audio.currentTime = sent.start;
      setCurrentTime(sent.start);
      sentenceRefs.current[idx]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      if (audio.paused) {
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    },
    []
  );

  const playSingleSentence = useCallback(
    (idx: number) => {
      const audio = audioRef.current;
      const cd = chapterDataRef.current;
      if (!audio || !cd) return;
      const sent = cd.sentences[idx];
      if (!sent) return;
      singlePlayEndRef.current = sent.end;
      currentSentIdxRef.current = idx;
      setCurrentSentIdx(idx);
      audio.currentTime = sent.start;
      setCurrentTime(sent.start);
      sentenceRefs.current[idx]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    },
    []
  );

  const prevSentence = useCallback(() => {
    const idx = Math.max(0, currentSentIdxRef.current - 1);
    seekToSentence(idx);
  }, [seekToSentence]);

  const nextSentence = useCallback(() => {
    const cd = chapterDataRef.current;
    if (!cd) return;
    const idx = Math.min(cd.sentences.length - 1, currentSentIdxRef.current + 1);
    seekToSentence(idx);
  }, [seekToSentence]);

  const handleSeek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    singlePlayEndRef.current = null;
    audio.currentTime = t;
    setCurrentTime(t);
    const cd = chapterDataRef.current;
    if (cd) {
      const idx = findCurrentSentence(cd.sentences, t);
      currentSentIdxRef.current = idx;
      setCurrentSentIdx(idx);
    }
  }, []);

  const changeRate = useCallback(() => {
    const rates = [0.75, 1, 1.25];
    const idx = rates.indexOf(playbackRateRef.current);
    const next = rates[(idx + 1) % rates.length];
    setPlaybackRate(next);
    playbackRateRef.current = next;
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, []);

  const handleMarkDone = useCallback(() => {
    if (!book || !chapter) return;
    const newState = !isDone;
    markChapterFinished(book, chapter, newState);
    setIsDone(newState);
    forceUpdate((n) => n + 1);
    if (newState) {
      const key = `${book}/${chapter}`;
      if (!celebratedChaptersRef.current.has(key)) {
        celebratedChaptersRef.current.add(key);
        setShowCelebration(true);
      }
    }
  }, [book, chapter, isDone]);

  // 构建 vocabMap
  const vocabMap = React.useMemo(() => {
    const m = new Map<string, VocabEntry>();
    if (!chapterData) return m;
    for (const v of chapterData.vocab ?? []) {
      m.set(v.w.toLowerCase(), v);
      for (const f of v.forms ?? []) m.set(f.toLowerCase(), v);
    }
    return m;
  }, [chapterData]);

  // 点词处理
  const handleWordClick = useCallback(
    (word: string, sentIdx: number, triggerEl?: HTMLElement | null) => {
      const clean = word.replace(/[^a-zA-Z'-]/g, "");
      if (!clean) return;
      if (triggerEl) {
        triggerWordRef.current = triggerEl;
        const rect = triggerEl.getBoundingClientRect();
        setWordAnchorRect({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
      } else {
        setWordAnchorRect(null);
      }
      setSelectedWord(clean);
      setSelectedSentIdx(sentIdx);
    },
    []
  );

  const handleCloseWordCard = useCallback(() => {
    setSelectedWord(null);
    setSelectedSentIdx(null);
    setWordAnchorRect(null);
    setTimeout(() => {
      triggerWordRef.current?.focus();
    }, 0);
  }, []);

  const bookTitle = (book && catalogBooks[book]) || (chapterData?.book && catalogBooks[chapterData.book]) || chapterData?.book || book || "";

  // 打印文稿
  const handlePrint = useCallback(() => {
    if (!chapterData || !book || !chapter) return;
    const favSentencesMap = getFavSentencesLocal();
    const favSentSet = new Set<number>(favSentencesMap[book]?.[chapter] ?? []);

    const favWordsMap = getFavWordsLocal();
    const favWordSet = new Set<string>(favWordsMap[book]?.[chapter] ?? []);

    const hasZh = chapterData.sentences.some((s) => s.zh);
    const html = `<!DOCTYPE html><html><head><title>${chapterData.title} · 学习文稿</title>
<style>
  body{font-family:serif;max-width:700px;margin:auto;padding:2rem;line-height:1.8;color:var(--foreground, ${CANVAS_WARM_PALETTE.ink})}
  h1{font-size:1.4rem;margin-bottom:0.5rem}
  .meta{color:#666;font-size:0.85rem;margin-bottom:1.5rem}
  .summary{background:var(--warm-paper, ${CANVAS_WARM_PALETTE.warmPaper});border-left:3px solid var(--sun-orange, CANVAS_WARM_PALETTE.sunOrange);padding:0.75rem 1rem;margin-bottom:1.5rem;font-size:0.9rem}
  .sent{margin-bottom:0.75rem}
  .sent.faved{background:var(--parchment-light, ${CANVAS_WARM_PALETTE.parchmentLight});border-left:2px solid var(--amber-gold, ${CANVAS_WARM_PALETTE.amberGold});padding-left:0.5rem}
  .en{font-size:1rem}
  .zh{color:#666;font-size:0.88rem}
  .fav-section{margin-top:2rem;border-top:1px solid #ddd;padding-top:1rem}
  .vocab-item{display:inline-block;margin:0.25rem;background:var(--sand-border, ${CANVAS_WARM_PALETTE.sandBorder});border-radius:4px;padding:0.1rem 0.5rem;font-size:0.85rem}
  @media print{body{max-width:100%}}
</style></head><body>
<h1>${chapterData.title}</h1>
<div class="meta">${bookTitle} · 第 ${chapterData.chapter} 章 · ${Math.round(chapterData.duration / 60)} 分钟</div>
${chapterData.summary_zh || chapterData.zh_full ? `<div class="summary">${chapterData.summary_zh ?? chapterData.zh_full}</div>` : ""}
<div class="sentences">
${chapterData.sentences
  .map(
    (s, i) =>
      `<div class="sent${favSentSet.has(i) ? " faved" : ""}">
  <div class="en">${s.text}</div>
  ${hasZh && s.zh ? `<div class="zh">${s.zh}</div>` : ""}
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

  // ---- 渲染 ----

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-muted-foreground text-sm">加载章节中…</span>
      </div>
    );
  }

  if (error || !chapterData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-destructive">
        <AlertCircle className="w-7 h-7" />
        <p className="text-sm">{error ?? "未知错误"}</p>
        <button className="text-sm text-primary underline" onClick={() => navigate(-1)}>
          返回
        </button>
      </div>
    );
  }

  const hasZh = chapterData.sentences.some((s) => s.zh);
  const hasOverview = !!(chapterData.summary_zh || chapterData.zh_full);
  const isWorld = chapterData.book === "world";
  const coverUrl = isWorld
    ? chapterData.image_url
    : undefined; // 有原画书另外处理（Echo 资产备料后填路径）

  const currentSent = chapterData.sentences[currentSentIdx];
  const sentPhrasesRaw = currentSent
    ? chapterData.phrases?.[String(currentSent.i)] ?? []
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 pb-24 min-[1280px]:pb-4 space-y-4">
      {/* 隐藏音频元素 */}
      <audio ref={audioRef} preload="metadata" />

      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Link to="/listening" className="hover:text-foreground flex items-center gap-1 shrink-0">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>书架</span>
        </Link>
        <span>/</span>
        <Link
          to={`/listening/${chapterData.book}`}
          className="hover:text-foreground shrink-0"
        >
          {bookTitle}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{chapterData.title}</span>
      </div>

      {/* 章节标题 + 操作 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{chapterData.title}</h1>
          {chapterData.title_zh && (
            <p className="text-sm text-muted-foreground">{chapterData.title_zh}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {hasZh && (
            <button
              type="button"
              className={`h-8 px-2.5 border rounded-full text-xs font-semibold flex items-center gap-1 transition-all whitespace-nowrap shrink-0 ${
                showZh
                  ? "border-[#0F7B7A] bg-white text-[#0F7B7A] hover:bg-[#E7F2EF]"
                  : "border-[#D3E4DE] bg-white text-[#4E6B69] hover:bg-[#F3FAF8]"
              }`}
              onClick={handleToggleShowZh}
              title={showZh ? "隐藏中文翻译" : "显示中文翻译"}
              aria-pressed={showZh}
            >
              <Languages className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>中文翻译</span>
            </button>
          )}
          <Button
            variant={isDone ? "default" : "outline"}
            size="sm"
            onClick={handleMarkDone}
            className="gap-1 text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            {isDone ? "已听完" : "标记听完"}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1 text-xs">
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            文稿
          </Button>
        </div>
      </div>

      {/* B1/world 梗概卡（无逐句 zh 时在页顶展示） */}
      {hasOverview && !hasZh && (
        <div className="bg-muted/60 border rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {isWorld ? "导览" : "章节梗概"}
          </p>
          <p className="text-sm leading-relaxed">
            {chapterData.summary_zh ?? chapterData.zh_full}
          </p>
        </div>
      )}

      {/* 主体：左图右文 */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* 左：封面图 */}
        <div className="md:w-48 flex-shrink-0">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={chapterData.title}
              className="w-full md:w-48 h-36 md:h-64 object-cover rounded-xl shadow"
            />
          ) : (
            <div className="w-full md:w-48 h-36 md:h-64 bg-muted rounded-xl flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/30" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* 右：句子列表 */}
        <div className="flex-1 overflow-y-auto overscroll-contain max-h-72 md:max-h-96 space-y-1 pr-1 relative">
          {/* 高亮滑动底衬 (Motion Prompt #057 / #060) */}
          <div
            ref={highlightBackdropRef}
            className="sb-line-indicator pointer-events-none absolute left-0 right-1 z-0 rounded-lg bg-warm-paper ring-1 ring-sun-orange border border-sand-border"
            aria-hidden="true"
            style={{
              top: 0,
              height: 0,
              opacity: 0,
            }}
          />
          {chapterData.sentences.map((sent, idx) => {
            const isActive = idx === currentSentIdx;
            const isPast = idx < currentSentIdx;
            const favSent = isSentenceFaved(book!, chapter!, idx);

            return (
              <div
                key={sent.i}
                ref={(el) => { sentenceRefs.current[idx] = el; }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    seekToSentence(idx);
                  }
                }}
                className={`group flex gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors relative z-10 ${
                  isActive
                    ? "now text-ink !bg-transparent !ring-0 !border-transparent"
                    : isPast
                    ? "text-warm-muted/60 hover:bg-warm-paper/50"
                    : "hover:bg-warm-paper/50"
                }`}
                onClick={() => seekToSentence(idx)}
              >
                {/* 行首 ▶ 只播本句 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSingleSentence(idx);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  className={`mt-0.5 text-primary flex-shrink-0 transition-opacity ${
                    isActive ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  }`}
                  title="播放本句"
                  aria-label="播放本句"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                <div className="flex-1 space-y-0.5">
                  {/* 英文句（可点词） */}
                  <p className={`text-base leading-relaxed font-serif ${isActive ? "text-ink font-semibold" : "text-ink/90"}`}>
                    {sent.text.split(/(\s+)/).map((token, ti) => {
                      const clean = token.replace(/[^a-zA-Z'-]/g, "");
                      if (!clean) return <span key={ti}>{token}</span>;
                      const inVocab = vocabMap.has(clean.toLowerCase());
                      return (
                        <span
                          key={ti}
                          role="button"
                          tabIndex={isActive ? 0 : -1}
                          aria-label={`查词：${clean}`}
                          title={inVocab ? "查看生词释义卡" : "查词"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWordClick(clean, idx, e.currentTarget);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              handleWordClick(clean, idx, e.currentTarget);
                            }
                          }}
                          className={`cursor-pointer hover:underline hover:decoration-dotted ${
                            inVocab ? "text-primary font-semibold" : ""
                          }`}
                        >
                          {token}
                        </span>
                      );
                    })}
                  </p>

                  {/* 译文行（A1/A2 有逐句 zh，受顶栏全局开关控制） */}
                  {showZh && sent.zh && (
                    <p className="text-xs text-muted-foreground">
                      {sent.zh}
                    </p>
                  )}
                </div>

                {/* 行尾：收藏句 */}
                <div className={`flex items-center gap-1 transition-opacity flex-shrink-0 ${
                  isActive ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                }`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavSentence(book!, chapter!, idx);
                      forceUpdate((n) => n + 1);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                    }}
                    title={favSent ? "取消收藏句子" : "收藏句子"}
                    aria-label={favSent ? "取消收藏句子" : "收藏句子"}
                  >
                    {favSent ? (
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-400" aria-hidden="true" />
                    ) : (
                      <Heart className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 细线进度轨道（与桌面播放器对齐） */}
      {(() => {
        const effectiveDuration = duration > 0 ? duration : chapterData.duration || 0;
        const playedFraction = effectiveDuration > 0 ? currentTime / effectiveDuration : 0;
        return (
          <div>
            <div
              className="sb-progress-track relative py-3 cursor-pointer select-none group"
              onClick={(e) => {
                if (effectiveDuration <= 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                handleSeek(frac * effectiveDuration);
              }}
              title="点击跳转播放进度"
              role="slider"
              aria-label="播放进度"
              aria-valuemin={0}
              aria-valuemax={Math.round(effectiveDuration)}
              aria-valuenow={Math.round(currentTime || 0)}
              aria-valuetext={`${fmt(currentTime)} / ${fmt(effectiveDuration)}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (effectiveDuration <= 0) return;
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  handleSeek(Math.max(0, currentTime - 5));
                } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  handleSeek(Math.min(effectiveDuration, currentTime + 5));
                } else if (e.key === "Home") {
                  e.preventDefault();
                  handleSeek(0);
                } else if (e.key === "End") {
                  e.preventDefault();
                  handleSeek(effectiveDuration);
                }
              }}
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
            <div className="flex justify-between text-xs text-muted-foreground mt-0.5 px-0.5 tabular-nums">
              <span>{fmt(currentTime)}</span>
              <span>{fmt(effectiveDuration)}</span>
            </div>
          </div>
        );
      })()}

      {/* 播放控制栏 */}
      <div className="flex items-center justify-center gap-3 py-2">
        {/* 倍速 */}
        <button
          type="button"
          onClick={changeRate}
          className="text-xs font-mono text-muted-foreground hover:text-foreground w-10 text-center border rounded px-1 py-0.5"
          title="播放速度"
          aria-label="播放速度"
        >
          {playbackRate}×
        </button>

        {/* 上一句 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSentence}
          title="上一句"
          aria-label="上一句"
        >
          <SkipBack className="w-5 h-5" aria-hidden="true" />
        </Button>

        {/* 播放/暂停 */}
        <Button
          variant="default"
          size="icon"
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-sun-orange hover:bg-sun-orange-hover text-white shadow-none border-none"
          title={isPlaying ? "暂停" : "播放"}
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" aria-hidden="true" />
          ) : (
            <Play className="w-6 h-6" aria-hidden="true" />
          )}
        </Button>

        {/* 下一句 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={nextSentence}
          title="下一句"
          aria-label="下一句"
        >
          <SkipForward className="w-5 h-5" aria-hidden="true" />
        </Button>

        {/* 单句循环 */}
        <button
          type="button"
          onClick={() => setLoopSingle((v) => !v)}
          className={`p-2 rounded transition-colors ${
            loopSingle
              ? "text-sun-orange bg-warm-paper border border-sand-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="单句循环"
          aria-label="单句循环"
          aria-pressed={loopSingle}
        >
          <Repeat1 className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* 查词卡 */}
      {selectedWord && (
        <WordCard
          word={selectedWord}
          vocabMap={vocabMap}
          phrasesForSentence={
            selectedSentIdx !== null && chapterData.phrases
              ? chapterData.phrases[
                  String(chapterData.sentences[selectedSentIdx]?.i)
                ] ?? []
              : []
          }
          book={book!}
          chapter={chapter!}
          sentenceEn={
            selectedSentIdx !== null && chapterData.sentences[selectedSentIdx]?.text
              ? chapterData.sentences[selectedSentIdx].text
              : undefined
          }
          anchorRect={wordAnchorRect}
          onClose={handleCloseWordCard}
        />
      )}
      {/* 完成庆祝动效层 */}
      {showCelebration && (
        <ChapterCelebration onComplete={() => setShowCelebration(false)} />
      )}
    </div>
  );
}
