import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Check,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
} from "lucide-react";
import { DesktopSidebar } from "./desktop-sidebar";
import { DesktopFooter } from "./desktop-footer";
import {
  loadChapterData,
  markChapterFinished,
  isChapterFinished,
} from "@renderer/lib/listening-sync";
import { saveRecentListening } from "@renderer/lib/desktop-data";
import type { ListeningChapter, ListeningSentence } from "@renderer/pages/listening/types";

function fmt(sec: number): string {
  if (!sec || isNaN(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const DesktopPlayer: React.FC = () => {
  const { book = "treasury_beatrixpotter_0910", chapter = "01" } = useParams<{
    book: string;
    chapter: string;
  }>();
  const navigate = useNavigate();

  const [chapterData, setChapterData] = useState<ListeningChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSentIdx, setCurrentSentIdx] = useState(0);
  const [playMode, setPlayMode] = useState<"continuous" | "single">("continuous");
  const [isFinished, setIsFinished] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;
  const currentSentIdxRef = useRef(currentSentIdx);
  currentSentIdxRef.current = currentSentIdx;
  const chapterDataRef = useRef(chapterData);
  chapterDataRef.current = chapterData;

  // 加载章节数据
  useEffect(() => {
    if (!book || !chapter) return;
    setLoading(true);
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

  const handleToggleCheckin = () => {
    const next = !isFinished;
    markChapterFinished(book, chapter, next);
    setIsFinished(next);
  };

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
        {/* 顶栏 */}
        <div className="sb-topbar">
          <div className="left">
            <button
              className="sb-back"
              onClick={() => navigate("/listening")}
              title="返回听故事书架"
            >
              <ChevronLeft className="size-5 text-ink stroke-[2.5]" />
            </button>
            <h1 className="text-xl font-extrabold text-ink">正在播放</h1>
          </div>
          <div className="right">
            <button
              className={`sb-btn-checkin ${isFinished ? "done" : ""}`}
              onClick={handleToggleCheckin}
            >
              <span>{isFinished ? "已听完打卡" : "听完打卡"}</span>
            </button>
          </div>
        </div>

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
          <div className="sb-content">
            {/* 左栏 400px：封面与播放控制器 */}
            <div className="sb-col-left">
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

            {/* 右栏：文稿与逐句高亮 */}
            <div className="sb-col-mid">
              <div className="sb-card sb-transcript">
                <div className="head">
                  <h2>文稿</h2>
                  <span>共 {sentences.length} 句</span>
                </div>
                <div className="sb-transcript-lines">
                  {sentences.map((sent, i) => {
                    const isNow = currentSentIdx === i;
                    return (
                      <div
                        key={i}
                        ref={(el) => {
                          lineRefs.current[i] = el;
                        }}
                        className={`sb-line ${isNow ? "now" : ""}`}
                        onClick={() => jumpToSentence(i)}
                      >
                        <div className="no">{i + 1}</div>
                        <div className="body flex-1">
                          <div className="en">{sent.text}</div>
                          {sent.zh && <div className="zh">{sent.zh}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 页脚 */}
        <DesktopFooter />
      </main>
    </div>
  );
};
