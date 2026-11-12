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
} from "lucide-react";
import { Button, Badge, Separator } from "@renderer/components/ui";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import {
  loadChapterData,
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
import type { ListeningChapter, ListeningSentence, VocabEntry } from "./types";

// ---- 工具函数 ----

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function chapterKey(ch: ListeningChapter): string {
  return String(ch.chapter).padStart(2, "0");
}

// ---- 波形条组件 ----
function WaveformBar({
  peaks,
  currentTime,
  duration,
  sentences,
  onSeek,
}: {
  peaks: number[];
  currentTime: number;
  duration: number;
  sentences: ListeningSentence[];
  onSeek: (t: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const playedFraction = duration > 0 ? currentTime / duration : 0;
    const barW = Math.max(1, W / peaks.length);

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barW;
      const peak = peaks[i] > 1 ? peaks[i] / 100 : peaks[i];
      const h = Math.max(2, peak * H);
      const played = i / peaks.length < playedFraction;
      ctx.fillStyle = played ? (getComputedStyle(document.documentElement).getPropertyValue("--sun-orange").trim() || CANVAS_WARM_PALETTE.sunOrange) : (getComputedStyle(document.documentElement).getPropertyValue("--sand-border").trim() || CANVAS_WARM_PALETTE.sandBorder);
      ctx.fillRect(x, (H - h) / 2, barW - 0.5, h);
    }

    // 句界刻度
    if (duration > 0) {
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--warm-muted").trim() || CANVAS_WARM_PALETTE.warmMuted;
      ctx.lineWidth = 1;
      for (const sent of sentences) {
        const x = (sent.start / duration) * W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 4);
        ctx.stroke();
      }
    }
  }, [peaks, currentTime, duration, sentences]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || duration <= 0) return;
    const frac = (e.clientX - rect.left) / rect.width;
    onSeek(frac * duration);
  };

  return (
    <div ref={containerRef} className="w-full relative select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={48}
        className="w-full h-12 cursor-pointer rounded"
        onClick={handleClick}
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-0.5 px-0.5">
        <span>{fmt(currentTime)}</span>
        <span>{fmt(duration)}</span>
      </div>
    </div>
  );
}

