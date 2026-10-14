import { useState, useContext, useRef, useEffect, useMemo } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  toast,
} from "@renderer/components/ui";
import {
  BookOpenIcon,
  HeadphonesIcon,
  Volume2Icon,
  PauseIcon,
  PlayIcon,
  SparklesIcon,
  MicIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  StarIcon,
  ClockIcon,
  SearchIcon,
  CheckCircle2Icon,
  BookMarkedIcon,
  LayersIcon,
  ExternalLinkIcon,
  EyeIcon,
  RotateCcwIcon,
  Columns2Icon,
  Maximize2Icon,
  XIcon,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppSettingsProviderContext } from "@renderer/context";

export interface OxfordPage {
  page: number;
  image: string;
  sentenceEn: string;
  sentenceZh: string;
  audioStart?: number;
  audioEnd?: number;
  ttsAudioUrl?: string;
  tip?: string;
}

export interface OxfordStory {
  id: string;
  slug: string;
  title: string;
  stageId: string;
  level: string;
  coverEmoji: string;
  coverImage: string;
  audioUrl: string;
  sentenceEn: string;
  sentenceZh: string;
  tip: string;
  pageCount: number;
  pages: OxfordPage[];
}

// 智能长文本分句工具（按句号、感叹号、问号或换行拆分）
export const splitTextIntoSentences = (text: string): string[] => {
  if (!text) return [];
  const raw = text
    .split(/(?<=[.!?。！？\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("【") && !s.startsWith("["));
  return raw.length > 0 ? raw : [text.trim()];
};

// 兜底本地绘本（保障断网环境可用，使用真实资源路径）
const FALLBACK_STORIES: OxfordStory[] = [
  {
    id: "ox_home_02_2a-poor-old-rabbit",
    slug: "2a-poor-old-rabbit",
    title: "[家庭版 L2] 2A Poor Old Rabbit",
    stageId: "home/02",
    level: "🌱 家庭版 L2 拼读",
    coverEmoji: "🌱",
    coverImage: "https://app.sunnybridge.qzz.io/oxford/home/02/2a-poor-old-rabbit/cover.webp",
    audioUrl: "https://app.sunnybridge.qzz.io/oxford/home/02/2a-poor-old-rabbit/audio.mp3",
    sentenceEn: "Floppy saw a toy rabbit. Poor old rabbit, said Floppy.",
    sentenceZh: "Floppy 看到了一只玩具小兔。“可怜的小老兔，”Floppy 叫道。",
    tip: "全书 20 页 · 纯正母语原声伴读",
    pageCount: 20,
    pages: [
      {
        page: 1,
        image: "https://app.sunnybridge.qzz.io/oxford/home/02/2a-poor-old-rabbit/pages/01.webp",
        sentenceEn: "Lesson 7 Poor old Rabbit.",
        sentenceZh: "第 7 课 可怜的小老兔",
        audioStart: 0.0,
        audioEnd: 3.5,
      },
      {
        page: 2,
        image: "https://app.sunnybridge.qzz.io/oxford/home/02/2a-poor-old-rabbit/pages/02.webp",
        sentenceEn: "【观察与亲子导读】观察插画细节，引导孩子预测故事发展。",
        sentenceZh: "【观察与亲子导读】观察插画细节，引导孩子预测故事发展。",
      },
      {
        page: 3,
        image: "https://app.sunnybridge.qzz.io/oxford/home/02/2a-poor-old-rabbit/pages/03.webp",
        sentenceEn: "Floppy saw a toy rabbit.",
        sentenceZh: "Floppy 看到了一个玩具小兔子。",
        audioStart: 3.5,
        audioEnd: 6.8,
      },
      {
        page: 4,
        image: "https://app.sunnybridge.qzz.io/oxford/home/02/2a-poor-old-rabbit/pages/04.webp",
        sentenceEn: "Poor old rabbit, said Floppy.",
        sentenceZh: "可怜的小老兔子，Floppy 说。",
        audioStart: 6.8,
        audioEnd: 11.2,
      },
    ],
  },
  {
    id: "ox_home_01_1a-funny-fish",
    slug: "1a-funny-fish",
    title: "[家庭版 L1] 1A Funny Fish",
    stageId: "home/01",
    level: "🌱 家庭版 L1 启蒙",
    coverEmoji: "🌱",
    coverImage: "https://app.sunnybridge.qzz.io/oxford/home/01/1a-funny-fish/cover.webp",
    audioUrl: "https://app.sunnybridge.qzz.io/oxford/home/01/1a-funny-fish/audio.mp3",
    sentenceEn: "Look at the funny little fish swimming in the water.",
    sentenceZh: "看那条在水里欢快游弋的有趣小鱼。",
    tip: "全书 13 页 · 纯正母语原声伴读",
    pageCount: 13,
    pages: [
      {
        page: 1,
        image: "https://app.sunnybridge.qzz.io/oxford/home/01/1a-funny-fish/pages/01.webp",
        sentenceEn: "Funny fish.",
        sentenceZh: "滑稽的小鱼。",
        audioStart: 0.0,
        audioEnd: 3.5,
      },
    ],
  },
];

export interface ShelfMeta {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  stages: string[];
  stagesText: string;
  ageBadge: string;
  desc: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  badgeBg: string;
  spineColor: string;
}

const SHELVES: ShelfMeta[] = [
  {
    id: "home",
    name: "牛津树家庭版 · 亲子启蒙伴读",
    shortName: "家庭版 (L1-L5)",
    emoji: "🌱",
    stages: ["home/01", "home/02", "home/03", "home/04", "home/05"],
    stagesText: "Stage 1 ~ 5",
    ageBadge: "适合 3~7 岁",
    desc: "亲子日常场景 · 基础生活拼读 · 磨耳朵与趣味韵律",
    accentBg: "from-emerald-500/10 via-teal-500/5 to-transparent",
    accentBorder: "border-emerald-300/40 dark:border-emerald-700/40",
    accentText: "text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-400/30",
    spineColor: "border-l-emerald-500",
  },
  {
    id: "school_basic",
    name: "学校版 · 基础拼读与校园日常",
    shortName: "校园拼读 (L1-L4)",
    emoji: "📖",
    stages: ["school/01", "school/02", "school/03", "school/04"],
    stagesText: "Stage 1 ~ 4",
    ageBadge: "适合 4~8 岁",
    desc: "从无字书到第一句 · 自然拼读进阶 · 校园日常短句看图精读",
    accentBg: "from-sky-500/10 via-blue-500/5 to-transparent",
    accentBorder: "border-sky-300/40 dark:border-sky-700/40",
    accentText: "text-sky-700 dark:text-sky-300",
    badgeBg: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-400/30",
    spineColor: "border-l-sky-500",
  },
  {
    id: "school_magic",
    name: "学校版 · 经典魔法钥匙大冒险",
    shortName: "魔法钥匙 (L5-L9)",
    emoji: "🗝️",
    stages: ["school/05", "school/06", "school/07", "school/08", "school/09"],
    stagesText: "Stage 5 ~ 9",
    ageBadge: "适合 7~11 岁",
    desc: "牛津树核心王牌 · 魔法钥匙发光穿越 · 经典章回冒险故事",
    accentBg: "from-amber-500/10 via-orange-500/5 to-transparent",
    accentBorder: "border-amber-300/40 dark:border-amber-700/40",
    accentText: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-400/30",
    spineColor: "border-l-amber-500",
  },
  {
    id: "school_high",
    name: "学校版 · 高阶百科与长篇素养",
    shortName: "高阶素养 (L10-L16)",
    emoji: "🚀",
    stages: ["school/10", "school/11", "school/12", "school/13", "school/14", "school/15", "school/16"],
    stagesText: "Stage 10 ~ 16",
    ageBadge: "适合 9~14 岁",
    desc: "真实世界探秘 · 科学自然百科 · 名著改编与母语级长篇素养",
    accentBg: "from-purple-500/10 via-fuchsia-500/5 to-transparent",
    accentBorder: "border-purple-300/40 dark:border-purple-700/40",
    accentText: "text-purple-700 dark:text-purple-300",
    badgeBg: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-400/30",
    spineColor: "border-l-purple-500",
  },
];

const SERIES_CATEGORIES = [
  { id: "all", name: "全景书架 (4大书架)", emoji: "📚", desc: "牛津阅读树完整全量文库" },
  { id: "home", name: "家庭版 (L1-L5)", emoji: "🌱", desc: "亲子日常与启蒙磨耳朵 · 30 册" },
  { id: "school_basic", name: "校园拼读 (L1-L4)", emoji: "📖", desc: "自然拼读与校园生活 · 156 册" },
  { id: "school_magic", name: "魔法钥匙 (L5-L9)", emoji: "🗝️", desc: "牛津树招牌核心穿越冒险 · 88 册" },
  { id: "school_high", name: "高阶素养 (L10-L16)", emoji: "🚀", desc: "百科探索与经典长篇 · 70 册" },
];

const BookCard = ({
  book,
  onSelectBook,
  spineColor = "border-l-amber-500",
}: {
  book: OxfordStory;
  onSelectBook: (book: OxfordStory) => void;
  spineColor?: string;
}) => {
  return (
    <div
      onClick={() => onSelectBook(book)}
      className={`group relative flex flex-col justify-between p-3 rounded-3xl bg-card border border-border/60 hover:border-amber-400/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 cursor-pointer overflow-hidden ${spineColor} border-l-[5px]`}
    >
      <div className="space-y-2.5">
        {/* 封面图片：3D 精装拟物感 · 竖版 3:4 适配原版绘本完整封面 */}
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted/20 border border-border/40 shadow-inner flex items-center justify-center">
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (book.pages && book.pages[0]?.image && target.src !== book.pages[0].image) {
                target.src = book.pages[0].image;
              } else {
                target.src = "/assets/qiaobao_sunny240.png";
              }
            }}
          />

          {/* 页码胶囊 */}
          <div className="absolute bottom-2 right-2 bg-black/55 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
            📖 {book.pageCount} 页
          </div>
        </div>

        {/* 书名与首句正文 */}
        <div className="space-y-1 pb-1">
          <h3 className="font-black text-sm text-foreground group-hover:text-amber-600 transition-colors line-clamp-1 tracking-tight">
            {book.title}
          </h3>
          <p className="text-[11px] text-muted-foreground line-clamp-1 italic font-sans">
            {book.sentenceEn || "Pure British authentic reading"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allStories, setAllStories] = useState<OxfordStory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSeries, setActiveSeries] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // 绘本封面与模式选择弹窗 (图2设计)
  const [previewModalBook, setPreviewModalBook] = useState<OxfordStory | null>(null);

  // 各书架折叠/展开状态（默认显示精选4本，可一键展开全部）
  const [expandedShelves, setExpandedShelves] = useState<Record<string, boolean>>({
    home: false,
    school_basic: false,
    school_magic: false,
    school_high: false,
  });

  const toggleShelf = (shelfId: string) => {
    setExpandedShelves((prev) => ({
      ...prev,
      [shelfId]: !prev[shelfId],
    }));
  };

  // 伴读试听控制器
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  // 移动端视口检测（宽度 < 768px 为手机移动端）
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    return typeof window !== "undefined" && window.innerWidth < 768;
  });

  // 大屏绘本阅读器状态
  const [activeReadingBook, setActiveReadingBook] = useState<OxfordStory | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isSpreadMode, setIsSpreadMode] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return false; // 移动端默认单页高清大图模式
    }
    return true; // 宽屏/桌面端默认双页对开模式
  });
  const [showZhTranslation, setShowZhTranslation] = useState<boolean>(true);

  // 监听屏幕尺寸变化：手机端自动单页模式
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileScreen(mobile);
      if (mobile) {
        setIsSpreadMode(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 双模式阅读器状态
  // "page_tts" (模式2: 逐页精读·Sonia伴读) | "full_audio" (模式1: 原声连播·自主翻页)
  const [readingMode, setReadingMode] = useState<"page_tts" | "full_audio">("page_tts");
  // 默认关闭自动朗读（取消绘本默认自动朗读，让用户按需点击喇叭或自主阅读）
  const [autoPlayPageAudio, setAutoPlayPageAudio] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("sb_auto_play_page_audio");
      if (saved !== null) return saved === "true";
    } catch (_) {}
    return false;
  });

  // 模式2：Sonia 精准逐页音频状态
  const [pageAudioPlaying, setPageAudioPlaying] = useState<boolean>(false);
  const [playingPageNum, setPlayingPageNum] = useState<number | null>(null);
  const pageAudioRef = useRef<HTMLAudioElement | null>(null);
  const pageAudioChainTimerRef = useRef<any>(null);
  const activeBookRef = useRef<OxfordStory | null>(activeReadingBook);
  activeBookRef.current = activeReadingBook;
  const currentPageIndexRef = useRef<number>(currentPageIndex);
  currentPageIndexRef.current = currentPageIndex;
  const isSpreadModeRef = useRef<boolean>(isSpreadMode);
  isSpreadModeRef.current = isSpreadMode;

  // 模式1：原版长音频状态
  const [fullAudioPlaying, setFullAudioPlaying] = useState<boolean>(false);
  const [fullAudioCurrentTime, setFullAudioCurrentTime] = useState<number>(0);
  const [fullAudioDuration, setFullAudioDuration] = useState<number>(0);
  const [fullAudioRate, setFullAudioRate] = useState<number>(1.0);
  const fullAudioRef = useRef<HTMLAudioElement | null>(null);

  // 查词与中英释义状态
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedWordTranslation, setSelectedWordTranslation] = useState<string | null>(null);
  const [selectedWordPhonetic, setSelectedWordPhonetic] = useState<string | null>(null);
  const [selectedWordLoading, setSelectedWordLoading] = useState<boolean>(false);
  const wordTranslationCacheRef = useRef<Record<string, { translation: string; phonetic: string }>>({});
  // 本地牛津核心字典缓存（秒出 0 延迟）
  const localOxfordDictRef = useRef<Record<string, [string, string]> | null>(null);

  // 异步预加载本地高频词典文件
  useEffect(() => {
    fetch("/assets/oxford_dict.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === "object") {
          localOxfordDictRef.current = data;
        }
      })
      .catch(() => {});
  }, []);

  // 高阶长文本智能分句跟读面板状态
  const [shadowSentenceModalData, setShadowSentenceModalData] = useState<{
    bookTitle: string;
    pageNum: number;
    fullText: string;
    sentences: string[];
  } | null>(null);

  // 1. 加载云端 344 册牛津全量绘本
  useEffect(() => {
    const loadOxfordLibrary = async () => {
      // 清理可能导致浏览器存储爆仓的旧大体积缓存键
      try {
        localStorage.removeItem("sb_oxford_library_cache_v1");
      } catch (_) {}

      // 优先从轻量缓存恢复首屏骨架（不含庞大 pages）
      try {
        const cachedSlim = localStorage.getItem("sb_oxford_slim_v2");
        if (cachedSlim) {
          const parsed = JSON.parse(cachedSlim);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAllStories(parsed);
            setLoading(false);
          }
        }
      } catch (_) {}

      try {
        const res = await fetch("https://app.sunnybridge.qzz.io/api/oxford/content?all=true");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.stories)) {
            // 过滤掉纯标题分割卡，提取纯书籍
            const pure = data.stories.filter(
              (s: any) => !String(s.id).startsWith("divider_") && s.pageCount > 0
            );
            if (pure.length > 0) {
              setAllStories(pure);
              setLoading(false);

              // 安全写入轻量元数据索引，绝不抛出 Quota 异常打断业务
              try {
                const slim = pure.map((b: any) => ({
                  id: b.id,
                  slug: b.slug,
                  title: b.title,
                  stageId: b.stageId,
                  level: b.level,
                  coverEmoji: b.coverEmoji,
                  coverImage: b.coverImage,
                  audioUrl: b.audioUrl,
                  sentenceEn: b.sentenceEn,
                  sentenceZh: b.sentenceZh,
                  tip: b.tip,
                  pageCount: b.pageCount,
                }));
                localStorage.setItem("sb_oxford_slim_v2", JSON.stringify(slim));
              } catch (_) {}
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Fetch oxford library network error:", err);
      } finally {
        setLoading(false);
      }

      // 仅在网络和缓存完全没有数据时，启动离线兜底
      setAllStories((prev) => (prev.length > 0 ? prev : FALLBACK_STORIES));
    };

    loadOxfordLibrary();
  }, []);

  // 2. 依据大类归类筛选
  const categoryFilteredBooks = useMemo(() => {
    return allStories.filter((book) => {
      const stage = book.stageId || "";
      if (activeSeries === "home") {
        return stage.startsWith("home/");
      } else if (activeSeries === "school_basic") {
        return (
          stage === "school/01" ||
          stage === "school/02" ||
          stage === "school/03" ||
          stage === "school/04"
        );
      } else if (activeSeries === "school_magic") {
        return (
          stage === "school/05" ||
          stage === "school/06" ||
          stage === "school/07" ||
          stage === "school/08" ||
          stage === "school/09"
        );
      } else if (activeSeries === "school_high") {
        if (!stage.startsWith("school/")) return false;
        const num = parseInt(stage.split("/")[1] || "0", 10);
        return num >= 10 && num <= 16;
      }
      return true;
    });
  }, [allStories, activeSeries]);

  // 3. 计算当前类别下所有可选阶段 Pills
  const availableStages = useMemo(() => {
    const stageMap = new Map<string, number>();
    categoryFilteredBooks.forEach((b) => {
      const st = b.stageId;
      if (st) {
        stageMap.set(st, (stageMap.get(st) || 0) + 1);
      }
    });

    const list = Array.from(stageMap.entries()).map(([stageId, count]) => {
      const isHome = stageId.startsWith("home");
      const num = parseInt(stageId.split("/")[1] || "1", 10);
      const label = `${isHome ? "家庭版" : "学校版"} L${num}`;
      return { stageId, count, label };
    });

    list.sort((a, b) => a.stageId.localeCompare(b.stageId));
    return list;
  }, [categoryFilteredBooks]);

  // 4. 二次过滤：阶段 + 关键词搜索
  const displayedBooks = useMemo(() => {
    return categoryFilteredBooks.filter((book) => {
      if (selectedStage !== "all" && book.stageId !== selectedStage) {
        return false;
      }
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const t = (book.title || "").toLowerCase();
        const en = (book.sentenceEn || "").toLowerCase();
        const zh = (book.sentenceZh || "").toLowerCase();
        if (!t.includes(kw) && !en.includes(kw) && !zh.includes(kw)) {
          return false;
        }
      }
      return true;
    });
  }, [categoryFilteredBooks, selectedStage, searchKeyword]);

  // 切换系列时重置阶段选择
  const handleSelectSeries = (seriesId: string) => {
    setActiveSeries(seriesId);
    setSelectedStage("all");
  };

  // 试听原声音频
  const handlePlaySampleAudio = (audioUrl: string) => {
    if (playingAudioUrl === audioUrl) {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
        sampleAudioRef.current = null;
      }
      setPlayingAudioUrl(null);
      return;
    }

    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
    }

    const audio = new Audio(audioUrl);
    sampleAudioRef.current = audio;
    setPlayingAudioUrl(audioUrl);

    audio.onended = () => {
      setPlayingAudioUrl(null);
      sampleAudioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingAudioUrl(null);
      sampleAudioRef.current = null;
      toast.error("音频加载超时，请重试");
    };
    audio.play().catch(() => {
      setPlayingAudioUrl(null);
    });
  };

  // 格式化音频秒数
  const formatAudioTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // 停止所有正在播放的阅读器音频（关闭弹窗或切换绘本时调用）
  const stopAllReadingAudios = () => {
    if (pageAudioChainTimerRef.current) {
      clearTimeout(pageAudioChainTimerRef.current);
      pageAudioChainTimerRef.current = null;
    }
    if (pageAudioRef.current) {
      pageAudioRef.current.pause();
      pageAudioRef.current = null;
    }
    if (fullAudioRef.current) {
      fullAudioRef.current.pause();
      fullAudioRef.current = null;
    }
    setPageAudioPlaying(false);
    setPlayingPageNum(null);
    setFullAudioPlaying(false);
    setFullAudioCurrentTime(0);
    setFullAudioDuration(0);
  };

  // 仅停止单页逐页点读/Sonia伴读音频，不中断全书原版长音频(原声连读)
  const stopPageTtsAudioOnly = () => {
    if (pageAudioChainTimerRef.current) {
      clearTimeout(pageAudioChainTimerRef.current);
      pageAudioChainTimerRef.current = null;
    }
    if (pageAudioRef.current) {
      pageAudioRef.current.pause();
      pageAudioRef.current = null;
    }
    setPageAudioPlaying(false);
    setPlayingPageNum(null);
  };

  // 过滤占位提示语（如 "观察插画细节"、"《...》第 X 页英音原声伴读" 等非实质译文）
  const isMeaningfulTranslation = (zh: string | undefined) => {
    if (!zh) return false;
    const t = zh.trim();
    if (!t) return false;
    if (
      t.includes("原声伴读") ||
      t.includes("英音原声") ||
      t.includes("观察插画") ||
      t.includes("导读") ||
      t.includes("伴读") ||
      t.includes("细节") ||
      t.includes("重点词汇")
    ) {
      return false;
    }
    if (t.startsWith("《") && t.includes("》")) return false;
    if (t.startsWith("【") && t.includes("】")) return false;
    return true;
  };

  // 模式2：播放指定页的精准 Sonia 神经伴读音频（逐页精读：独立单页朗读，不自动跨页连读）
  const playPageTtsAudio = (pageObj: OxfordPage | undefined) => {
    if (!pageObj) return;

    // 如果该页当前正在朗读，再次点击则暂停
    if (pageAudioRef.current && playingPageNum === pageObj.page) {
      if (pageAudioChainTimerRef.current) {
        clearTimeout(pageAudioChainTimerRef.current);
        pageAudioChainTimerRef.current = null;
      }
      pageAudioRef.current.pause();
      pageAudioRef.current = null;
      setPageAudioPlaying(false);
      setPlayingPageNum(null);
      return;
    }

    // 清理之前的定时器与正在播放的音频
    if (pageAudioChainTimerRef.current) {
      clearTimeout(pageAudioChainTimerRef.current);
      pageAudioChainTimerRef.current = null;
    }
    if (pageAudioRef.current) {
      pageAudioRef.current.pause();
      pageAudioRef.current = null;
    }

    const text = pageObj.sentenceEn;
    const isCleanText = text && !text.startsWith("【") && !text.startsWith("[");

    if (!isCleanText) {
      setPageAudioPlaying(false);
      setPlayingPageNum(null);
      return;
    }

    // 暂停全书原声长音频
    if (fullAudioRef.current) {
      fullAudioRef.current.pause();
      setFullAudioPlaying(false);
    }

    let url = pageObj.ttsAudioUrl;
    if (!url) {
      const clean = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "").trim();
      url = `https://app.sunnybridge.qzz.io/api/ai/tts?text=${encodeURIComponent(clean)}&voice=en-GB-SoniaNeural&rate=-5%`;
    }

    const audio = new Audio(url);
    pageAudioRef.current = audio;
    setPageAudioPlaying(true);
    setPlayingPageNum(pageObj.page);

    audio.onended = () => {
      setPageAudioPlaying(false);
      setPlayingPageNum(null);
    };
    audio.onerror = (e) => {
      console.warn("TTS audio load error:", e);
      setPageAudioPlaying(false);
      setPlayingPageNum(null);
    };
    audio.play().catch((err) => {
      console.warn("TTS audio play error:", err);
      setPageAudioPlaying(false);
      setPlayingPageNum(null);
    });
  };

  // 模式1：原版整本长音频播放/暂停
  const toggleFullAudio = () => {
    if (!activeReadingBook?.audioUrl) {
      toast.info("当前绘本未配置原声音频");
      return;
    }

    // 暂停逐页点读音频
    if (pageAudioRef.current) {
      pageAudioRef.current.pause();
      pageAudioRef.current = null;
      setPageAudioPlaying(false);
      setPlayingPageNum(null);
    }

    const targetUrl = activeReadingBook.audioUrl;
    const currentSrc = fullAudioRef.current?.src || "";
    // 判断已存在的 audio 是否属于当前绘本（兼容浏览器完整 URL 补全）
    const isSameBook = Boolean(
      fullAudioRef.current &&
      currentSrc &&
      (currentSrc === targetUrl || currentSrc.includes(activeReadingBook.slug))
    );

    if (!isSameBook) {
      if (fullAudioRef.current) {
        fullAudioRef.current.pause();
        fullAudioRef.current = null;
      }
      const audio = new Audio(targetUrl);
      fullAudioRef.current = audio;
      audio.playbackRate = fullAudioRate;
      audio.ontimeupdate = () => {
        setFullAudioCurrentTime(audio.currentTime);
      };
      audio.onloadedmetadata = () => {
        setFullAudioDuration(audio.duration || 0);
      };
      audio.onended = () => {
        setFullAudioPlaying(false);
      };
      audio.onerror = () => {
        setFullAudioPlaying(false);
        toast.error("原版长音频加载失败，请检查网络");
      };
    }

    if (fullAudioPlaying) {
      fullAudioRef.current?.pause();
      setFullAudioPlaying(false);
    } else {
      fullAudioRef.current?.play().then(() => {
        setFullAudioPlaying(true);
      }).catch((e) => {
        console.warn("Full audio play error:", e);
        setFullAudioPlaying(false);
      });
    }
  };

  const handleSeekFullAudio = (time: number) => {
    if (fullAudioRef.current) {
      fullAudioRef.current.currentTime = time;
      setFullAudioCurrentTime(time);
    }
  };

  const handleToggleRate = () => {
    const rates = [1.0, 1.25, 0.8];
    const nextIdx = (rates.indexOf(fullAudioRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setFullAudioRate(nextRate);
    if (fullAudioRef.current) {
      fullAudioRef.current.playbackRate = nextRate;
    }
  };

  // 切换阅读模式
  const handleSwitchReadingMode = (mode: "page_tts" | "full_audio") => {
    setReadingMode(mode);
    if (mode === "full_audio") {
      if (pageAudioRef.current) {
        pageAudioRef.current.pause();
        pageAudioRef.current = null;
        setPageAudioPlaying(false);
        setPlayingPageNum(null);
      }
      if (activeReadingBook?.audioUrl) {
        const targetUrl = activeReadingBook.audioUrl;
        const currentSrc = fullAudioRef.current?.src || "";
        const isSameBook = Boolean(
          fullAudioRef.current &&
          currentSrc &&
          (currentSrc === targetUrl || currentSrc.includes(activeReadingBook.slug))
        );
        if (!isSameBook) {
          if (fullAudioRef.current) {
            fullAudioRef.current.pause();
            fullAudioRef.current = null;
          }
          const audio = new Audio(targetUrl);
          fullAudioRef.current = audio;
          audio.playbackRate = fullAudioRate;
          audio.ontimeupdate = () => {
            setFullAudioCurrentTime(audio.currentTime);
          };
          audio.onloadedmetadata = () => {
            setFullAudioDuration(audio.duration || 0);
          };
          audio.onended = () => {
            setFullAudioPlaying(false);
          };
          audio.onerror = () => {
            setFullAudioPlaying(false);
          };
        }
      }
    } else {
      if (fullAudioRef.current) {
        fullAudioRef.current.pause();
        setFullAudioPlaying(false);
      }
      if (autoPlayPageAudio && activeReadingBook) {
        const p = activeReadingBook.pages?.[currentPageIndex];
        if (p) setTimeout(() => playPageTtsAudio(p), 150);
      }
    }
  };

  // 开启大屏沉浸阅读器（支持指定起始页 initialPage）
  const handleOpenBookReader = (
    book: OxfordStory,
    initialMode: "page_tts" | "full_audio" = "page_tts",
    initialPage = 0
  ) => {
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
      setPlayingAudioUrl(null);
    }
    stopAllReadingAudios();

    let target = book;
    if (!book.pages || book.pages.length === 0) {
      const found = allStories.find((s) => s.id === book.id && s.pages && s.pages.length > 0);
      if (found) target = found;
    }
    setActiveReadingBook(target);
    setCurrentPageIndex(initialPage);
    currentPageIndexRef.current = initialPage;
    setSelectedWord(null);
    setReadingMode(initialMode);

    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSpreadMode(false);
      isSpreadModeRef.current = false;
    }

    if (initialMode === "full_audio") {
      if (target.audioUrl) {
        if (fullAudioRef.current) {
          fullAudioRef.current.pause();
          fullAudioRef.current = null;
        }
        const audio = new Audio(target.audioUrl);
        fullAudioRef.current = audio;
        audio.playbackRate = fullAudioRate;
        audio.ontimeupdate = () => {
          setFullAudioCurrentTime(audio.currentTime);
        };
        audio.onloadedmetadata = () => {
          setFullAudioDuration(audio.duration || 0);
        };
        audio.onended = () => {
          setFullAudioPlaying(false);
        };
        audio.onerror = () => {
          setFullAudioPlaying(false);
          toast.error("原版长音频加载失败，请检查网络");
        };
        audio.play().then(() => {
          setFullAudioPlaying(true);
        }).catch((e) => {
          console.warn("Full audio play error:", e);
          setFullAudioPlaying(false);
        });
      }
    } else {
      // 模式2逐页精读，若开启自动朗读则立即播放指定页
      if (autoPlayPageAudio && target.pages?.[initialPage]) {
        pageAudioChainTimerRef.current = setTimeout(() => playPageTtsAudio(target.pages[initialPage]), 300);
      }
    }
  };

  // 实时记录当前阅读绘本、页码与模式到 sessionStorage，确保任意跳转或意外刷新都能精准返回
  useEffect(() => {
    if (activeReadingBook) {
      try {
        sessionStorage.setItem(
          "sb_last_read",
          JSON.stringify({
            bookId: activeReadingBook.id,
            slug: activeReadingBook.slug,
            pageNum: currentPageIndex + 1,
            mode: readingMode,
            showShadowModal: Boolean(shadowSentenceModalData),
          })
        );
      } catch (_) {}
    }
  }, [activeReadingBook, currentPageIndex, readingMode, shadowSentenceModalData]);

  // 从 URL 参数 (?bookId=...&page=...&shadowModal=true) 或 sessionStorage 恢复阅读状态
  const lastRestoredKeyRef = useRef<string>("");
  useEffect(() => {
    if (allStories.length === 0) return;

    let targetBookId = searchParams.get("bookId");
    let targetPageStr = searchParams.get("page");
    let targetShadowModal = searchParams.get("shadowModal") === "true";

    if (!targetBookId) {
      try {
        const saved = sessionStorage.getItem("sb_last_read");
        if (saved) {
          const parsed = JSON.parse(saved);
          targetBookId = parsed.bookId || parsed.slug;
          targetPageStr = String(parsed.pageNum || 1);
          targetShadowModal = Boolean(parsed.showShadowModal);
        }
      } catch (_) {}
    }

    if (targetBookId) {
      const book = allStories.find(
        (b) =>
          b.id === targetBookId ||
          b.slug === targetBookId ||
          b.title === targetBookId ||
          b.title.includes(targetBookId)
      );

      // 若当前只有封面元数据，等待全量 pages 加载后再执行恢复，确保页码与分句内容完备
      if (!book || !book.pages || book.pages.length === 0) {
        return;
      }

      const restoreKey = `${targetBookId}_${targetPageStr}_${targetShadowModal}_${book.pages.length}`;
      if (lastRestoredKeyRef.current === restoreKey) return;
      lastRestoredKeyRef.current = restoreKey;

      const pageIdx = targetPageStr ? Math.max(0, parseInt(targetPageStr, 10) - 1) : 0;
      handleOpenBookReader(book, "page_tts", pageIdx);

      if (targetShadowModal) {
        setTimeout(() => {
          const p = book.pages?.[pageIdx];
          if (p?.sentenceEn) {
            const clean = p.sentenceEn.trim();
            const sents = splitTextIntoSentences(clean);
            setShadowSentenceModalData({
              bookTitle: book.title,
              pageNum: pageIdx + 1,
              fullText: clean,
              sentences: sents.length > 1 ? sents : [clean],
            });
          }
        }, 350);
      }
    }
  }, [allStories, searchParams]);

  // 翻页逻辑
  const handlePrevPage = () => {
    const step = isSpreadMode ? 2 : 1;
    const nextIdx = Math.max(0, currentPageIndex - step);
    if (nextIdx === currentPageIndex) return;

    // 清理逐页点读音频与连读定时器
    stopPageTtsAudioOnly();

    // 仅在非原声连读模式下停止全书长音频；原声连读模式(full_audio)下翻页音频连贯播放，不中断
    if (readingMode !== "full_audio") {
      if (fullAudioRef.current && fullAudioPlaying) {
        fullAudioRef.current.pause();
        setFullAudioPlaying(false);
      }
    }

    setCurrentPageIndex(nextIdx);
    currentPageIndexRef.current = nextIdx;
    setSelectedWord(null);
    setSelectedWordTranslation(null);

    // 模式2逐页精读且开启自动伴读时，翻页自动朗读新页（仅朗读新页）
    if (readingMode === "page_tts" && autoPlayPageAudio && activeReadingBook) {
      const p = activeReadingBook.pages?.[nextIdx];
      if (p) {
        pageAudioChainTimerRef.current = setTimeout(() => playPageTtsAudio(p), 200);
      }
    }
  };

  const handleNextPage = () => {
    if (!activeReadingBook) return;
    const max = (activeReadingBook.pages?.length || 1) - 1;
    const step = isSpreadMode ? 2 : 1;
    const nextIdx = Math.min(max, currentPageIndex + step);
    if (nextIdx === currentPageIndex) return;

    // 清理逐页点读音频与连读定时器
    stopPageTtsAudioOnly();

    // 仅在非原声连读模式下停止全书长音频；原声连读模式(full_audio)下翻页音频连贯播放，不中断
    if (readingMode !== "full_audio") {
      if (fullAudioRef.current && fullAudioPlaying) {
        fullAudioRef.current.pause();
        setFullAudioPlaying(false);
      }
    }

    setCurrentPageIndex(nextIdx);
    currentPageIndexRef.current = nextIdx;
    setSelectedWord(null);
    setSelectedWordTranslation(null);

    // 模式2逐页精读且开启自动伴读时，翻页自动朗读新页（仅朗读新页）
    if (readingMode === "page_tts" && autoPlayPageAudio) {
      const p = activeReadingBook.pages?.[nextIdx];
      if (p) {
        pageAudioChainTimerRef.current = setTimeout(() => playPageTtsAudio(p), 200);
      }
    }
  };

  // 键盘快捷键监听
  useEffect(() => {
    if (!activeReadingBook) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevPage();
      } else if (e.key === "ArrowRight") {
        handleNextPage();
      } else if (e.key === " " && e.target === document.body) {
        e.preventDefault();
        if (readingMode === "full_audio") {
          toggleFullAudio();
        } else {
          const curPageObj = activeReadingBook.pages?.[currentPageIndex];
          if (curPageObj) playPageTtsAudio(curPageObj);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeReadingBook, isSpreadMode, currentPageIndex, readingMode, autoPlayPageAudio]);

  // 点词发音与中英释义查询
  const handleWordClick = async (word: string) => {
    const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (!clean) return;
    setSelectedWord(clean);

    // 调用浏览器语音朗读发音
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = "en-US";
        utter.rate = 0.85;
        window.speechSynthesis.speak(utter);
      }
    } catch (e) {}

    // 1. 如果内存缓存中已有释义，直接瞬时展示 (0 延迟)
    if (wordTranslationCacheRef.current[clean]) {
      const cached = wordTranslationCacheRef.current[clean];
      setSelectedWordTranslation(cached.translation);
      setSelectedWordPhonetic(cached.phonetic);
      setSelectedWordLoading(false);
      return;
    }

    // 2. 如果本地牛津核心字典（1.9万高频词）收录，直接毫秒级秒出！
    if (localOxfordDictRef.current && localOxfordDictRef.current[clean]) {
      const [phonetic, trans] = localOxfordDictRef.current[clean];
      setSelectedWordPhonetic(phonetic || "");
      setSelectedWordTranslation(trans);
      setSelectedWordLoading(false);
      wordTranslationCacheRef.current[clean] = {
        translation: trans,
        phonetic: phonetic || "",
      };
      return;
    }

    // 3. 异步查询服务端 77 万词 ECDICT 词典库
    setSelectedWordTranslation(null);
    setSelectedWordPhonetic(null);
    setSelectedWordLoading(true);
    try {
      const curPageObj = activeReadingBook?.pages?.[currentPageIndex];
      const context = curPageObj?.sentenceEn || "";
      const url = `https://app.sunnybridge.qzz.io/api/dictionary?word=${encodeURIComponent(clean)}&context=${encodeURIComponent(context)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const trans = data.translation || (data.data && data.data.translation) || "";
        const phonetic = data.phonetic || data.pronunciation || "";
        const formatted = trans || "常用词汇";
        wordTranslationCacheRef.current[clean] = {
          translation: formatted,
          phonetic,
        };
        setSelectedWordTranslation(formatted);
        setSelectedWordPhonetic(phonetic);
      } else {
        setSelectedWordTranslation("常用词汇");
        setSelectedWordPhonetic("");
      }
    } catch (e) {
      setSelectedWordTranslation("常用词汇");
      setSelectedWordPhonetic("");
    } finally {
      setSelectedWordLoading(false);
    }
  };

  // 收藏到云端生词本
  const handleSaveToVocabulary = async (word: string) => {
    try {
      const curPageObj = activeReadingBook?.pages?.[currentPageIndex];
      const sentence = curPageObj?.sentenceEn || activeReadingBook?.title || "";

      const res = await fetch("https://app.sunnybridge.qzz.io/api/lookups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          pronunciation: selectedWordPhonetic || "",
          translation: selectedWordTranslation || "",
          context: sentence,
          source_type: "oxford_reader",
        }),
      });

      if (res.ok) {
        toast.success(`已收藏 “${word}” 到生词本 ⭐ 跨端同步已就绪`);
      } else {
        toast.success(`“${word}” 已在生词本中 ⭐`);
      }
    } catch (e) {
      toast.success(`已在本地收藏 “${word}” ⭐`);
    }
    setSelectedWord(null);
  };

  // 跳转到跟读纠音录音评测界面
  const handleGoToPronunciation = (sentence: string, pageNum?: number) => {
    stopAllReadingAudios();

    const currentBook = activeReadingBook;
    const curPageNum = pageNum || (currentPageIndex + 1);

    // 记录正在跟读的绘本和页码信息，以便后续无缝返回
    if (currentBook) {
      try {
        sessionStorage.setItem(
          "sb_last_read",
          JSON.stringify({
            bookId: currentBook.id,
            slug: currentBook.slug,
            pageNum: curPageNum,
            mode: readingMode,
            showShadowModal: true,
          })
        );
      } catch (_) {}
    }

    setActiveReadingBook(null);
    setShadowSentenceModalData(null);

    if (typeof document !== "undefined" && document.body) {
      document.body.style.pointerEvents = "auto";
    }

    const clean = (sentence || "")
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const audioParam = clean
      ? `https://app.sunnybridge.qzz.io/api/ai/tts?text=${encodeURIComponent(clean)}&voice=en-GB-SoniaNeural&rate=-5%`
      : "";
    const audioQuery = audioParam ? `&audio=${encodeURIComponent(audioParam)}` : "";

    const bookParams = currentBook
      ? `&bookId=${encodeURIComponent(currentBook.id)}&bookTitle=${encodeURIComponent(currentBook.title)}&page=${curPageNum}&returnToModal=true`
      : "";

    navigate(`/pronunciation_assessments/new?text=${encodeURIComponent(clean)}${audioQuery}${bookParams}`);
  };

  // 触发跟读：根据短句或长文本自动分流
  const handleTriggerShadowing = (sentence: string, pageNum: number) => {
    if (!sentence) return;
    const clean = sentence.trim();
    const sentences = splitTextIntoSentences(clean);
    const wordCount = clean.split(/\s+/).filter(Boolean).length;

    // 低阶绘本或短句（<= 1 句且 <= 12 词）：直接直达 AI 评测，极致快捷
    if (sentences.length <= 1 && wordCount <= 12) {
      handleGoToPronunciation(clean, pageNum);
      return;
    }

    // 高阶长诗或多句段落：弹出逐句精练 / 整段挑战弹窗
    setShadowSentenceModalData({
      bookTitle: activeReadingBook?.title || "牛津绘本",
      pageNum,
      fullText: clean,
      sentences: sentences.length > 1 ? sentences : [clean],
    });
  };

  const curPage = activeReadingBook?.pages?.[currentPageIndex];
  const nextPage = isSpreadMode ? activeReadingBook?.pages?.[currentPageIndex + 1] : null;

  return (
    <div className="w-full relative pb-16">
      {/* 顶部主横幅与统计指标 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-yellow-500/15 border-b border-amber-300/40 p-6 md:p-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-3xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <BookOpenIcon className="size-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                  牛津原版分级绘本数字图书馆
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500 text-white shadow-xs">
                  <SparklesIcon className="size-3" />
                  344 册完整全量库
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                全套 1~16 阶英国原版引进 · 纯正母语原声音频 · 毫秒级对齐字幕 · 护眼大屏沉浸伴读
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* 搜索框 */}
            <div className="relative flex-1 md:w-64">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="搜索绘本书名、关键词..."
                className="pl-9 h-10 rounded-2xl bg-background/80 border-amber-300/60 text-xs"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. 页面核心内容区域 */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 space-y-8">
        {/* 1. 五大核心分类大标签切换 (Series Tabs) */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-border/50">
          {SERIES_CATEGORIES.map((cat) => {
            const isActive = activeSeries === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelectSeries(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-[1.02]"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* 2. 细分阶段胶囊选择器 (Sub-Stage Pills) - 仅在点击具体单一分类时呈现，全景模式下隐藏 */}
        {activeSeries !== "all" && availableStages.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-muted/30 border border-border/40">
            <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <LayersIcon className="size-3.5 text-amber-500" />
              阶段快速跳转：
            </span>
            <button
              onClick={() => setSelectedStage("all")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                selectedStage === "all"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
              }`}
            >
              全部 ({categoryFilteredBooks.length})
            </button>
            {availableStages.map((st) => (
              <button
                key={st.stageId}
                onClick={() => setSelectedStage(st.stageId)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                  selectedStage === st.stageId
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                }`}
              >
                {st.label} ({st.count})
              </button>
            ))}
          </div>
        )}

        {/* 3. 绘本书架与检索内容展示 */}
        {loading ? (
          <div className="text-center py-24 space-y-3">
            <div className="size-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">正在加载全量 344 册牛津分级图书馆...</p>
          </div>
        ) : searchKeyword.trim() ? (
          /* A. 搜索结果模式 */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <SearchIcon className="size-4 text-amber-500" />
                <h2 className="text-sm md:text-base font-black text-foreground">
                  搜索 “{searchKeyword}” 的匹配绘本
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  共 {displayedBooks.length} 册
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSearchKeyword("")}
                className="text-xs text-muted-foreground hover:text-foreground h-8"
              >
                清除搜索返回书房
              </Button>
            </div>

            {displayedBooks.length === 0 ? (
              <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border p-6 space-y-3">
                <BookOpenIcon className="size-12 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-bold text-foreground">未找到匹配 “{searchKeyword}” 的绘本</p>
                <p className="text-xs text-muted-foreground">试试搜索“Floppy”、“Magic Key”或“Dragon”吧</p>
                <Button size="sm" variant="outline" onClick={() => setSearchKeyword("")}>
                  清除搜索条件
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {displayedBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onSelectBook={(b) => setPreviewModalBook(b)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : activeSeries !== "all" ? (
          /* B. 单一分类深度模式 */
          <div className="space-y-5">
            {/* 分类说明横幅 */}
            {(() => {
              const curShelf = SHELVES.find((s) => s.id === activeSeries);
              if (!curShelf) return null;
              return (
                <div className={`p-4 md:p-5 rounded-3xl bg-gradient-to-r ${curShelf.accentBg} border ${curShelf.accentBorder} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl">{curShelf.emoji}</span>
                      <h2 className="text-base md:text-lg font-black text-foreground">
                        {curShelf.name}
                      </h2>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${curShelf.badgeBg}`}>
                        {curShelf.stagesText}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        {curShelf.ageBadge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {curShelf.desc}
                    </p>
                  </div>
                  <div className="text-xs font-bold text-muted-foreground shrink-0">
                    本系列共 {displayedBooks.length} 册
                  </div>
                </div>
              );
            })()}

            {displayedBooks.length === 0 ? (
              <div className="text-center py-16 bg-muted/20 rounded-3xl border border-dashed border-border p-6 space-y-3">
                <BookOpenIcon className="size-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-bold text-foreground">暂无符合条件的绘本</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {displayedBooks.map((book) => {
                  const curShelf = SHELVES.find((s) => s.id === activeSeries);
                  return (
                    <BookCard
                      key={book.id}
                      book={book}
                      onSelectBook={(b) => setPreviewModalBook(b)}
                      spineColor={curShelf?.spineColor}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* C. 方案 A 核心落地：四大主题书架进阶流 (All Curated Shelves) */
          <div className="space-y-10">
            {SHELVES.map((shelf) => {
              const shelfBooks = allStories.filter((b) => shelf.stages.includes(b.stageId || ""));
              if (shelfBooks.length === 0) return null;
              const isExpanded = Boolean(expandedShelves[shelf.id]);
              const visibleBooks = isExpanded ? shelfBooks : shelfBooks.slice(0, 4);

              return (
                <section
                  key={shelf.id}
                  className="space-y-4 rounded-3xl p-5 md:p-6 bg-gradient-to-b from-muted/20 via-background to-background border border-border/60 transition-all duration-300 hover:border-border"
                >
                  {/* 书架头部 Banner */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/50">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xl md:text-2xl">{shelf.emoji}</span>
                        <h2 className="text-base md:text-lg font-black text-foreground tracking-tight">
                          {shelf.name}
                        </h2>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${shelf.badgeBg}`}>
                          {shelf.stagesText}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          {shelf.ageBadge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {shelf.desc}
                      </p>
                    </div>

                    {/* 折叠/展开按钮 */}
                    <div className="flex items-center gap-2.5 self-end md:self-auto">
                      <span className="text-xs font-bold text-muted-foreground">
                        共 {shelfBooks.length} 册
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleShelf(shelf.id)}
                        className={`h-8 px-3 rounded-xl text-xs font-bold gap-1 border-border/80 hover:bg-muted ${
                          isExpanded ? "text-amber-600 dark:text-amber-400 border-amber-300" : ""
                        }`}
                      >
                        <span>{isExpanded ? "收起" : `展开全部 ${shelfBooks.length} 册`}</span>
                        {isExpanded ? (
                          <ChevronUpIcon className="size-3.5" />
                        ) : (
                          <ChevronDownIcon className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* 绘本书架陈列网格 */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                    {visibleBooks.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onSelectBook={(b) => setPreviewModalBook(b)}
                        spineColor={shelf.spineColor}
                      />
                    ))}
                  </div>

                  {/* 未展开时的快速展开通栏 */}
                  {!isExpanded && shelfBooks.length > 4 && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => toggleShelf(shelf.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-amber-600 transition-colors py-2 px-4 rounded-full hover:bg-amber-500/10"
                      >
                        <span>点击展开查看该阶段其余 {shelfBooks.length - 4} 册绘本</span>
                        <ChevronDownIcon className="size-3.5" />
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 绘本封面与阅读模式选择弹窗 (图2：大封面 + 原声连播 / 逐页精读) */}
      {/* ============================================================== */}
      <Dialog
        open={Boolean(previewModalBook)}
        onOpenChange={(open) => {
          if (!open) setPreviewModalBook(null);
        }}
      >
        <DialogContent className="max-w-md w-[92vw] rounded-3xl p-6 bg-card border border-border/80 shadow-2xl">
          {previewModalBook && (
            <div className="space-y-4">
              <DialogHeader className="space-y-1.5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/40">
                    {previewModalBook.level}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                    📖 共 {previewModalBook.pageCount} 页
                  </span>
                </div>
                <DialogTitle className="text-lg md:text-xl font-black text-foreground">
                  {previewModalBook.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground italic line-clamp-1 font-sans">
                  {previewModalBook.sentenceEn || "Pure British authentic reading"}
                </DialogDescription>
              </DialogHeader>

              {/* 大封面图 (图2：居中大封面 · 竖版 3:4 完整呈现) */}
              <div className="relative aspect-[3/4] max-h-[380px] w-full mx-auto rounded-2xl overflow-hidden bg-muted/20 border border-border/60 shadow-lg flex items-center justify-center">
                <img
                  src={previewModalBook.coverImage}
                  alt={previewModalBook.title}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (previewModalBook.pages?.[0]?.image && target.src !== previewModalBook.pages[0].image) {
                      target.src = previewModalBook.pages[0].image;
                    } else {
                      target.src = "/assets/qiaobao_sunny240.png";
                    }
                  }}
                />
              </div>

              {/* 底部两大模式按钮并排 (图2：原声连播 | 逐页精读) */}
              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border-2 border-border/80 hover:border-amber-400 hover:bg-amber-500/10 text-foreground font-black transition-all hover:scale-[1.02] shadow-xs cursor-pointer"
                  onClick={() => {
                    const target = previewModalBook;
                    setPreviewModalBook(null);
                    handleOpenBookReader(target, "full_audio");
                  }}
                >
                  <div className="flex items-center gap-1.5 text-sm font-black">
                    <HeadphonesIcon className="size-4 text-amber-500" />
                    <span>原声连读</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    原版音频 · 连贯连读
                  </span>
                </Button>

                <Button
                  size="lg"
                  className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 bg-amber-500 hover:bg-amber-600 text-white font-black transition-all hover:scale-[1.02] shadow-md shadow-amber-500/20 cursor-pointer"
                  onClick={() => {
                    const target = previewModalBook;
                    setPreviewModalBook(null);
                    handleOpenBookReader(target, "page_tts");
                  }}
                >
                  <div className="flex items-center gap-1.5 text-sm font-black">
                    <BookOpenIcon className="size-4" />
                    <span>逐页精读</span>
                  </div>
                  <span className="text-[10px] text-white/80 font-normal">
                    Sonia伴读 · 逐页精读
                  </span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* 4. 电脑 / iPad 专属大屏双模式翻页阅读器 (Grand Dual-Mode Reader) */}
      {/* ============================================================== */}
      <Dialog
        open={Boolean(activeReadingBook)}
        onOpenChange={(open) => {
          if (!open) {
            stopAllReadingAudios();
            setActiveReadingBook(null);
            try {
              sessionStorage.removeItem("sb_last_read");
            } catch (_) {}
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.delete("bookId");
              next.delete("page");
              next.delete("shadowModal");
              return next;
            });
          }
        }}
      >
        <DialogContent className="w-full sm:w-[94vw] max-w-5xl h-[100dvh] sm:h-[92vh] max-h-[100dvh] sm:max-h-[92vh] rounded-none sm:rounded-3xl p-2.5 sm:p-4 flex flex-col overflow-hidden">
          {activeReadingBook && (
            <div className="flex flex-col h-full w-full min-h-0 space-y-2">
              {/* 弹窗顶部栏：返回模式选择 */}
              <DialogHeader className="shrink-0 flex flex-row items-center justify-between pb-2 border-b border-border/50 text-left pr-8 sm:pr-10">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const currentBook = activeReadingBook;
                      stopAllReadingAudios();
                      setActiveReadingBook(null);
                      setPreviewModalBook(currentBook);
                    }}
                    className="h-8 px-2 sm:px-3 rounded-xl text-xs font-black gap-1 border-amber-300/80 bg-background hover:bg-amber-500/10 text-foreground hover:text-amber-700 dark:hover:text-amber-300 transition-all shadow-2xs cursor-pointer shrink-0"
                    title="返回选择原声连读或逐页精读"
                  >
                    <ChevronLeftIcon className="size-4 text-amber-500" />
                    <span className="hidden sm:inline">返回模式选择</span>
                    <span className="sm:hidden">返回</span>
                  </Button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40 shrink-0">
                        {activeReadingBook.level}
                      </span>
                      <DialogTitle className="text-sm sm:text-base md:text-lg font-black text-foreground truncate">
                        {activeReadingBook.title?.replace(/^\[.*?\]\s*/, "") || activeReadingBook.title}
                      </DialogTitle>
                    </div>
                  </div>
                </div>

                {/* 顶部右侧：自动朗读开关、模式指示与单/双页排版 */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {readingMode === "page_tts" && (
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none font-bold text-foreground px-2 sm:px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-300/40 hover:bg-amber-500/20 transition-colors shadow-2xs">
                      <input
                        type="checkbox"
                        checked={autoPlayPageAudio}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setAutoPlayPageAudio(val);
                          try {
                            localStorage.setItem("sb_auto_play_page_audio", String(val));
                          } catch (_) {}
                        }}
                        className="size-3.5 accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="text-[11px] sm:text-xs text-foreground">自动朗读</span>
                    </label>
                  )}

                  <span className="text-[11px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300/40 flex items-center gap-1 shadow-2xs">
                    {readingMode === "full_audio" ? (
                      <>
                        <HeadphonesIcon className="size-3 text-amber-500" />
                        <span className="hidden sm:inline">原声连读</span>
                        <span className="sm:hidden">连读</span>
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="size-3 text-amber-500" />
                        <span className="hidden sm:inline">逐页精读</span>
                        <span className="sm:hidden">精读</span>
                      </>
                    )}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs rounded-xl hidden md:flex items-center gap-1 border-amber-300 hover:bg-amber-500/10 cursor-pointer"
                    onClick={() => setIsSpreadMode(!isSpreadMode)}
                  >
                    <Columns2Icon className="size-3.5 text-amber-600" />
                    <span>{isSpreadMode ? "单页模式" : "双页对开"}</span>
                  </Button>
                </div>
              </DialogHeader>

              {/* 核心阅读区：双页对开 或 单页高清（弹性自适应，绝不挤压底栏） */}
              <div className="flex-1 min-h-0 overflow-hidden py-1 flex flex-col justify-center">
                {isSpreadMode && nextPage ? (
                  // 双页对开布局 (Book Spread)
                  <div className="grid grid-cols-2 gap-3 h-full min-h-0 p-2 bg-amber-500/5 rounded-2xl md:rounded-3xl border border-amber-300/40">
                    {/* 左页 */}
                    <div className={`flex flex-col items-center justify-between p-2 md:p-3 bg-background rounded-2xl shadow-xs border transition-all duration-300 h-full min-h-0 ${
                      pageAudioPlaying && playingPageNum === curPage?.page ? "ring-2 ring-amber-400 border-amber-400 bg-amber-500/5" : "border-border/40"
                    }`}>
                      <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden rounded-xl bg-muted/10 border border-border/20 p-1">
                        <img
                          src={curPage?.image || activeReadingBook.coverImage}
                          alt="左页插画"
                          className="max-h-full max-w-full h-full w-full object-contain rounded-xl"
                          loading="eager"
                        />
                      </div>
                      {readingMode === "page_tts" ? (
                        <div className="mt-2 text-center space-y-1 w-full shrink-0">
                          {curPage?.sentenceEn && !curPage.sentenceEn.startsWith("【") && !curPage.sentenceEn.startsWith("[") && (
                            <div className="text-xs md:text-sm font-bold text-foreground leading-relaxed max-h-24 md:max-h-28 overflow-y-auto px-1">
                              {curPage.sentenceEn.split(/\s+/).map((word, wIdx) => (
                                <span
                                  key={wIdx}
                                  onClick={() => handleWordClick(word)}
                                  className="cursor-pointer hover:bg-amber-200 hover:text-amber-900 rounded px-1 transition-colors"
                                >
                                  {word}{" "}
                                </span>
                              ))}
                            </div>
                          )}
                          {showZhTranslation && isMeaningfulTranslation(curPage?.sentenceZh) && (
                            <p className="text-[11px] md:text-xs text-muted-foreground truncate">{curPage.sentenceZh}</p>
                          )}
                          <div className="pt-1.5 flex items-center justify-between border-t border-border/30 w-full px-2">
                            <span className="text-[11px] text-muted-foreground font-bold">第 {currentPageIndex + 1} 页</span>
                            {curPage?.sentenceEn && !curPage.sentenceEn.startsWith("【") && !curPage.sentenceEn.startsWith("[") && (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 rounded-full border-orange-400/80 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-all hover:scale-105"
                                  onClick={() => handleTriggerShadowing(curPage.sentenceEn, currentPageIndex + 1)}
                                  title={`跟读纠音左页 (第 ${currentPageIndex + 1} 页)`}
                                >
                                  <MicIcon className="size-3.5" />
                                  <span>跟读</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={`size-8 rounded-full p-0 flex items-center justify-center transition-all shadow-2xs cursor-pointer ${
                                    pageAudioPlaying && playingPageNum === curPage?.page
                                      ? "bg-amber-500 text-white ring-4 ring-amber-400/40 animate-pulse scale-105 shadow-md"
                                      : "bg-amber-500 hover:bg-amber-600 text-white hover:scale-105 active:scale-95 shadow-xs"
                                  }`}
                                  onClick={() => playPageTtsAudio(curPage)}
                                  title={pageAudioPlaying && playingPageNum === curPage?.page ? "暂停朗读" : "朗读左页 (Sonia)"}
                                >
                                  <Volume2Icon className="size-4.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* 右页 */}
                    <div className={`flex flex-col items-center justify-between p-2 md:p-3 bg-background rounded-2xl shadow-xs border transition-all duration-300 h-full min-h-0 ${
                      pageAudioPlaying && playingPageNum === nextPage?.page ? "ring-2 ring-amber-400 border-amber-400 bg-amber-500/5" : "border-border/40"
                    }`}>
                      <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden rounded-xl bg-muted/10 border border-border/20 p-1">
                        <img
                          src={nextPage.image}
                          alt="右页插画"
                          className="max-h-full max-w-full h-full w-full object-contain rounded-xl"
                          loading="eager"
                        />
                      </div>
                      {readingMode === "page_tts" ? (
                        <div className="mt-2 text-center space-y-1 w-full shrink-0">
                          {nextPage.sentenceEn && !nextPage.sentenceEn.startsWith("【") && !nextPage.sentenceEn.startsWith("[") && (
                            <div className="text-xs md:text-sm font-bold text-foreground leading-relaxed max-h-24 md:max-h-28 overflow-y-auto px-1">
                              {nextPage.sentenceEn.split(/\s+/).map((word, wIdx) => (
                                <span
                                  key={wIdx}
                                  onClick={() => handleWordClick(word)}
                                  className="cursor-pointer hover:bg-amber-200 hover:text-amber-900 rounded px-1 transition-colors"
                                >
                                  {word}{" "}
                                </span>
                              ))}
                            </div>
                          )}
                          {showZhTranslation && isMeaningfulTranslation(nextPage.sentenceZh) && (
                            <p className="text-[11px] md:text-xs text-muted-foreground truncate">{nextPage.sentenceZh}</p>
                          )}
                          <div className="pt-1.5 flex items-center justify-between border-t border-border/30 w-full px-2">
                            <span className="text-[11px] text-muted-foreground font-bold">第 {currentPageIndex + 2} 页</span>
                            {nextPage.sentenceEn && !nextPage.sentenceEn.startsWith("【") && !nextPage.sentenceEn.startsWith("[") && (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 rounded-full border-orange-400/80 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-all hover:scale-105"
                                  onClick={() => handleTriggerShadowing(nextPage.sentenceEn, currentPageIndex + 2)}
                                  title={`跟读纠音右页 (第 ${currentPageIndex + 2} 页)`}
                                >
                                  <MicIcon className="size-3.5" />
                                  <span>跟读</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={`size-8 rounded-full p-0 flex items-center justify-center transition-all shadow-2xs cursor-pointer ${
                                    pageAudioPlaying && playingPageNum === nextPage?.page
                                      ? "bg-amber-500 text-white ring-4 ring-amber-400/40 animate-pulse scale-105 shadow-md"
                                      : "bg-amber-500 hover:bg-amber-600 text-white hover:scale-105 active:scale-95 shadow-xs"
                                  }`}
                                  onClick={() => playPageTtsAudio(nextPage)}
                                  title={pageAudioPlaying && playingPageNum === nextPage?.page ? "暂停朗读" : "朗读右页 (Sonia)"}
                                >
                                  <Volume2Icon className="size-4.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  // 单页大图布局 (Single Page)
                  <div className="flex flex-col items-center justify-center p-2 md:p-3 bg-amber-500/5 rounded-2xl md:rounded-3xl border border-amber-300/40 h-full min-h-0">
                    <div className="flex-1 min-h-0 flex justify-center items-center overflow-hidden rounded-2xl bg-white dark:bg-black/20 border border-amber-300/40 shadow-sm max-w-3xl w-full p-1">
                      <img
                        src={curPage?.image || activeReadingBook.coverImage}
                        alt="绘本高清插画"
                        className="max-h-full max-w-full h-full w-full object-contain rounded-xl"
                        loading="eager"
                      />
                    </div>
                    {readingMode === "page_tts" ? (
                      <div className="text-center space-y-1.5 max-w-2xl shrink-0 mt-2 flex flex-col items-center">
                        {curPage?.sentenceEn && !curPage.sentenceEn.startsWith("【") && !curPage.sentenceEn.startsWith("[") && (
                          <div className="text-sm md:text-base font-black text-foreground font-sans tracking-wide leading-relaxed max-h-28 md:max-h-36 overflow-y-auto px-2">
                            {curPage.sentenceEn.split(/\s+/).map((word, wIdx) => (
                              <span
                                key={wIdx}
                                onClick={() => handleWordClick(word)}
                                className="cursor-pointer hover:bg-amber-300 hover:text-amber-950 rounded px-1 transition-colors"
                              >
                                {word}{" "}
                              </span>
                            ))}
                          </div>
                        )}
                        {showZhTranslation && isMeaningfulTranslation(curPage?.sentenceZh) && (
                          <p className="text-xs text-muted-foreground truncate">{curPage?.sentenceZh}</p>
                        )}
                        {curPage?.sentenceEn && !curPage.sentenceEn.startsWith("【") && !curPage.sentenceEn.startsWith("[") && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 px-3.5 rounded-full border-orange-400/80 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all hover:scale-105"
                              onClick={() => handleTriggerShadowing(curPage.sentenceEn, currentPageIndex + 1)}
                              title={`跟读纠音此句: "${curPage.sentenceEn}"`}
                            >
                              <MicIcon className="size-4" />
                              <span>跟读纠音</span>
                            </Button>
                            <Button
                              size="sm"
                              className={`size-9 rounded-full p-0 flex items-center justify-center transition-all shadow-sm cursor-pointer ${
                                pageAudioPlaying && playingPageNum === curPage?.page
                                  ? "bg-amber-600 text-white ring-4 ring-amber-400/50 animate-pulse scale-110 shadow-md"
                                  : "bg-amber-500 hover:bg-amber-600 text-white hover:scale-110 active:scale-95"
                              }`}
                              onClick={() => playPageTtsAudio(curPage)}
                              title={pageAudioPlaying && playingPageNum === curPage?.page ? "暂停朗读" : "朗读本页 (Sonia)"}
                            >
                              <Volume2Icon className="size-5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* 点词查词浮条 */}
                {selectedWord && (
                  <div className="shrink-0 mt-2 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/50 flex flex-col md:flex-row md:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-bottom-2 shadow-xs">
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 shrink-0 flex items-center gap-1.5">
                        单词：
                        <span className="text-sm font-black underline text-amber-800 dark:text-amber-100">{selectedWord}</span>
                        {selectedWordPhonetic && (
                          <span className="text-xs font-mono font-medium text-amber-700/90 dark:text-amber-300/90 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-400/30">
                            [{selectedWordPhonetic}]
                          </span>
                        )}
                      </span>

                      {/* 中文翻译标签 */}
                      <span className="inline-flex items-center text-xs font-bold text-amber-900 dark:text-amber-100 bg-amber-500/20 dark:bg-amber-500/30 px-2.5 py-1 rounded-lg border border-amber-400/40 max-w-xl">
                        {selectedWordLoading ? (
                          <span className="animate-pulse">词典查询中...</span>
                        ) : selectedWordTranslation ? (
                          <span className="line-clamp-2 leading-relaxed">释义：{selectedWordTranslation}</span>
                        ) : (
                          <span>词典查询中...</span>
                        )}
                      </span>

                      {/* 朗读发音 */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6.5 px-2 text-xs gap-1 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 rounded-lg cursor-pointer shrink-0"
                        onClick={() => handleWordClick(selectedWord)}
                        title="再次朗读发音"
                      >
                        <Volume2Icon className="size-3.5" />
                        <span>再听一次</span>
                      </Button>
                    </div>

                    {/* 右侧：存入生词本 与 关闭键 */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1 rounded-xl shadow-2xs cursor-pointer"
                        onClick={() => handleSaveToVocabulary(selectedWord)}
                      >
                        <StarIcon className="size-3.5 fill-current" />
                        <span>⭐ 存入生词本</span>
                      </Button>

                      {/* 关闭键 */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-7 p-0 rounded-full text-amber-800/70 dark:text-amber-200/70 hover:text-amber-950 dark:hover:text-white hover:bg-amber-500/20 cursor-pointer shrink-0"
                        onClick={() => {
                          setSelectedWord(null);
                          setSelectedWordTranslation(null);
                          setSelectedWordPhonetic(null);
                        }}
                        title="关闭查词浮条"
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 弹窗底部导航控制栏：进度条在最底部，左右分别设置翻页按钮 (shrink-0 绝对置底可见) */}
              <div className="shrink-0 pt-2 border-t border-border/50 flex items-center justify-between gap-2 md:gap-3">
                {/* 左侧：上一页按钮 */}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-2xl h-10 px-4 text-xs font-bold gap-1 shrink-0 shadow-2xs hover:bg-amber-500/10 cursor-pointer"
                  onClick={handlePrevPage}
                  disabled={currentPageIndex === 0}
                >
                  <ChevronLeftIcon className="size-4 text-amber-500" />
                  <span>上一页 (←)</span>
                </Button>

                {/* 中间核心区域：原声连读音频进度条 或 逐页精读工具栏 */}
                {readingMode === "full_audio" ? (
                  // 原声连读：集成式底部进度条与播放控制
                  <div className="flex-1 max-w-2xl mx-1 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-300/50 flex items-center gap-3 shadow-2xs">
                    {/* 播放 / 暂停 */}
                    <Button
                      size="sm"
                      className="size-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white p-0 shrink-0 shadow-xs cursor-pointer"
                      onClick={toggleFullAudio}
                      title={fullAudioPlaying ? "暂停 (空格键)" : "播放 (空格键)"}
                    >
                      {fullAudioPlaying ? (
                        <PauseIcon className="size-4 fill-current" />
                      ) : (
                        <PlayIcon className="size-4 fill-current ml-0.5" />
                      )}
                    </Button>

                    {/* 进度信息与滑动条 */}
                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-200">
                        <span className="text-muted-foreground font-semibold truncate">
                          第 {currentPageIndex + 1} {isSpreadMode && nextPage ? `- ${currentPageIndex + 2}` : ""} 页 / 共 {activeReadingBook.pages?.length || 1} 页
                        </span>
                        <span className="font-mono text-xs shrink-0 text-amber-800 dark:text-amber-300">
                          {formatAudioTime(fullAudioCurrentTime)} / {formatAudioTime(fullAudioDuration)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={fullAudioDuration || 100}
                        step={0.1}
                        value={fullAudioCurrentTime}
                        onChange={(e) => handleSeekFullAudio(Number(e.target.value))}
                        className="w-full h-1.5 bg-amber-200 dark:bg-amber-900/60 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* 倍速切换 */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px] rounded-xl border-amber-300/80 font-bold text-amber-800 dark:text-amber-200 shrink-0 hover:bg-amber-500/15 cursor-pointer"
                      onClick={handleToggleRate}
                      title="切换倍速"
                    >
                      {fullAudioRate}x
                    </Button>
                  </div>
                ) : (
                  // 逐页精读：极简居中页码指示（跟读按钮已在各页卡片上方，避免底部重复）
                  <div className="flex items-center justify-center py-1">
                    <span className="text-xs font-bold text-muted-foreground px-3 py-1 rounded-full bg-muted/40 border border-border/30 shadow-2xs">
                      第 {currentPageIndex + 1} {isSpreadMode && nextPage ? `- ${currentPageIndex + 2}` : ""} 页 / 共 {activeReadingBook.pages?.length || 1} 页
                    </span>
                  </div>
                )}

                {/* 右侧：下一页按钮 */}
                <Button
                  size="sm"
                  className="rounded-2xl h-10 px-4 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white gap-1 shadow-sm shrink-0 cursor-pointer"
                  onClick={handleNextPage}
                  disabled={currentPageIndex >= (activeReadingBook.pages?.length || 1) - (isSpreadMode ? 2 : 1)}
                >
                  <span>下一页 (→)</span>
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 高阶长文本智能分句跟读面板 */}
      <Dialog
        open={Boolean(shadowSentenceModalData)}
        onOpenChange={(open) => {
          if (!open) setShadowSentenceModalData(null);
        }}
      >
        <DialogContent className="max-w-lg w-full max-h-[85vh] flex flex-col p-5 rounded-3xl">
          <DialogHeader className="shrink-0 pb-2 border-b border-border/40">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <SparklesIcon className="size-4" />
              <span>智能跟读纠音 · 第 {shadowSentenceModalData?.pageNum} 页</span>
            </div>
            <DialogTitle className="text-lg font-black text-foreground">
              {shadowSentenceModalData?.bookTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              高阶绘本内容丰富，推荐分句单练击破，也可直接挑战整页朗读！
            </DialogDescription>
          </DialogHeader>

          {/* 分句列表 */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
            {shadowSentenceModalData?.sentences.map((sent, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-muted/40 hover:bg-amber-500/10 border border-border/40 hover:border-amber-300 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="size-5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground">分句练习</span>
                  </div>
                  <p className="text-sm font-bold text-foreground leading-relaxed">
                    {sent}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="rounded-full h-8 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shrink-0 gap-1 shadow-2xs group-hover:scale-105 cursor-pointer"
                  onClick={() => {
                    const text = sent;
                    const pNum = shadowSentenceModalData?.pageNum;
                    setShadowSentenceModalData(null);
                    handleGoToPronunciation(text, pNum);
                  }}
                >
                  <MicIcon className="size-3.5" />
                  <span>跟读此句</span>
                </Button>
              </div>
            ))}
          </div>

          {/* 底部：整页进阶挑战 */}
          <div className="shrink-0 pt-3 border-t border-border/40 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setShadowSentenceModalData(null)}
            >
              返回阅读
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
              onClick={() => {
                const full = shadowSentenceModalData?.fullText || "";
                const pNum = shadowSentenceModalData?.pageNum;
                setShadowSentenceModalData(null);
                handleGoToPronunciation(full, pNum);
              }}
            >
              <span>🏆 进阶挑战：朗读整页全文</span>
              <ChevronRightIcon className="size-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
