import { useState, useContext, useRef } from "react";
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  toast,
} from "@renderer/components/ui";
import {
  BookOpenIcon,
  GraduationCapIcon,
  HeadphonesIcon,
  Volume2Icon,
  VolumeXIcon,
  PauseIcon,
  PlayIcon,
  SparklesIcon,
  MicIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  BookmarkIcon,
  ClockIcon,
  FlameIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  LayersIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppSettingsProviderContext } from "@renderer/context";

// 预设牛津分级绘本三大经典系列
interface StoryPage {
  pageNo: number;
  text: string;
  translation: string;
  audioUrl: string;
  image?: string;
}

interface CuratedBook {
  id: string;
  title: string;
  series: "school" | "home" | "bookworms";
  subCategory: string; // e.g. "L1-L2", "L3-L5", "L6-L9", "phonics", "stories", "starter", "stage1", "stage2"
  badge: string;
  badgeColor: string;
  age: string;
  desc: string;
  wordsCount: number;
  duration: string;
  color: string;
  audioUrl: string;
  pdfUrl?: string;
  coverImage?: string;
  pages: StoryPage[];
}

const CURATED_BOOKS: CuratedBook[] = [
  // 1. 牛津树·学校版 (School Edition)
  {
    id: "school-floppy-bone",
    title: "Floppy's Bone (弗洛皮的骨头)",
    series: "school",
    subCategory: "l1-l2",
    badge: "学校版 · Stage 1+",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    age: "4-7 岁 · 官方原版",
    desc: "小狗 Floppy 得到了一根大骨头，却被调皮小狗叼走了！全家人飞奔追赶，最后大狗一口吃掉了骨头！纯正牛津原声伴读。",
    wordsCount: 68,
    duration: "2 分钟",
    color: "from-emerald-500/15 via-teal-500/10 to-transparent border-emerald-400/30",
    audioUrl: "/assets/audio/floppy_bone.mp3",
    pdfUrl: "/assets/books/floppys_bone/Floppys_Bone.pdf",
    coverImage: "/assets/books/floppys_bone/page_1.jpg",
    pages: [
      {
        pageNo: 1,
        text: "Floppy had a bone.",
        translation: "小狗弗洛皮有一根大骨头。",
        audioUrl: "/assets/books/floppys_bone/audio/page_1.mp3",
        image: "/assets/books/floppys_bone/page_3.jpg",
      },
      {
        pageNo: 2,
        text: "A dog took the bone.",
        translation: "一只小白狗叼走了骨头。",
        audioUrl: "/assets/books/floppys_bone/audio/page_2.mp3",
        image: "/assets/books/floppys_bone/page_4.jpg",
      },
      {
        pageNo: 3,
        text: "Floppy ran after the dog.",
        translation: "弗洛皮追在那只狗后面飞奔。",
        audioUrl: "/assets/books/floppys_bone/audio/page_3.mp3",
        image: "/assets/books/floppys_bone/page_5.jpg",
      },
      {
        pageNo: 4,
        text: "“Come back!” said Mum. She ran after Floppy.",
        translation: "“快回来！”妈妈大喊道。她跟在弗洛皮身后紧追不舍。",
        audioUrl: "/assets/books/floppys_bone/audio/page_4.mp3",
        image: "/assets/books/floppys_bone/page_6.jpg",
      },
      {
        pageNo: 5,
        text: "“Come back,” said Dad. He ran after Mum.",
        translation: "“快回来，”爸爸也喊道。他跟在妈妈身后跑了出去。",
        audioUrl: "/assets/books/floppys_bone/audio/page_5.mp3",
        image: "/assets/books/floppys_bone/page_7.jpg",
      },
      {
        pageNo: 6,
        text: "“Come back!” said Biff and Chip. They ran after Dad.",
        translation: "“快回来呀！”比夫和奇普大喊。他们跟在爸爸身后追赶。",
        audioUrl: "/assets/books/floppys_bone/audio/page_6.mp3",
        image: "/assets/books/floppys_bone/page_8.jpg",
      },
      {
        pageNo: 7,
        text: "The dog stopped.",
        translation: "那只小狗停了下来。",
        audioUrl: "/assets/books/floppys_bone/audio/page_10.mp3",
        image: "/assets/books/floppys_bone/page_12.jpg",
      },
      {
        pageNo: 8,
        text: "A big dog took the bone.",
        translation: "一只高大强壮的斗牛犬抢走了骨头。",
        audioUrl: "/assets/books/floppys_bone/audio/page_11.mp3",
        image: "/assets/books/floppys_bone/page_13.jpg",
      },
      {
        pageNo: 9,
        text: "The big dog ate the bone. Oh no!",
        translation: "大狗把骨头一口吃掉了。天哪，糟糕了！",
        audioUrl: "/assets/books/floppys_bone/audio/page_12.mp3",
        image: "/assets/books/floppys_bone/page_14.jpg",
      },
    ],
  },
  {
    id: "school-1",
    title: "At the Park (在公园里)",
    series: "school",
    subCategory: "l1-l2",
    badge: "学校版 · L1 启蒙",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    age: "4-6 岁 · 零基础",
    desc: "Kipper 和狗狗 Floppy 在阳光公园里的欢乐探险，学习短元音与身边常见物品单词。",
    wordsCount: 45,
    duration: "5 分钟",
    color: "from-blue-500/15 via-sky-500/10 to-transparent border-blue-400/30",
    audioUrl: "/assets/audio/l1_1.mp3",
    pages: [
      {
        pageNo: 1,
        text: "Kipper went to the park. Look at the cute little cat sitting on the bench!",
        translation: "Kipper 去了公园。看那只坐在长椅上的可爱小猫咪！",
        audioUrl: "/assets/audio/l1_1.mp3",
      },
      {
        pageNo: 2,
        text: "Floppy barked at the cat. The cat ran quickly up a big green tree.",
        translation: "Floppy 对着小猫汪汪叫。小猫飞快地爬上了一棵大绿树。",
        audioUrl: "/assets/audio/l2_2.mp3",
      },
      {
        pageNo: 3,
        text: "Kipper laughed and threw the red ball. What a happy sunny day!",
        translation: "Kipper 哈哈大笑，把红色小球扔了出去。多么快乐阳光的一天啊！",
        audioUrl: "/assets/audio/l1_3.mp3",
      },
    ],
  },
  {
    id: "school-2",
    title: "The Magic Key (神奇魔法钥匙)",
    series: "school",
    subCategory: "l3-l5",
    badge: "学校版 · L3 主线",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    age: "6-9 岁 · 进阶级",
    desc: "Biff 和 Chip 在小阁楼的旧盒子里找到了一把发光的神秘金色钥匙，一段席卷整个童年的奇幻魔法冒险正式启航！",
    wordsCount: 120,
    duration: "8 分钟",
    color: "from-amber-500/15 via-orange-500/10 to-transparent border-amber-400/30",
    audioUrl: "/assets/audio/today_challenge.mp3",
    pages: [
      {
        pageNo: 1,
        text: "The box began to glow. Look at the box, said Biff. It was pure magic!",
        translation: "旧木盒开始发出耀眼的金光。“快看这个盒子！”Biff 惊呼道，这真是奇妙的魔法！",
        audioUrl: "/assets/audio/today_challenge.mp3",
      },
      {
        pageNo: 2,
        text: "The magic key was glowing brighter and brighter. The whole room began to change.",
        translation: "魔法钥匙越变越亮，整个房间的墙壁和家具开始发生了不可思议的奇幻变化。",
        audioUrl: "/assets/audio/l3_1.mp3",
      },
      {
        pageNo: 3,
        text: "The children were shrinking smaller and smaller! Where will the key take them today?",
        translation: "孩子们变得越来越小，变成了小人儿！今天的魔法钥匙会带他们去哪里探险呢？",
        audioUrl: "/assets/audio/l3_3.mp3",
      },
    ],
  },
  {
    id: "school-3",
    title: "The Dragon Tree (神龙树奇遇)",
    series: "school",
    subCategory: "l3-l5",
    badge: "学校版 · L5 飞跃",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    age: "8-11 岁 · 提升级",
    desc: "魔法钥匙再次发光，把孩子们带入了一个神奇的飞龙王国，他们遇到了一只爱吃烤松饼的善良神龙！",
    wordsCount: 260,
    duration: "12 分钟",
    color: "from-emerald-500/15 via-teal-500/10 to-transparent border-emerald-400/30",
    audioUrl: "/assets/audio/l3_3.mp3",
    pages: [
      {
        pageNo: 1,
        text: "They landed under a huge strange tree. It had big green leaves that looked like dragon scales.",
        translation: "他们降落在一棵奇大无比的怪树下，树上巨大的绿叶长得就像龙鳞一样。",
        audioUrl: "/assets/audio/l3_3.mp3",
      },
      {
        pageNo: 2,
        text: "Suddenly, a puff of friendly smoke appeared. Hello! I am the pancake-making dragon!",
        translation: "突然，一团友善的轻烟升起。“你们好呀！我是一只专门做美味松饼的神龙！”",
        audioUrl: "/assets/audio/today_challenge.mp3",
      },
    ],
  },

  // 2. 牛津树·家庭版 (Home Edition)
  {
    id: "home-1",
    title: "Fun at the Farm (农场大狂欢)",
    series: "home",
    subCategory: "phonics",
    badge: "家庭版 · Phonics 拼读",
    badgeColor: "bg-red-500/10 text-red-600 border-red-500/30",
    age: "3-7 岁 · 亲子启蒙",
    desc: "练习辅音组合与双元音发音规律，跟着小动物们在农场快乐唱歌跳舞！",
    wordsCount: 65,
    duration: "6 分钟",
    color: "from-red-500/15 via-rose-500/10 to-transparent border-red-400/30",
    audioUrl: "/assets/audio/l1_2.mp3",
    pages: [
      {
        pageNo: 1,
        text: "Kipper went to the sunny farm. He saw three pink pigs playing happily in the mud.",
        translation: "Kipper 来到阳光明媚的农场，他看到三只粉红小猪在泥巴里开心地打滚。",
        audioUrl: "/assets/audio/l1_2.mp3",
      },
      {
        pageNo: 2,
        text: "Quack, quack! The white duck swam across the pond to say hello to Kipper.",
        translation: "嘎嘎嘎！白鸭子欢快地游过小池塘，向 Kipper 打招呼。",
        audioUrl: "/assets/audio/l1_1.mp3",
      },
    ],
  },
  {
    id: "home-2",
    title: "The Red Coat (红色小外套)",
    series: "home",
    subCategory: "stories",
    badge: "家庭版 · First Stories",
    badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    age: "4-8 岁 · 睡前故事",
    desc: "Kipper 的红色小外套不见了，全家人在家里找呀找，猜猜它到底藏在哪儿了？",
    wordsCount: 80,
    duration: "6 分钟",
    color: "from-rose-500/15 via-orange-500/10 to-transparent border-rose-400/30",
    audioUrl: "/assets/audio/l1_3.mp3",
    pages: [
      {
        pageNo: 1,
        text: "Where is my red coat? asked Kipper. I looked under the bed, but it was not there.",
        translation: "“我的红色小外套在哪里呢？”Kipper 问道，“我找了床底下，但不在那里。”",
        audioUrl: "/assets/audio/l1_3.mp3",
      },
      {
        pageNo: 2,
        text: "Look! Floppy was sleeping soundly on the red coat in the basket. Silly dog!",
        translation: "看呀！小狗 Floppy 正蜷缩在篮子里的红外套上呼呼大睡呢，真是只调皮小狗！",
        audioUrl: "/assets/audio/l2_1.mp3",
      },
    ],
  },
  {
    id: "home-3",
    title: "Wet Feet (湿漉漉的小脚丫)",
    series: "home",
    subCategory: "phonics",
    badge: "家庭版 · Phonics 拼读",
    badgeColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
    age: "4-7 岁 · 拼读强化",
    desc: "下雨天踩水坑的趣味小故事，集中训练短元音 /e/ 和自然拼读常见双写辅音。",
    wordsCount: 75,
    duration: "5 分钟",
    color: "from-cyan-500/15 via-blue-500/10 to-transparent border-cyan-400/30",
    audioUrl: "/assets/audio/l2_3.mp3",
    pages: [
      {
        pageNo: 1,
        text: "Splash, splash! Kipper jumped into the big rain puddle with his bright yellow boots.",
        translation: "啪嗒啪嗒！Kipper 穿着明黄色的雨靴跳进了大雨水坑里。",
        audioUrl: "/assets/audio/l2_3.mp3",
      },
    ],
  },

  // 3. 牛津书虫系列 (Oxford Bookworms Library)
  {
    id: "bw-1",
    title: "The Girl with Red Hair (红发少女)",
    series: "bookworms",
    subCategory: "starter",
    badge: "书虫系列 · Starter 250词",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    age: "9-13 岁 · 中小学进阶",
    desc: "马克在超市遇见了一位美丽的红发女孩，却不小心拿错了她的素描本。一段温暖悬疑的追寻之旅就此展开。",
    wordsCount: 850,
    duration: "15 分钟",
    color: "from-purple-500/15 via-indigo-500/10 to-transparent border-purple-400/30",
    audioUrl: "/assets/audio/l3_2.mp3",
    pages: [
      {
        pageNo: 1,
        text: "Every morning, Mark sees the girl with red hair at the bus stop. She is always drawing pictures in her black book.",
        translation: "每天清晨，马克都能在公交车站看到那个红头发的女孩。她总是在黑色笔记本里认真地画画。",
        audioUrl: "/assets/audio/l3_2.mp3",
      },
      {
        pageNo: 2,
        text: "One sunny afternoon, their bags collided on the train. Mark opened his bag, and saw her amazing drawings!",
        translation: "一个阳光明媚的午后，他们的背包在列车上不小心碰在了一起。马克打开自己的包，看到了女孩那令人惊叹的画作！",
        audioUrl: "/assets/audio/l3_1.mp3",
      },
    ],
  },
  {
    id: "bw-2",
    title: "The Wizard of Oz (绿野仙踪)",
    series: "bookworms",
    subCategory: "stage1",
    badge: "书虫系列 · Stage 1 400词",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    age: "10-15 岁 · 必读名著",
    desc: "一场龙卷风把桃乐丝和小狗托托卷到了奥兹国。为了回家，她和稻草人、铁皮人、胆小狮一同踏上了黄砖路。",
    wordsCount: 1400,
    duration: "25 分钟",
    color: "from-indigo-500/15 via-violet-500/10 to-transparent border-indigo-400/30",
    audioUrl: "/assets/audio/l3_1.mp3",
    pages: [
      {
        pageNo: 1,
        text: "Dorothy lived in the middle of the great Kansas prairies. Suddenly, the sky turned dark and a terrible cyclone came howling.",
        translation: "桃乐丝生活在堪萨斯大草原的中心。突然间，天空变得一片漆黑，可怕的龙卷风呼啸而来。",
        audioUrl: "/assets/audio/l3_1.mp3",
      },
      {
        pageNo: 2,
        text: "The yellow brick road stretched endlessly ahead toward the sparkling Emerald City.",
        translation: "闪闪发光的黄砖路向远方无限延伸，一直通往令人神往的翡翠之城。",
        audioUrl: "/assets/audio/today_challenge.mp3",
      },
    ],
  },
  {
    id: "bw-3",
    title: "Sherlock Holmes Short Stories (福尔摩斯探案精选)",
    series: "bookworms",
    subCategory: "stage2",
    badge: "书虫系列 · Stage 2 700词",
    badgeColor: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
    age: "12-16 岁 · 经典推理",
    desc: "贝克街 221B 的名侦探福尔摩斯与华生医生，抽丝剥茧破解离奇迷案，中学生经典必读英文推理名篇。",
    wordsCount: 2200,
    duration: "35 分钟",
    color: "from-slate-500/15 via-zinc-500/10 to-transparent border-slate-400/30",
    audioUrl: "/assets/audio/today_challenge.mp3",
    pages: [
      {
        pageNo: 1,
        text: "It was a cold, foggy morning in London when a mysterious knock sounded at the door of 221B Baker Street.",
        translation: "那是伦敦一个寒冷而多雾的清晨，贝克街 221B 的门外突然响起了一阵急促而神秘的敲门声。",
        audioUrl: "/assets/audio/today_challenge.mp3",
      },
    ],
  },
];