// ---- 查词卡组件 ----
function WordCard({
  word,
  vocabMap,
  phrasesForSentence,
  book,
  chapter,
  onClose,
}: {
  word: string;
  vocabMap: Map<string, VocabEntry>;
  phrasesForSentence: Array<{ en: string; zh: string }>;
  book: string;
  chapter: string;
  onClose: () => void;
}) {
  const entry = vocabMap.get(word.toLowerCase()) ?? vocabMap.get(word);
  const [faved, setFaved] = useState(() => isWordFaved(book, chapter, word));

  const handleFav = () => {
    const newState = toggleFavWord(book, chapter, word);
    setFaved(newState);
  };

  const matchedPhrases = phrasesForSentence.filter((p) =>
    p.en.toLowerCase().includes(word.toLowerCase())
  );

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-80 max-w-[90vw] bg-white border border-sand-border rounded-[14px] shadow-xl p-4 space-y-3">
      {/* 词头 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{word}</span>
          {entry?.ipa && (
            <span className="text-xs text-muted-foreground font-mono">{entry.ipa}</span>
          )}
          {entry?.pos && (
            <span className="text-xs text-muted-foreground italic">{entry.pos}</span>
          )}
          <button
            onClick={() => playStandardTts(word)}
            className="text-primary hover:text-primary/80 transition-colors"
            title="发音"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleFav} title={faved ? "取消收藏" : "收藏生词"}>
            {faved ? (
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
            ) : (
              <Star className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <button onClick={onClose}>
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
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

      {/* 3. 字典释义 */}
      {entry?.dict ? (
        <div className="text-sm space-y-0.5">
          <p className="text-xs text-muted-foreground font-medium">字典释义</p>
          <p>{entry.dict}</p>
        </div>
      ) : (
        !entry && (
          <p className="text-xs text-muted-foreground italic">
            本章暂无该词的词条，可在字典中查询
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
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedSentIdx, setSelectedSentIdx] = useState<number | null>(null);
  const [showTranslation, setShowTranslation] = useState<number | null>(null); // sentence index
  const [isDone, setIsDone] = useState(false);
  const [, forceUpdate] = useState(0);

  const sentenceRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const chapterDataRef = useRef(chapterData);
  chapterDataRef.current = chapterData;

  const currentSentIdxRef = useRef(currentSentIdx);
  currentSentIdxRef.current = currentSentIdx;

  const loopSingleRef = useRef(loopSingle);
  loopSingleRef.current = loopSingle;

  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;

  const singlePlayEndRef = useRef<number | null>(null);

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
        setIsDone(isChapterFinished(book, chapter));
      }
      setLoading(false);
    });
  }, [book, chapter]);

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

      // 3. 计算当前句并高亮 / 自动滚动
      const idx = findCurrentSentence(cd.sentences, t);
      if (idx !== currentSentIdxRef.current) {
        currentSentIdxRef.current = idx;
        setCurrentSentIdx(idx);
        sentenceRefs.current[idx]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
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
        block: "nearest",
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
        block: "nearest",
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
    (word: string, sentIdx: number) => {
      const clean = word.replace(/[^a-zA-Z'-]/g, "");
      if (!clean) return;
      setSelectedWord(clean);
      setSelectedSentIdx(sentIdx);
    },
    []
  );

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
<div class="meta">${chapterData.book} · 第 ${chapterData.chapter} 章 · ${Math.round(chapterData.duration / 60)} 分钟</div>
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
    return `<span class="vocab-item">${w}${e?.dict ? " — " + e.dict : ""}</span>`;
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
  }, [chapterData, book, chapter, vocabMap]);

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
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
      {/* 隐藏音频元素 */}
      <audio ref={audioRef} preload="metadata" />

      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/listening" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          <span>书架</span>
        </Link>
        <span>/</span>
        <Link
          to={`/listening/${chapterData.book}`}
          className="hover:text-foreground"
        >
          {chapterData.book}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{chapterData.title}</span>
      </div>

      {/* 章节标题 + 操作 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{chapterData.title}</h1>
          {chapterData.title_zh && (
            <p className="text-sm text-muted-foreground">{chapterData.title_zh}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant={isDone ? "default" : "outline"}
            size="sm"
            onClick={handleMarkDone}
            className="gap-1 text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isDone ? "已听完" : "标记听完"}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1 text-xs">
            <Printer className="w-3.5 h-3.5" />
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
              <BookOpen className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* 右：句子列表 */}
        <div className="flex-1 overflow-y-auto max-h-72 md:max-h-96 space-y-1 pr-1">
          {chapterData.sentences.map((sent, idx) => {
            const isActive = idx === currentSentIdx;
            const isPast = idx < currentSentIdx;
            const favSent = isSentenceFaved(book!, chapter!, idx);

            return (
              <div
                key={sent.i}
                ref={(el) => { sentenceRefs.current[idx] = el; }}
                className={`group flex gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
                  isActive
                    ? "bg-warm-paper ring-1 ring-sun-orange border border-sand-border"
                    : isPast
                    ? "text-warm-muted/60 hover:bg-warm-paper/50"
                    : "hover:bg-warm-paper/50"
                }`}
                onClick={() => seekToSentence(idx)}
              >
                {/* 行首 ▶ 只播本句 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playSingleSentence(idx);
                  }}
                  className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary flex-shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWordClick(clean, idx);
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

                  {/* 译文行（A1/A2 有逐句 zh） */}
                  {hasZh && (
                    <div>
                      {showTranslation === idx ? (
                        <p
                          className="text-xs text-muted-foreground cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); setShowTranslation(null); }}
                        >
                          {sent.zh ?? "（本句暂无译文）"}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* 行尾：译 按钮（A1/A2 有 zh 时显示） + 收藏句 */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {hasZh && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTranslation(showTranslation === idx ? null : idx);
                      }}
                      className="text-xs text-muted-foreground hover:text-primary px-1"
                    >
                      译
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavSentence(book!, chapter!, idx);
                      forceUpdate((n) => n + 1);
                    }}
                    title={favSent ? "取消收藏句子" : "收藏句子"}
                  >
                    {favSent ? (
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-400" />
                    ) : (
                      <Heart className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 波形条 */}
      <WaveformBar
        peaks={chapterData.peaks ?? []}
        currentTime={currentTime}
        duration={duration}
        sentences={chapterData.sentences}
        onSeek={handleSeek}
      />

      {/* 播放控制栏 */}
      <div className="flex items-center justify-center gap-3 py-2">
        {/* 倍速 */}
        <button
          onClick={changeRate}
          className="text-xs font-mono text-muted-foreground hover:text-foreground w-10 text-center border rounded px-1 py-0.5"
        >
          {playbackRate}×
        </button>

        {/* 上一句 */}
        <Button variant="ghost" size="icon" onClick={prevSentence}>
          <SkipBack className="w-5 h-5" />
        </Button>

        {/* 播放/暂停 */}
        <Button
          variant="default"
          size="icon"
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-sun-orange hover:bg-sun-orange-hover text-white shadow-none border-none"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </Button>

        {/* 下一句 */}
        <Button variant="ghost" size="icon" onClick={nextSentence}>
          <SkipForward className="w-5 h-5" />
        </Button>

        {/* 单句循环 */}
        <button
          onClick={() => setLoopSingle((v) => !v)}
          className={`p-2 rounded transition-colors ${
            loopSingle
              ? "text-sun-orange bg-warm-paper border border-sand-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="单句循环"
        >
          <Repeat1 className="w-5 h-5" />
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
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  );
}
