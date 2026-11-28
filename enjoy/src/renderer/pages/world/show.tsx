import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  getCultureCatalog,
  getCultureSlideById,
  recordPassportStamp,
  getUserPassport,
  CultureSlide,
} from "@renderer/lib/culture-service";
import { playStandardTts, stopStandardTts } from "@renderer/lib/phonetics-coach";
import { toggleFavWord, isWordFaved } from "@renderer/lib/listening-sync";
import { usePronunciationCoach } from "@renderer/context";
import { LoaderSpin } from "@renderer/components";
import { WordCard, type WordAnchorRect } from "@renderer/components/widgets/word-card";
import type { VocabEntry } from "@renderer/pages/listening/types";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  toast,
} from "@renderer/components/ui";
import {
  Volume2,
  VolumeX,
  MapPin,
  CheckCircle2,
  Coins,
  BookOpen,
  HelpCircle,
  ChevronDown,
  Star,
  Play,
  Mic,
  ArrowRight,
  X,
} from "lucide-react";

const WORLD_ABBREV_WORDS = new Set([
  "mr", "mrs", "ms", "miss", "dr", "st", "sr", "jr", "prof", "rev",
  "hon", "pres", "gov", "gen", "col", "maj", "capt", "lt", "sgt", "cpl", "pvt",
  "mt", "ft", "no", "vol", "ch", "fig", "pp", "vs", "etc", "al",
  "inc", "ltd", "co", "corp", "dept", "est", "approx",
  "jan", "feb", "mar", "apr", "aug", "sep", "sept", "oct", "nov", "dec",
  "mon", "tue", "tues", "wed", "thu", "thur", "thurs", "fri", "sat", "sun",
]);

/**
 * 将景点英文短文按句终标点（. ! ?）拆为句子数组，避开常见缩写（U.S.、Mr.、St.、A.A.）、小数与省略号误拆。
 */