export default () => {
  const navigate = useNavigate();
  const [activeSeries, setActiveSeries] = useState<"school" | "home" | "bookworms">("school");
  const [subFilter, setSubFilter] = useState<string>("all");
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);

  // 当前正在全屏精读的绘本及页码
  const [activeReadingBook, setActiveReadingBook] = useState<CuratedBook | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [readingAudioPlaying, setReadingAudioPlaying] = useState<boolean>(false);

  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const pageAudioRef = useRef<HTMLAudioElement | null>(null);

  // 播放/暂停原声伴读试听
  const handlePlaySampleAudio = (audioUrl: string) => {
    if (playingAudioUrl === audioUrl) {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
        sampleAudioRef.current = null;
      }
      setPlayingAudioUrl(null);
      return;
    }

    // 如果之前有正在播放的试听音频，先停止
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
    };
    audio.play().catch(() => {
      setPlayingAudioUrl(null);
      sampleAudioRef.current = null;
    });
  };

  // 开启图文翻页精读伴学
  const handleOpenBookReader = (book: CuratedBook) => {
    // 停止卡片试听
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
      setPlayingAudioUrl(null);
    }
    setActiveReadingBook(book);
    setCurrentPageIndex(0);
    setReadingAudioPlaying(false);
  };

  // 播放/暂停当前页面外教原声伴读
  const handlePlayCurrentPageAudio = () => {
    if (!activeReadingBook) return;
    const page = activeReadingBook.pages[currentPageIndex];
    if (!page?.audioUrl) return;

    // 如果当前正在领读，点击则暂停并重置
    if (readingAudioPlaying) {
      if (pageAudioRef.current) {
        pageAudioRef.current.pause();
        pageAudioRef.current = null;
      }
      setReadingAudioPlaying(false);
      return;
    }

    if (pageAudioRef.current) {
      pageAudioRef.current.pause();
      pageAudioRef.current = null;
    }

    const audio = new Audio(page.audioUrl);
    pageAudioRef.current = audio;
    setReadingAudioPlaying(true);

    audio.onended = () => {
      setReadingAudioPlaying(false);
      pageAudioRef.current = null;
    };
    audio.onerror = () => {
      setReadingAudioPlaying(false);
      pageAudioRef.current = null;
    };
    audio.play().catch(() => {
      setReadingAudioPlaying(false);
      pageAudioRef.current = null;
    });
  };

  // 针对当前绘本页发起语音精准纠音测评
  const handleAssessCurrentPage = () => {
    if (!activeReadingBook) return;
    const page = activeReadingBook.pages[currentPageIndex];
    navigate(
      `/pronunciation_assessments/new?text=${encodeURIComponent(page.text)}&audio=${encodeURIComponent(page.audioUrl || "")}`
    );
  };

  // 过滤展示的书籍列表
  const displayedBooks = CURATED_BOOKS.filter((b) => {
    if (b.series !== activeSeries) return false;
    if (subFilter === "all") return true;
    return b.subCategory === subFilter;
  });

  return (
    <div className="min-h-full px-4 py-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* 顶部横幅 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20 shadow-xs">
            <BookOpenIcon className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                牛津精选绘本 · 官方分级数字伴读馆
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                PDF 原画 + 外教原声伴读
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              纯正英美母语原声朗读 · 点词查词一键进生词本 · 逐页跟读 AI 纠音评测
            </p>
          </div>
        </div>

      </div>

      {/* 第一层：三大系列切换大选项卡 */}
      <Tabs
        value={activeSeries}
        onValueChange={(val: any) => {
          setActiveSeries(val);
          setSubFilter("all");
        }}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 w-full max-w-xl h-14 p-1.5 bg-muted/60 rounded-2xl">
          <TabsTrigger
            value="school"
            className="rounded-xl text-xs md:text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 data-[state=active]:shadow-xs flex items-center gap-1.5"
          >
            <span>🌳 牛津主线·学校版</span>
          </TabsTrigger>
          <TabsTrigger
            value="home"
            className="rounded-xl text-xs md:text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 data-[state=active]:shadow-xs flex items-center gap-1.5"
          >
            <span>🏡 启蒙拼读·家庭版</span>
          </TabsTrigger>
          <TabsTrigger
            value="bookworms"
            className="rounded-xl text-xs md:text-sm font-bold data-[state=active]:bg-background data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 data-[state=active]:shadow-xs flex items-center gap-1.5"
          >
            <span>📚 经典名著·书虫系列</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 第二层：系列内部分级筛选器 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1">
          {activeSeries === "school"
            ? "难度分级："
            : activeSeries === "home"
            ? "专栏分类："
            : "词汇分阶："}
        </span>

        <Button
          variant={subFilter === "all" ? "default" : "outline"}
          size="sm"
          className="rounded-xl text-xs h-8 px-3.5"
          onClick={() => setSubFilter("all")}
        >
          全部书籍
        </Button>

        {activeSeries === "school" && (
          <>
            <Button
              variant={subFilter === "l1-l2" ? "default" : "outline"}
              size="sm"
              className="rounded-xl text-xs h-8 px-3.5"
              onClick={() => setSubFilter("l1-l2")}
            >
              🐣 L1-L2 萌芽启蒙（看图拼读）
            </Button>
            <Button
              variant={subFilter === "l3-l5" ? "default" : "outline"}
              size="sm"
              className="rounded-xl text-xs h-8 px-3.5"
              onClick={() => setSubFilter("l3-l5")}
            >
              🌟 L3-L5 魔法钥匙冒险（情节复述）
            </Button>
            <Button
              variant={subFilter === "l6-l9" ? "default" : "outline"}
              size="sm"
              className="rounded-xl text-xs h-8 px-3.5"
              onClick={() => setSubFilter("l6-l9")}
            >
              🚀 L6-L9 桥梁进阶（思辨表达）
            </Button>
          </>
        )}

        {activeSeries === "home" && (
          <>
            <Button
              variant={subFilter === "phonics" ? "default" : "outline"}
              size="sm"
              className="rounded-xl text-xs h-8 px-3.5"
              onClick={() => setSubFilter("phonics")}
            >
              🔤 自然拼读专练 (Phonics)
            </Button>
            <Button
              variant={subFilter === "stories" ? "default" : "outline"}
              size="sm"
              className="rounded-xl text-xs h-8 px-3.5"
              onClick={() => setSubFilter("stories")}
            >
              📖 趣味第一故事 (First Stories)
            </Button>
          </>
        )}

        {activeSeries === "bookworms" && (
          <>
            <Button
              variant={subFilter === "starter" ? "default" : "outline"}
              size="sm"
              className="rounded-xl text-xs h-8 px-3.5"
              onClick={() => setSubFilter("starter")}
            >
              🥉 Starter 入门级 (250 词)
            </Button>
            <Button
              variant={subFilter === "stage1" ? "default" : "outline"}
              size="sm"
              className="rounded-xl text-xs h-8 px-3.5"
              onClick={() => setSubFilter("stage1")}
            >
              🥈 Stage 1 进阶 (400 词)
            </Button>
            <Button
              variant={subFilter === "stage2" ? "default" : "outline"}
              size="sm"
              className="rounded-xl text-xs h-8 px-3.5"
              onClick={() => setSubFilter("stage2")}
            >
              🥇 Stage 2+ 飞跃 (700-1000 词)
            </Button>
          </>
        )}
      </div>

      {/* 绘本书架卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedBooks.map((book) => (
          <div
            key={book.id}
            className={`p-5 rounded-3xl bg-gradient-to-br ${book.color} border shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group`}
          >
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${book.badgeColor}`}
                >
                  {book.badge}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {book.age}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={book.coverImage || "/assets/qiaobao_sunny240.png"}
                  alt={book.title}
                  className="size-12 rounded-2xl object-cover border-2 border-amber-400/80 shadow-xs group-hover:scale-105 transition-transform shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-foreground font-sans group-hover:text-amber-600 transition-colors line-clamp-1">
                    {book.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span>⏱️ {book.duration}</span>
                    <span>·</span>
                    <span>📝 {book.wordsCount} 词</span>
                    <span>·</span>
                    <span>🎧 原版音频</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {book.desc}
              </p>
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`flex-1 text-xs rounded-xl h-9 gap-1 border-amber-400/50 bg-white/80 dark:bg-black/20 ${
                  playingAudioUrl === book.audioUrl ? "ring-2 ring-amber-500 bg-amber-500/20 text-amber-700 font-bold" : ""
                }`}
                onClick={() => handlePlaySampleAudio(book.audioUrl)}
              >
                {playingAudioUrl === book.audioUrl ? (
                  <>
                    <PauseIcon className="size-3.5 text-amber-600 fill-amber-600" />
                    <span>暂停伴读</span>
                  </>
                ) : (
                  <>
                    <Volume2Icon className="size-3.5 text-amber-600" />
                    <span>听伴读</span>
                  </>
                )}
              </Button>

              <Button
                size="sm"
                className="flex-1 text-xs rounded-xl h-9 bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1 shadow-xs"
                onClick={() => handleOpenBookReader(book)}
              >
                <BookOpenIcon className="size-3.5" />
                <span>开启精读</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {displayedBooks.length === 0 && (
        <div className="text-center py-16 px-4 rounded-3xl bg-muted/20 border border-dashed border-border/80">
          <p className="text-sm font-bold text-foreground mb-1">
            当前分类下暂未上架绘本
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            外教正在加急录制本级别的原声伴读，请先探索其他经典级别哦！
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSubFilter("all")}
            className="rounded-xl text-xs"
          >
            查看全部绘本
          </Button>
        </div>
      )}

      {/* 沉浸式图文翻页精读伴学弹窗 */}
      <Dialog
        open={Boolean(activeReadingBook)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveReadingBook(null);
            setReadingAudioPlaying(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl rounded-3xl p-6 md:p-8">
          {activeReadingBook && (
            <div className="space-y-6">
              {/* 弹窗头部：绘本标题与页码指示器 */}
              <DialogHeader className="space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${activeReadingBook.badgeColor}`}
                    >
                      {activeReadingBook.badge}
                    </span>
                    {activeReadingBook.pdfUrl && (
                      <a
                        href={activeReadingBook.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1 transition-colors"
                      >
                        <span>📄</span> 查看完整原版 PDF
                      </a>
                    )}
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full">
                    第 {currentPageIndex + 1} 页 / 共 {activeReadingBook.pages.length} 页
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {activeReadingBook.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  外教原声领读 · 沉浸式图文精读与发音跟读测评
                </DialogDescription>
              </DialogHeader>

              {/* 绘本图文展示卡片（真实原版高清插画） */}
              <div className="p-4 md:p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                <div className="flex justify-center overflow-hidden rounded-2xl bg-white dark:bg-black/20 border border-amber-300/40 shadow-inner">
                  <img
                    src={
                      activeReadingBook.pages[currentPageIndex]?.image ||
                      activeReadingBook.coverImage ||
                      "/assets/qiaobao_sunny240.png"
                    }
                    alt={`绘本第 ${currentPageIndex + 1} 页画面`}
                    className="w-full max-h-[340px] md:max-h-[380px] object-contain rounded-2xl transition-all duration-300 hover:scale-[1.01]"
                  />
                </div>

                <div className="text-center space-y-2 pt-1">
                  <p className="text-xl md:text-2xl font-bold text-foreground font-sans tracking-wide leading-relaxed">
                    "{activeReadingBook.pages[currentPageIndex]?.text}"
                  </p>
                </div>
              </div>

              {/* 伴读控制条：外教领读、逐页跟读评测、收藏生词 */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-border/40">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 md:flex-none rounded-xl text-xs gap-1.5 h-10 border-amber-400/60 ${
                      readingAudioPlaying ? "bg-amber-500/20 text-amber-700 font-bold" : ""
                    }`}
                    onClick={handlePlayCurrentPageAudio}
                  >
                    {readingAudioPlaying ? (
                      <>
                        <PauseIcon className="size-4 text-amber-600 fill-amber-600" />
                        <span>暂停领读</span>
                      </>
                    ) : (
                      <>
                        <Volume2Icon className="size-4 text-amber-600" />
                        <span>外教原声领读</span>
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    className="flex-1 md:flex-none rounded-xl text-xs gap-1.5 h-10 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs"
                    onClick={handleAssessCurrentPage}
                  >
                    <MicIcon className="size-4" />
                    <span>跟读这一页打分</span>
                  </Button>
                </div>

                {/* 翻页按钮 */}
                <div className="flex items-center gap-2 justify-end w-full md:w-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPageIndex === 0}
                    onClick={() => {
                      setCurrentPageIndex((prev) => Math.max(0, prev - 1));
                      setReadingAudioPlaying(false);
                    }}
                    className="rounded-xl text-xs h-9 gap-1"
                  >
                    <ChevronLeftIcon className="size-4" />
                    <span>上一页</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPageIndex >= activeReadingBook.pages.length - 1}
                    onClick={() => {
                      setCurrentPageIndex((prev) =>
                        Math.min(activeReadingBook.pages.length - 1, prev + 1)
                      );
                      setReadingAudioPlaying(false);
                    }}
                    className="rounded-xl text-xs h-9 gap-1"
                  >
                    <span>下一页</span>
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

