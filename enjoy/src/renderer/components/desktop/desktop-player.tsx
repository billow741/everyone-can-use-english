import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import type { ListeningChapter, ListeningSentence, VocabEntry } from "@renderer/pages/listening/types";

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

// ---- G-PLAY-01 & G-PLAY-02: 点词查词三层卡组件 ----
interface WordCardProps {
  word: string;
  vocabMap: Map<string, VocabEntry>;
  phrasesForSentence: Array<{ en: string; zh: string }>;
  book: string;
  chapter: string;
  onClose: () => void;
  onFavChange?: () => void;
}

const WordCard: React.FC<WordCardProps> = ({
  word,
  vocabMap,
  phrasesForSentence,
  book,
  chapter,
  onClose,
  onFavChange,
}) => {
  const cleanWord = word.trim();
  const entry = vocabMap.get(cleanWord.toLowerCase()) ?? vocabMap.get(cleanWord);
  const [faved, setFaved] = useState(() => isWordFaved(book, chapter, cleanWord));

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = toggleFavWord(book, chapter, cleanWord);
    setFaved(newState);
    onFavChange?.();
  };

  const matchedPhrases = phrasesForSentence.filter((p) =>
    p.en.toLowerCase().includes(cleanWord.toLowerCase())
  );

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-88 max-w-[92vw] bg-white border border-[#F0DFC0] rounded-2xl shadow-2xl p-4 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 词头栏：单词 + 音标 + 发音 + 收藏 + 关闭 */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#F7F0E0]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-lg text-[#2E211A]">{cleanWord}</span>
          {entry?.ipa && (
            <span className="text-xs text-[#8A7A68] font-mono bg-[#FAF3E7] px-1.5 py-0.5 rounded">
              {entry.ipa}
            </span>
          )}
          {entry?.pos && (
            <span className="text-xs text-[#8A7A68] italic">{entry.pos}</span>
          )}
          <button
            onClick={() => playStandardTts(cleanWord)}
            className="p-1 rounded-full text-[#F5820B] hover:bg-[#FDEED3] transition-colors"
            title="播放范读"
          >
            <Volume2 className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleFav}
            className="p-1 rounded-full hover:bg-[#FAF3E7] transition-colors"
            title={faved ? "取消收藏生词" : "收藏生词"}
          >
            {faved ? (
              <Star className="size-4.5 text-amber-500 fill-amber-400" />
            ) : (
              <Star className="size-4.5 text-[#8A7A68] hover:text-[#2E211A]" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#8A7A68] hover:text-[#2E211A] hover:bg-[#FAF3E7] transition-colors"
            title="关闭"
          >
            <X className="size-4.5" />
          </button>
        </div>
      </div>

      {/* 第 1 层：句中含义 */}
      {entry?.ctx && (
        <div className="text-sm space-y-0.5">
          <p className="text-xs text-[#8A7A68] font-bold tracking-wide">句中含义</p>
          <p className="text-[#2E211A] leading-relaxed">{entry.ctx}</p>
        </div>
      )}

      {/* 第 2 层：短语搭配 */}
      {matchedPhrases.length > 0 && (
        <div className="text-sm space-y-1">
          <p className="text-xs text-[#8A7A68] font-bold tracking-wide">短语搭配</p>
          {matchedPhrases.map((p, i) => (
            <div key={i} className="bg-[#FAF3E7] rounded-lg px-2.5 py-1 text-xs text-[#2E211A]">
              <span className="font-bold">{p.en}</span>
              <span className="text-[#8A7A68] ml-2">{p.zh}</span>
            </div>
          ))}
        </div>
      )}
      {entry?.phrase && matchedPhrases.length === 0 && (
        <div className="text-sm space-y-1">
          <p className="text-xs text-[#8A7A68] font-bold tracking-wide">短语搭配</p>
          <div className="bg-[#FAF3E7] rounded-lg px-2.5 py-1 text-xs text-[#2E211A] font-medium">
            {entry.phrase}
          </div>
        </div>
      )}

      {/* 第 3 层：字典释义 */}
      {entry?.dict ? (
        <div className="text-sm space-y-0.5">
          <p className="text-xs text-[#8A7A68] font-bold tracking-wide">字典释义</p>
          <p className="text-[#2E211A] leading-relaxed">{entry.dict}</p>
        </div>
      ) : (
        !entry && (
          <p className="text-xs text-[#8A7A68] italic">
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

  // 词卡与收藏状态
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedSentIdx, setSelectedSentIdx] = useState<number | null>(null);
  const [, setFavUpdateVer] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;
  const currentSentIdxRef = useRef(currentSentIdx);
  currentSentIdxRef.current = currentSentIdx;
  const chapterDataRef = useRef(chapterData);
  chapterDataRef.current = chapterData;

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
        setIsFinished(isChapterFinished(book, chapter));
      }
      setLoading(false);
    });
  }, [book, chapter]);

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
    const onPause = () => setIsPlaying(false);
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

      // 单句循环控制
      if (isSingleLoop && sents[curIdx]) {
        const curSent = sents[curIdx];
        if (t >= curSent.end) {
          audio.currentTime = curSent.start;
          setCurrentTime(curSent.start);
          return;
        }
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
          block: "nearest",
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
    audio.currentTime = sent.start;
    setCurrentTime(sent.start);
    setCurrentSentIdx(idx);
    audio.play().catch(() => {});
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

  const handleSeekWave = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = frac * duration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  // D-08: 标记听完状态切换
  const handleToggleCheckin = () => {
    const next = !isFinished;
    markChapterFinished(book, chapter, next);
    setIsFinished(next);
  };

  // G-PLAY-01: 点词查词点击处理
  const handleWordClick = useCallback((word: string, sentIdx: number) => {
    const clean = word.replace(/[^a-zA-Z'-]/g, "");
    if (!clean) return;
    setSelectedWord(clean);
    setSelectedSentIdx(sentIdx);
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
  body{font-family:serif;max-width:700px;margin:auto;padding:2rem;line-height:1.8;color:#2E211A}
  h1{font-size:1.4rem;margin-bottom:0.5rem}
  .meta{color:#666;font-size:0.85rem;margin-bottom:1.5rem}
  .summary{background:#FFF9F0;border-left:3px solid #F5820B;padding:0.75rem 1rem;margin-bottom:1.5rem;font-size:0.9rem}
  .sent{margin-bottom:0.75rem}
  .sent.faved{background:#FFF3E0;border-left:2px solid #F5820B;padding-left:0.5rem}
  .en{font-size:1rem}
  .zh{color:#666;font-size:0.88rem}
  .fav-section{margin-top:2rem;border-top:1px solid #ddd;padding-top:1rem}
  .vocab-item{display:inline-block;margin:0.25rem;background:#F0DFC0;border-radius:4px;padding:0.1rem 0.5rem;font-size:0.85rem}
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
  }, [chapterData, book, chapter, bookTitle, vocabMap]);

  // 封面与级别
  const coverUrl =
    book === "velveteenduet_librivox"
      ? "/assets/covers/velveteen-cover.jpg"
      : "/assets/covers/treasury-cover.jpg";

  const level = (chapterData?.level || "a1").toLowerCase();

  // 波形 peaks 处理 (72 条)
  const waveBars = useMemo(() => {
    const rawPeaks = chapterData?.peaks || [];
    const count = 72;
    if (!rawPeaks.length) {
      // 缺省波形样式
      return Array.from({ length: count }, (_, i) => 25 + Math.sin(i * 0.4) * 20);
    }
    const step = Math.max(1, Math.floor(rawPeaks.length / count));
    const bars: number[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.min(rawPeaks.length - 1, i * step);
      let v = rawPeaks[idx];
      if (v > 1) v = v / 100;
      bars.push(Math.max(15, Math.min(100, Math.round(v * 100))));
    }
    return bars;
  }, [chapterData]);

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
              <ChevronLeft className="size-4 text-ink stroke-[2.5]" />
              <span>书架</span>
            </button>

            {/* 三级面包屑导航 */}
            <nav className="flex items-center gap-1.5 text-xs md:text-sm text-[#8A7A68] min-w-0" aria-label="面包屑导航">
              <Link to="/listening" className="hover:text-ink transition-colors font-medium shrink-0">
                书架
              </Link>
              <span className="text-[#C9BBA6] shrink-0">/</span>
              <Link
                to={`/listening/${book}`}
                className="hover:text-ink transition-colors font-semibold underline-offset-4 hover:underline shrink-0"
                title={`返回 ${bookTitle} 章节列表`}
              >
                {bookTitle}
              </Link>
              <span className="text-[#C9BBA6] shrink-0">/</span>
              <span className="text-ink font-bold truncate max-w-[160px] md:max-w-[280px] lg:max-w-[420px]" title={chapterData?.title}>
                {chapterData?.title || `第 ${chapter} 章`}
              </span>
            </nav>
          </div>

          <div className="right flex items-center gap-3 shrink-0">
            {/* D-07: 文字向孩子说明「播完即记为听完」 */}
            <span className="text-xs text-[#8A7A68] hidden sm:inline-block font-medium">
              播完即记为听完
            </span>

            {/* G-PLAY-03: 打印学习文稿 */}
            <button
              className="h-10 md:h-11 px-3.5 md:px-4 border border-[#F0DFC0] bg-white rounded-full text-xs md:text-sm font-semibold text-[#2E211A] flex items-center gap-1.5 hover:bg-[#FFFDF7] active:scale-95 transition-all shadow-sm"
              onClick={handlePrint}
              title="打印文稿"
            >
              <Printer className="size-4 text-[#8A7A68]" />
              <span>打印文稿</span>
            </button>

            {/* D-08: 统一文案「标记听完 / 已听完」 */}
            <button
              className={`sb-btn-checkin ${isFinished ? "done" : ""}`}
              onClick={handleToggleCheckin}
              title={isFinished ? "已听完（点击取消）" : "点击标记听完"}
            >
              {isFinished && <Check className="size-4 stroke-[3]" />}
              <span>{isFinished ? "已听完" : "标记听完"}</span>
            </button>
          </div>
        </div>

        {/* G-PLAY-04: B1/world 梗概卡（无逐句 zh 时在页顶展示；有 zh 的不显示） */}
        {showOverview && (
          <div className="sb-card sb-overview-card mb-5 p-4 md:p-5 bg-[#FFFDF7] border border-[#F0DFC0] rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-[#F5820B] tracking-wide uppercase px-2.5 py-0.5 bg-[#FDEED3] rounded-md">
                {isWorld ? "导览" : "章节梗概"}
              </span>
              <span className="text-xs text-[#8A7A68]">
                （本章无逐句中文译文，请结合梗概导览理解文意）
              </span>
            </div>
            <p className="text-sm md:text-base leading-relaxed text-[#2E211A]">
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
                  <div className="sub">
                    第 {parseInt(chapter, 10)} 章 · {sentences.length} 句 · {fmt(chapterData.duration)}
                  </div>
                </div>

                {/* 播放器卡 */}
                <div className="sb-card sb-player">
                  {/* 波形条与句界刻度 */}
                  <div className="sb-wave" onClick={handleSeekWave}>
                    {waveBars.map((height, i) => {
                      const barFraction = i / waveBars.length;
                      const isOn = barFraction <= playedFraction;
                      return (
                        <i
                          key={i}
                          style={{ height: `${height}%` }}
                          className={isOn ? "on" : ""}
                        />
                      );
                    })}
                    {/* 句界刻度 */}
                    {duration > 0 &&
                      sentences.map((sent, i) => {
                        const pct = (sent.start / duration) * 100;
                        const isDone = currentTime >= sent.start;
                        return (
                          <span
                            key={i}
                            className={`tick ${isDone ? "done" : ""}`}
                            style={{ left: `${pct}%` }}
                          />
                        );
                      })}
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
                    >
                      <Repeat className="size-4" />
                      <span>连播</span>
                    </button>

                    <button
                      className={`sb-ctl toggle ${playMode === "single" ? "on" : ""}`}
                      onClick={() => setPlayMode("single")}
                      title="单句循环模式"
                    >
                      <Repeat1 className="size-4" />
                      <span>单句循环</span>
                    </button>

                    <button
                      className="sb-ctl"
                      onClick={handlePrevSentence}
                      disabled={currentSentIdx <= 0}
                      title="上一句"
                    >
                      <SkipBack className="size-5 fill-ink text-ink" />
                    </button>

                    <button
                      className="sb-ctl play"
                      onClick={togglePlay}
                      title={isPlaying ? "暂停" : "播放"}
                    >
                      {isPlaying ? (
                        <Pause className="size-6 fill-white text-white" />
                      ) : (
                        <Play className="size-6 fill-white text-white ml-0.5" />
                      )}
                    </button>

                    <button
                      className="sb-ctl"
                      onClick={handleNextSentence}
                      disabled={currentSentIdx >= sentences.length - 1}
                      title="下一句"
                    >
                      <SkipForward className="size-5 fill-ink text-ink" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 右栏：文稿与逐句高亮 + 点词查词 + 行尾收藏 */}
            <div className="sb-col-mid flex-1 min-w-0 w-full">
              <div className="sb-card sb-transcript">
                <div className="head flex items-center justify-between">
                  <h2>文稿</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#8A7A68]">点击文稿单词可直接查词</span>
                    <span>共 {sentences.length} 句</span>
                  </div>
                </div>
                <div className="sb-transcript-lines">
                  {sentences.map((sent, i) => {
                    const isNow = currentSentIdx === i;
                    const isSentFaved = isSentenceFaved(book, chapter, i);
                    return (
                      <div
                        key={i}
                        ref={(el) => {
                          lineRefs.current[i] = el;
                        }}
                        className={`sb-line group flex items-start gap-3 ${isNow ? "now" : ""}`}
                        onClick={() => jumpToSentence(i)}
                      >
                        <div className="no">{i + 1}</div>
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleWordClick(clean, i);
                                  }}
                                  className={`cursor-pointer hover:underline hover:decoration-dotted transition-colors ${
                                    inVocab ? "text-[#F5820B] font-bold" : ""
                                  }`}
                                  title={inVocab ? "查看生词释义卡" : "查词"}
                                >
                                  {token}
                                </span>
                              );
                            })}
                          </div>
                          {sent.zh && <div className="zh">{sent.zh}</div>}
                        </div>

                        {/* G-PLAY-02: 句尾收藏星 */}
                        <div className="flex items-center self-start pt-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavSentence(i);
                            }}
                            title={isSentFaved ? "取消收藏句子" : "收藏句子"}
                            className={`p-1.5 rounded-full hover:bg-[#FAF3E7] transition-all ${
                              isSentFaved
                                ? "opacity-100"
                                : "opacity-60 md:opacity-0 md:group-hover:opacity-100"
                            }`}
                          >
                            <Star
                              className={`size-4 ${
                                isSentFaved
                                  ? "text-amber-500 fill-amber-400"
                                  : "text-[#8A7A68]"
                              }`}
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
              onClick={() => {
                setSelectedWord(null);
                setSelectedSentIdx(null);
              }}
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
              onClose={() => {
                setSelectedWord(null);
                setSelectedSentIdx(null);
              }}
              onFavChange={() => setFavUpdateVer((v) => v + 1)}
            />
          </>
        )}

        {/* 页脚 */}
        <DesktopFooter />
      </main>
    </div>
  );
};