export function splitWorldSentences(rawText: string): string[] {
  const text = (rawText || "").trim();
  if (!text) return [];

  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const sentences: string[] = [];
  for (const para of paragraphs) {
    let startIdx = 0;
    const boundaryRe = /([.!?])(["”'’)\]]*)(\s+)(?=["“'‘(\[_*]*[A-Z0-9])/g;
    let match: RegExpExecArray | null;

    while ((match = boundaryRe.exec(para)) !== null) {
      const punct = match[1];
      const closing = match[2];
      const punctIdx = match.index;
      const afterPunctIdx = punctIdx + 1 + closing.length;

      if (punct === ".") {
        const prevChar = punctIdx > 0 ? para[punctIdx - 1] : "";
        const nextChar = punctIdx + 1 < para.length ? para[punctIdx + 1] : "";
        // 省略号 .. / ... 不拆
        if (prevChar === "." || nextChar === ".") continue;
        // 小数如 2.6 不拆
        const afterSpaceChar = para[afterPunctIdx + match[3].length] || "";
        if (/\d/.test(prevChar) && /\d/.test(afterSpaceChar)) continue;

        const beforePunct = para.slice(startIdx, punctIdx);
        // 多段缩写如 U.S. / A.A. / J.F.K. / D.C. 不拆
        if (/(?:^|[\s("“'‘])(?:[A-Za-z]\.){1,}[A-Za-z]$/.test(beforePunct)) {
          continue;
        }
        // 词首边界后的缩写词（Mr. / St. / Jr. / No.）及单字母缩写不拆（排除 '60s / 1970s）
        const wordMatch = beforePunct.match(/(?:^|[\s("“'‘\-])([A-Za-z]+)$/);
        if (wordMatch) {
          const wordLower = wordMatch[1].toLowerCase();
          if (WORLD_ABBREV_WORDS.has(wordLower)) continue;
          if (wordMatch[1].length === 1 && wordMatch[1] !== "I") continue;
        }
      }

      const segment = para.slice(startIdx, afterPunctIdx).trim();
      if (segment) {
        sentences.push(segment);
        startIdx = afterPunctIdx + match[3].length;
      }
    }

    const tail = para.slice(startIdx).trim();
    if (tail) {
      sentences.push(tail);
    }
  }

  return sentences.length > 0 ? sentences : [text];
}

const QUIZ_STOP_WORDS = new Set([
  "the", "is", "in", "on", "of", "to", "a", "an", "and", "or",
  "what", "where", "when", "who", "how", "why", "was", "were",
  "are", "did", "do", "does", "called", "located", "famous",
  "for", "from", "with", "which", "this", "that", "one", "many",
  "much", "first",
]);

function findRelevantQuizSentence(slide: CultureSlide, sentences: string[]): string {
  if (sentences.length === 0) return slide.contentEn;
  const rawAnswer = slide.quiz.options[slide.quiz.correctIndex] || "";
  const cleanAnswer = rawAnswer.replace(/\s*\([^)]*\)/g, "").trim();
  const ansTokens: string[] = cleanAnswer.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const qEn = slide.quiz.question.replace(/\s*\([^)]*\)\s*$/, "");
  const matchedQTokens: string[] = qEn.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const qTokens = matchedQTokens.filter(
    (tok) => !QUIZ_STOP_WORDS.has(tok) && tok.length > 1
  );

  let bestIdx = 0;
  let bestScore = -1;
  sentences.forEach((sent, idx) => {
    const lower = sent.toLowerCase();
    let score = 0;
    if (cleanAnswer && lower.includes(cleanAnswer.toLowerCase())) score += 10;
    for (const tok of ansTokens) {
      if (tok.length > 1 && lower.includes(tok)) score += 3;
    }
    for (const tok of qTokens) {
      if (lower.includes(tok)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  return sentences[bestIdx] || sentences[0];
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface WorldQuizQuestion {
  id: string;
  kind: "reading" | "vocab";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function buildWorldQuizQuestions(
  slide: CultureSlide,
  sentences: string[]
): WorldQuizQuestion[] {
  const questions: WorldQuizQuestion[] = [];

  if (slide.quiz && Array.isArray(slide.quiz.options) && slide.quiz.options.length > 0) {
    const relevantSentence = findRelevantQuizSentence(slide, sentences);
    questions.push({
      id: `${slide.id}-reading`,
      kind: "reading",
      question: slide.quiz.question,
      options: slide.quiz.options,
      correctIndex: slide.quiz.correctIndex,
      explanation: `答案在短文中：${relevantSentence}`,
    });
  }

  const validKeywords = (slide.keyWords || []).filter(
    (kw) => kw.word?.trim() && kw.zh?.trim()
  );
  if (validKeywords.length >= 2) {
    const targetCount = validKeywords.length >= 3 ? 2 : 1;
    const targets = shuffleArray(validKeywords).slice(0, targetCount);

    targets.forEach((kw, idx) => {
      const otherMeanings = shuffleArray(
        validKeywords
          .filter((other) => other.word !== kw.word && other.zh.trim() !== kw.zh.trim())
          .map((other) => other.zh.trim())
      );
      const uniqueDistractors: string[] = [];
      for (const m of otherMeanings) {
        if (!uniqueDistractors.includes(m)) uniqueDistractors.push(m);
        if (uniqueDistractors.length >= 2) break;
      }
      if (uniqueDistractors.length === 0) return;

      const options = shuffleArray([kw.zh.trim(), ...uniqueDistractors]);
      const correctIndex = options.indexOf(kw.zh.trim());

      questions.push({
        id: `${slide.id}-vocab-${idx}-${kw.word}`,
        kind: "vocab",
        question: `"${kw.word}" 是什么意思？`,
        options,
        correctIndex,
        explanation: `"${kw.word}"${kw.ipa ? ` (${kw.ipa})` : ""} 的意思：${kw.zh}`,
      });
    });
  }

  return questions;
}

function findSentenceByFraction(cumEnds: number[], fraction: number): number {
  for (let i = 0; i < cumEnds.length; i++) {
    if (fraction < cumEnds[i]) return i;
  }
  return Math.max(0, cumEnds.length - 1);
}

const renderBalancedTitle = (title: string) => {
  const sepIndex = title.indexOf(" · ");
  if (sepIndex <= 0) return title;
  const prefix = title.slice(0, sepIndex + 2);
  const rest = title.slice(sepIndex + 3);
  return (
    <>
      <span className={prefix.length <= 8 ? "whitespace-nowrap" : undefined}>{prefix}</span>{" "}
      <wbr />
      <span>{rest}</span>
    </>
  );
};

export default () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openAssessment } = usePronunciationCoach();

  const [slide, setSlide] = useState<CultureSlide | null>(null);
  const [catalogSlides, setCatalogSlides] = useState<CultureSlide[]>([]);
  const [loading, setLoading] = useState(true);

  // 英文逐句播放与高亮状态
  const [activeSentIdx, setActiveSentIdx] = useState<number>(0);
  const [playingMode, setPlayingMode] = useState<"full" | "single" | null>(null);
  const [playingSentIdx, setPlayingSentIdx] = useState<number | null>(null);
  const playbackRunIdRef = useRef(0);
  const fallbackTimerRef = useRef<number | null>(null);

  // 点词查词状态
  const [selectedWordInfo, setSelectedWordInfo] = useState<{
    word: string;
    sentIdx: number;
    anchorRect: WordAnchorRect | null;
  } | null>(null);

  // 中文导读默认折叠
  const [zhOpen, setZhOpen] = useState(false);

  // 文化关键词发音与生词收藏状态
  const [chapterKey, setChapterKey] = useState<string>("");
  const [favedWords, setFavedWords] = useState<Record<string, boolean>>({});
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  // 3题小测状态（答错可重试：记录当前题已选错的选项索引）
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [wrongOptions, setWrongOptions] = useState<number[]>([]);
  const [questionSolved, setQuestionSolved] = useState(false);
  const [isPassed, setIsPassed] = useState(false);
  const [showStampModal, setShowStampModal] = useState(false);
  const [collectedSnapshot, setCollectedSnapshot] = useState<string[]>([]);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      window.clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const stopAllTts = useCallback(() => {
    playbackRunIdRef.current += 1;
    clearFallbackTimer();
    stopStandardTts();
    setPlayingMode(null);
    setPlayingSentIdx(null);
  }, [clearFallbackTimer]);

  useEffect(() => {
    let mounted = true;
    if (!id) return;

    stopAllTts();
    setLoading(true);
    setZhOpen(false);
    setActiveSentIdx(0);
    setSelectedWordInfo(null);
    setCurrentQuizIdx(0);
    setWrongOptions([]);
    setQuestionSolved(false);
    setShowStampModal(false);
    setPlayingWord(null);

    Promise.all([getCultureSlideById(id), getCultureCatalog()]).then(([s, catalog]) => {
      if (!mounted) return;
      setCatalogSlides(catalog.slides || []);
      if (s) {
        setSlide(s);
        try {
          localStorage.setItem(
            "sunnybridge_world_last_visit_v1",
            JSON.stringify({ id: s.id, ts: Date.now() })
          );
        } catch {}
        const pass = getUserPassport();
        setCollectedSnapshot(pass.collectedStamps);
        setIsPassed(pass.collectedStamps.includes(s.id));

        const idx = catalog.slides.findIndex((item) => item.id === s.id);
        const resolvedKey = idx >= 0 ? String(idx + 1).padStart(2, "0") : s.id;
        setChapterKey(resolvedKey);

        const initialFaved: Record<string, boolean> = {};
        for (const kw of s.keyWords) {
          initialFaved[kw.word] = isWordFaved("world", resolvedKey, kw.word);
        }
        setFavedWords(initialFaved);
      } else {
        setSlide(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      stopAllTts();
    };
  }, [id, stopAllTts]);

  const sentences = useMemo(
    () => (slide ? splitWorldSentences(slide.contentEn) : []),
    [slide]
  );

  const sentenceCumEnds = useMemo(() => {
    if (sentences.length === 0) return [];
    const lengths = sentences.map((s) => Math.max(1, s.length));
    const total = lengths.reduce((sum, len) => sum + len, 0);
    let acc = 0;
    return lengths.map((len) => {
      acc += len;
      return acc / total;
    });
  }, [sentences]);

  const keywordVocabMap = useMemo(() => {
    const map = new Map<string, VocabEntry>();
    if (!slide) return map;
    for (const kw of slide.keyWords) {
      map.set(kw.word.toLowerCase(), {
        w: kw.word,
        ipa: kw.ipa,
        dict: [
          {
            pos: "",
            def_en: "",
            def_cn: kw.zh,
            example_en: "",
            example_cn: "",
            audio_href: "",
          },
        ],
      });
    }
    return map;
  }, [slide]);

  const quizQuestions = useMemo(
    () => (slide ? buildWorldQuizQuestions(slide, sentences) : []),
    [slide, sentences]
  );

  // 计算 catalog 顺序中下一个未收集的 world 站点
  const nextUncollectedSlide = useMemo(() => {
    if (!slide || catalogSlides.length === 0) return null;
    const collected = new Set(collectedSnapshot);
    collected.add(slide.id);
    const curIdx = catalogSlides.findIndex((item) => item.id === slide.id);
    const start = curIdx >= 0 ? curIdx + 1 : 0;
    for (let offset = 0; offset < catalogSlides.length; offset++) {
      const candidate = catalogSlides[(start + offset) % catalogSlides.length];
      if (candidate.id !== slide.id && !collected.has(candidate.id)) {
        return candidate;
      }
    }
    return null;
  }, [slide, catalogSlides, collectedSnapshot]);

  const isReading = playingMode === "full";

  // 整段语音朗读 (锁定 Sonia 纯正英音，按句字符占比估算高亮跟随)
  const handleToggleReadAloud = () => {
    if (!slide) return;
    if (playingMode === "full") {
      stopAllTts();
      return;
    }

    stopAllTts();
    const runId = ++playbackRunIdRef.current;
    setPlayingWord(null);
    setPlayingMode("full");
    setActiveSentIdx(0);
    setPlayingSentIdx(0);

    const totalChars = sentences.reduce((sum, s) => sum + Math.max(1, s.length), 0);
    const estimatedMs = Math.max(2500, totalChars * 72);
    const startTs = Date.now();
    let gotRealTiming = false;

    if (sentences.length > 1) {
      fallbackTimerRef.current = window.setInterval(() => {
        if (playbackRunIdRef.current !== runId || gotRealTiming) return;
        const elapsed = Date.now() - startTs;
        const frac = Math.min(0.9999, Math.max(0, elapsed / estimatedMs));
        const nextIdx = findSentenceByFraction(sentenceCumEnds, frac);
        setActiveSentIdx(nextIdx);
        setPlayingSentIdx(nextIdx);
      }, 180);
    }

    playStandardTts(slide.contentEn, {
      voice: "en-GB-SoniaNeural",
      rate: "-5%",
      onTimeUpdate: (currentTime, duration) => {
        if (playbackRunIdRef.current !== runId || !duration || !Number.isFinite(duration)) {
          return;
        }
        gotRealTiming = true;
        clearFallbackTimer();
        const frac = Math.min(0.9999, Math.max(0, currentTime / duration));
        const nextIdx = findSentenceByFraction(sentenceCumEnds, frac);
        setActiveSentIdx(nextIdx);
        setPlayingSentIdx(nextIdx);
      },
      onEnd: () => {
        if (playbackRunIdRef.current !== runId) return;
        clearFallbackTimer();
        setPlayingMode(null);
        setPlayingSentIdx(null);
      },
    }).catch(() => {
      if (playbackRunIdRef.current !== runId) return;
      clearFallbackTimer();
      setPlayingMode(null);
      setPlayingSentIdx(null);
    });
  };

  // 点击任意一句播放该句（英音 en-GB-SoniaNeural、rate "-5%"）
  const handlePlaySentence = (idx: number) => {
    const sent = sentences[idx];
    if (!sent) return;

    if (playingMode === "single" && playingSentIdx === idx) {
      stopAllTts();
      setActiveSentIdx(idx);
      return;
    }

    stopAllTts();
    const runId = ++playbackRunIdRef.current;
    setPlayingWord(null);
    setActiveSentIdx(idx);
    setPlayingMode("single");
    setPlayingSentIdx(idx);

    playStandardTts(sent, {
      voice: "en-GB-SoniaNeural",
      rate: "-5%",
      onEnd: () => {
        if (playbackRunIdRef.current !== runId) return;
        setPlayingMode(null);
        setPlayingSentIdx(null);
      },
    }).catch(() => {
      if (playbackRunIdRef.current !== runId) return;
      setPlayingMode(null);
      setPlayingSentIdx(null);
    });
  };

  // 点词查词（不得触发整句播放）
  const handleWordClick = useCallback(
    (word: string, sentIdx: number, targetEl: HTMLElement | null) => {
      const clean = word.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, "").replace(/['’]s$/i, "");
      if (!clean) return;
      const rect = targetEl ? targetEl.getBoundingClientRect() : null;
      setSelectedWordInfo({
        word: clean,
        sentIdx,
        anchorRect: rect
          ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
          : null,
      });
    },
    []
  );

  // 打开纠错舱跟读当前句（不传 audioUrl，走 TTS 范读）
  const handleShadowSentence = (sent: string, idx: number) => {
    if (!slide) return;
    stopAllTts();
    setActiveSentIdx(idx);
    openAssessment({
      referenceText: sent,
      source: "world",
      contextTitle: slide.title,
      archiveContext: {
        source: "world",
        contextRef: `${slide.id}/${idx + 1}`,
      },
    });
  };

  // 点击关键词播放英音（与详情页朗读同源）
  const handlePlayKeyword = (word: string) => {
    stopAllTts();
    const runId = ++playbackRunIdRef.current;
    setPlayingWord(word);
    playStandardTts(word, {
      voice: "en-GB-SoniaNeural",
      rate: "-5%",
      onEnd: () => {
        if (playbackRunIdRef.current !== runId) return;
        setPlayingWord((cur) => (cur === word ? null : cur));
      },
    }).catch(() => {
      if (playbackRunIdRef.current !== runId) return;
      setPlayingWord((cur) => (cur === word ? null : cur));
    });
  };

  // 收藏关键词到生词本（复用 listening-sync 现有生词收藏逻辑）
  const handleToggleKeywordFav = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    const key = chapterKey || slide?.id || "";
    if (!key) return;
    const nextFaved = toggleFavWord("world", key, word);
    setFavedWords((prev) => ({ ...prev, [word]: nextFaved }));
    if (nextFaved) {
      toast.success(`已将 "${word}" 加入生词本`);
    } else {
      toast.info(`已将 "${word}" 移出生词本`);
    }
  };

  const syncKeywordFavedState = useCallback(() => {
    if (!slide) return;
    const key = chapterKey || slide.id;
    const updated: Record<string, boolean> = {};
    for (const kw of slide.keyWords) {
      updated[kw.word] = isWordFaved("world", key, kw.word);
    }
    setFavedWords(updated);
  }, [slide, chapterKey]);

  const currentQuestion = quizQuestions[currentQuizIdx];

  // 提交当前小测题（答错不锁死：错选项标红禁用，其余选项可继续选）
  const handleSelectOption = (idx: number) => {
    if (!slide || !currentQuestion || questionSolved || wrongOptions.includes(idx)) return;

    if (idx === currentQuestion.correctIndex) {
      setQuestionSolved(true);
      const isLast = currentQuizIdx >= quizQuestions.length - 1;
      if (isLast) {
        const updatedPass = recordPassportStamp(slide.id, 10);
        setCollectedSnapshot(updatedPass.collectedStamps);
        setIsPassed(true);
        setShowStampModal(true);
        toast.success("全部答对，获得旅行邮戳，金币 +10。");
      } else {
        toast.success("回答正确！继续下一题吧。");
      }
    } else {
      setWrongOptions((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
      toast.error(
        currentQuestion.kind === "reading"
          ? "答案就在短文中，再读一遍试试。"
          : "再想想哦，可以看看上方的文化关键词。"
      );
    }
  };

  const handleNextQuestion = () => {
    if (currentQuizIdx >= quizQuestions.length - 1) return;
    setCurrentQuizIdx((prev) => prev + 1);
    setWrongOptions([]);
    setQuestionSolved(false);
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <LoaderSpin />
      </div>
    );
  }

  if (!slide) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="text-4xl">🌍</div>
        <h2 className="text-xl font-bold">未找到该文化漫游站点</h2>
        <Button asChild variant="outline">
          <Link to="/world">返回环球漫游</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full max-w-5xl mx-auto px-4 pt-6 pb-24 xl:pb-10 space-y-6">
      {/* 顶部面包屑 */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/world" className="text-[#4E6B69] hover:text-[#0F7B7A]">
                环球漫游
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="text-[#4E6B69]">{slide.region}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage className="font-bold text-[#123B3C]">
            {slide.title}
          </BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 拍立得明信片主卡片 */}
      <div className="relative bg-[#E7F2EF] border border-[#D3E4DE] rounded-3xl overflow-hidden shadow-sm">
        <img
          src={slide.imageUrl}
          alt={slide.title}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-0 items-stretch">
          {/* 左侧：高清名胜实景照片 (5 列，背景由主卡片底图透出) */}
          <div className="md:col-span-5 relative min-h-[300px]">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* 小狮子敢敢旅行邮戳 */}
            {isPassed && (
              <div className="absolute top-4 right-4 bg-[#F2A93B] text-[#123B3C] font-extrabold px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-1.5 text-xs animate-in zoom-in-50">
                <span>已打卡 · 旅行邮戳已收集</span>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center gap-1.5 text-xs text-white/90 font-bold mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#F2A93B]" />
                <span>{slide.region}</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">{slide.title}</h2>
            </div>
          </div>

          {/* 右侧：中英双语探索解读 (7 列，半透白遮罩覆盖延伸背景) */}
          <div className="md:col-span-7 bg-white/60 backdrop-blur-sm p-5 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span className="text-2xl shrink-0 leading-none mt-0.5">{slide.stamp}</span>
                  <div className="min-w-0 [text-shadow:0_1px_2px_rgba(255,255,255,0.85)]">
                    <h1 className="text-base sm:text-lg font-extrabold text-[#123B3C] leading-snug text-balance">
                      {renderBalancedTitle(slide.titleZh)}
                    </h1>
                    <p className="text-xs text-[#4E6B69] mt-0.5">{slide.tagline}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleReadAloud}
                  className={`rounded-2xl text-xs gap-1.5 shrink-0 ${
                    isReading
                      ? "bg-[#0F7B7A] text-white border-[#0F7B7A] hover:bg-[#0A5E5D] hover:text-white"
                      : "bg-white text-[#0F7B7A] border-[#D3E4DE] hover:bg-[#F3FAF8] hover:text-[#0A5E5D]"
                  }`}
                >
                  {isReading ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span>{isReading ? "停止朗读" : "英音朗读"}</span>
                </Button>
              </div>

              {/* 英文逐句阅读与跟读区 */}
              <div className="bg-[#F3FAF8]/60 rounded-2xl p-3.5 sm:p-4 border border-[#D3E4DE] space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap px-1 [text-shadow:0_1px_2px_rgba(255,255,255,0.8)]">
                  <span className="text-[11px] font-bold text-[#4E6B69] uppercase tracking-wider">
                    English Reading · {sentences.length} 句
                  </span>
                  <span className="text-[11px] text-[#4E6B69]">
                    点句子听英音 · 点单词查词 · 右侧「跟读」纠音
                  </span>
                </div>

                <div className="space-y-1.5">
                  {sentences.map((sent, idx) => {
                    const isActive = idx === activeSentIdx;
                    const isSentencePlaying = playingSentIdx === idx;

                    return (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        data-testid={`world-sentence-${idx}`}
                        onClick={() => handlePlaySentence(idx)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handlePlaySentence(idx);
                          }
                        }}
                        className={`group flex items-start gap-2.5 rounded-xl px-2.5 py-2.5 border cursor-pointer transition-all ${
                          isActive
                            ? "bg-[#E7F2EF]/60 border-[#0F7B7A]/40 shadow-2xs"
                            : "bg-transparent border-transparent hover:bg-white/60 hover:border-[#D3E4DE]"
                        }`}
                      >
                        {/* 行首播放指示 */}
                        <span
                          className={`mt-1 shrink-0 transition-opacity ${
                            isSentencePlaying
                              ? "text-[#0F7B7A] opacity-100"
                              : isActive
                              ? "text-[#0F7B7A] opacity-100"
                              : "text-[#4E6B69] opacity-75 md:opacity-0 md:group-hover:opacity-100"
                          }`}
                          aria-hidden="true"
                        >
                          {isSentencePlaying ? (
                            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </span>

                        {/* 英文句子（可点词查词） */}
                        <p
                          className={`flex-1 min-w-0 text-sm sm:text-[15px] leading-relaxed select-text ${
                            isActive
                              ? "font-semibold text-[#123B3C]"
                              : "font-medium text-[#123B3C]/90"
                          }`}
                        >
                          {sent.split(/(\s+)/).map((token, ti) => {
                            const clean = token
                              .replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, "")
                              .replace(/['’]s$/i, "");
                            if (!clean) return <span key={ti}>{token}</span>;
                            const isKeyword = keywordVocabMap.has(clean.toLowerCase());
                            return (
                              <span
                                key={ti}
                                role="button"
                                tabIndex={-1}
                                data-word-token="true"
                                aria-label={`查词：${clean}`}
                                title="点击查词"
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
                                className={`cursor-pointer rounded-xs hover:underline hover:decoration-dotted hover:text-[#0F7B7A] ${
                                  isKeyword
                                    ? "text-[#0F7B7A] underline decoration-[#0F7B7A]/40 decoration-dotted underline-offset-2"
                                    : ""
                                }`}
                              >
                                {token}
                              </span>
                            );
                          })}
                        </p>

                        {/* 行尾跟读按钮 */}
                        <button
                          type="button"
                          data-testid={`world-shadow-btn-${idx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShadowSentence(sent, idx);
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                          title={`跟读第 ${idx + 1} 句`}
                          aria-label={`跟读第 ${idx + 1} 句`}
                          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                            isActive
                              ? "bg-[#0F7B7A] text-white hover:bg-[#0A5E5D] shadow-2xs"
                              : "bg-white border border-[#D3E4DE] text-[#0F7B7A] hover:bg-[#0F7B7A] hover:text-white hover:border-[#0F7B7A]"
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>跟读</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 中文导读（默认收起，点击标题行展开/收起） */}
              <details
                key={slide.id}
                open={zhOpen}
                className="bg-[#F3FAF8]/60 rounded-2xl p-4 border border-[#D3E4DE]"
              >
                <summary
                  onClick={(e) => {
                    e.preventDefault();
                    setZhOpen((prev) => !prev);
                  }}
                  className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center justify-between gap-2 text-xs font-bold text-[#0F7B7A]"
                >
                  <span className="flex items-center gap-1.5">
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        zhOpen ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                    <span>中文导读</span>
                  </span>
                  <span className="text-[11px] font-medium text-[#4E6B69]">
                    {zhOpen ? "收起译文" : "点击展开译文"}
                  </span>
                </summary>
                <div className="pt-2.5 space-y-2 text-xs leading-relaxed text-[#123B3C]/90">
                  {slide.contentZh
                    .split(/\n+/)
                    .filter(Boolean)
                    .map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                </div>
              </details>
            </div>

            {/* 核心拓展生词 */}
            <div className="pt-2 border-t border-[#D3E4DE]">
              <div className="text-xs font-bold text-[#4E6B69] mb-2 flex items-center justify-between gap-2 [text-shadow:0_1px_2px_rgba(255,255,255,0.85)]">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#0F7B7A]" />
                  <span>文化关键词</span>
                </span>
                <span className="text-[11px] font-medium text-[#4E6B69]">
                  点击单词听英音 · 星标收藏进生词本
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {slide.keyWords.map((kw, i) => {
                  const isFaved = !!favedWords[kw.word];
                  const isPlaying = playingWord === kw.word;

                  return (
                    <div
                      key={i}
                      className={`relative rounded-xl border transition-colors ${
                        isPlaying
                          ? "bg-[#E7F2EF]/60 border-[#0F7B7A]"
                          : isFaved
                          ? "bg-[#F3FAF8]/60 border-[#F2A93B]"
                          : "bg-white/60 border-[#D3E4DE] hover:border-[#0F7B7A]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handlePlayKeyword(kw.word)}
                        aria-label={`朗读关键词 ${kw.word}`}
                        className="w-full text-left p-2.5 pr-8 space-y-0.5 rounded-xl cursor-pointer [text-shadow:0_1px_1px_rgba(255,255,255,0.75)]"
                      >
                        <div className="flex items-center gap-1 font-bold text-xs text-[#123B3C]">
                          <span className="truncate">{kw.word}</span>
                          <Volume2
                            className={`w-3 h-3 shrink-0 ${
                              isPlaying ? "text-[#0F7B7A] animate-pulse" : "text-[#4E6B69]"
                            }`}
                          />
                        </div>
                        <div className="text-[10px] font-mono text-[#0F7B7A] truncate">
                          {kw.ipa}
                        </div>
                        <div className="text-[10px] text-[#4E6B69] truncate">
                          {kw.zh}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleToggleKeywordFav(e, kw.word)}
                        aria-pressed={isFaved}
                        aria-label={isFaved ? `取消收藏 ${kw.word}` : `收藏 ${kw.word} 到生词本`}
                        title={isFaved ? "已收藏至生词本（点击移除）" : "收藏到生词本"}
                        className={`absolute top-1.5 right-1.5 size-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                          isFaved
                            ? "bg-[#F2A93B]/20 text-[#96690A] border border-[#F2A93B]/50"
                            : "text-[#4E6B69] hover:text-[#0F7B7A] hover:bg-[#F3FAF8]"
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFaved ? "fill-[#F2A93B] text-[#F2A93B]" : ""
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 互动小百科趣味测验 (3 题依次作答) */}
      {currentQuestion && (
        <div className="bg-white border border-[#D3E4DE] rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#0F7B7A]" />
              <h3 className="font-extrabold text-base text-[#123B3C]">
                文化小测 · 收集旅行邮戳
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span
                data-testid="world-quiz-progress"
                className="text-xs font-bold text-[#0F7B7A] bg-[#F3FAF8] border border-[#D3E4DE] px-3 py-1 rounded-full tabular-nums"
              >
                第 {currentQuizIdx + 1}/{quizQuestions.length} 题
              </span>
              {isPassed && (
                <span className="flex items-center gap-1 text-xs font-bold text-[#0A5E5D] bg-[#E7F2EF] border border-[#D3E4DE] px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0F7B7A]" />
                  已打卡
                </span>
              )}
            </div>
          </div>

          <p className="text-sm font-semibold text-[#123B3C]">
            {currentQuestion.question}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.options.map((opt, i) => {
              const isWrong = wrongOptions.includes(i);
              const isCorrect = i === currentQuestion.correctIndex;
              const isDisabled = questionSolved || isWrong;

              let btnStyle =
                "bg-[#F3FAF8] border-[#D3E4DE] hover:bg-[#E7F2EF] hover:border-[#0F7B7A] text-[#123B3C] cursor-pointer";
              if (questionSolved && isCorrect) {
                btnStyle = "bg-emerald-600 text-white border-emerald-600 shadow-md";
              } else if (isWrong) {
                btnStyle = "bg-rose-500 text-white border-rose-500";
              }

              return (
                <button
                  key={i}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectOption(i)}
                  className={`p-4 rounded-2xl border font-bold text-sm text-left transition-all ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        (questionSolved && isCorrect) || isWrong
                          ? "bg-white/25 text-white"
                          : "bg-white border border-[#D3E4DE] text-[#123B3C]"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {wrongOptions.length > 0 && !questionSolved && (
            <div className="p-4 rounded-2xl bg-[#F3FAF8] border border-[#D3E4DE] text-xs text-[#4E6B69] flex items-center gap-2 animate-in fade-in">
              <span className="text-base">🔍</span>
              <span>
                {currentQuestion.kind === "reading"
                  ? "答案就在短文中，再读一遍试试。"
                  : "再想想哦，可以在上方文化关键词或句子中查词确认。"}
              </span>
            </div>
          )}

          {questionSolved && (
            <div className="p-4 rounded-2xl bg-[#F3FAF8] border border-[#D3E4DE] text-xs text-[#123B3C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2 leading-relaxed">
                <span className="text-base shrink-0">💡</span>
                <span>{currentQuestion.explanation}</span>
              </div>
              {currentQuizIdx < quizQuestions.length - 1 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNextQuestion}
                  className="rounded-xl bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white font-bold shrink-0 gap-1"
                >
                  <span>下一题</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 点词查词浮层卡 */}
      {selectedWordInfo && (
        <WordCard
          word={selectedWordInfo.word}
          vocabMap={keywordVocabMap}
          book="world"
          chapter={chapterKey || slide.id}
          sentenceEn={sentences[selectedWordInfo.sentIdx]}
          anchorRect={selectedWordInfo.anchorRect}
          onFavChange={syncKeywordFavedState}
          onClose={() => setSelectedWordInfo(null)}
        />
      )}

      {/* 盖章通关弹窗 */}
      {showStampModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white border border-[#D3E4DE] rounded-3xl shadow-2xl p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
            <button
              type="button"
              onClick={() => setShowStampModal(false)}
              aria-label="关闭弹窗"
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#4E6B69] hover:text-[#123B3C] hover:bg-[#F3FAF8] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#0F7B7A] to-[#0A5E5D] text-white flex items-center justify-center text-5xl mx-auto shadow-xl shadow-[#0F7B7A]/25 animate-bounce">
              📮
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-[#123B3C]">
                打卡成功！
              </h2>
              <p className="text-sm text-[#4E6B69] leading-relaxed">
                已完成【{slide.title}】文化阅读，旅行邮戳已存入护照。
              </p>
            </div>

            <div className="bg-[#F3FAF8] border border-[#D3E4DE] rounded-2xl p-4 flex items-center justify-center gap-3 text-[#96690A] font-extrabold text-lg">
              <Coins className="w-6 h-6 text-[#F2A93B]" />
              <span>获得 +10 旅行金币</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => navigate("/world")}
                className="flex-1 rounded-2xl border-[#D3E4DE] text-[#123B3C] hover:bg-[#F3FAF8]"
              >
                返回列表
              </Button>
              {nextUncollectedSlide && (
                <Button
                  onClick={() => navigate(`/world/${nextUncollectedSlide.id}`)}
                  className="flex-1 rounded-2xl bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white font-bold"
                >
                  下一站 →
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
