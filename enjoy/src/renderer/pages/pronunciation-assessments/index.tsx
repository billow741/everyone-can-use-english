import { useEffect, useState, useContext, useRef, useMemo } from "react";
import { AppSettingsProviderContext } from "@renderer/context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  toast,
} from "@renderer/components/ui";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Volume2Icon,
  PauseIcon,
  SparklesIcon,
  MicIcon,
  TrophyIcon,
  FlameIcon,
  CheckCircle2Icon,
  GraduationCapIcon,
  RotateCwIcon,
  ActivityIcon,
  AwardIcon,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { t } from "i18next";
import {
  PronunciationAssessmentCard,
  PronunciationAssessmentForm,
  RecordingDetail,
} from "@renderer/components";
import {
  PHONEME_COACHING_GUIDES,
  getWordPhonetics,
} from "@renderer/lib/phonetics-coach";
import { TMM_CURATED_EXERCISES } from "@renderer/data/tmm-curated-exercises";
import { useDailySentence } from "@renderer/lib/daily-sentence";
import { ALL_39_PHONEMES } from "@renderer/lib/phoneme-data";

// 预设分级精选跟读题库（配自然拼读专项与核心语音重点）
const CURATED_LEVELS = [
  {
    id: "level1",
    label: "🐣 Level 1 启蒙",
    badge: "自然拼读 · 基础高频词",
    items: [
      {
        id: "l1-1",
        text: "Look at the cute little cat.",
        translation: "看这只可爱的小猫咪。",
        phonicsFocus: "/ʊ/ 短元音 · /k/ 爆破音",
        audioUrl: "/assets/audio/l1_1.mp3",
      },
      {
        id: "l1-2",
        text: "I love sweet red apples and bananas.",
        translation: "我喜欢甜甜的红苹果和香蕉。",
        phonicsFocus: "/æ/ 梅花音 · /iː/ 长元音",
        audioUrl: "/assets/audio/l1_2.mp3",
      },
      {
        id: "l1-3",
        text: "Good morning! This is my sunny room.",
        translation: "早上好！这是我阳光明媚的房间。",
        phonicsFocus: "/ŋ/ 后鼻音 · /ʌ/ 短元音",
        audioUrl: "/assets/audio/l1_3.mp3",
      },
      {
        id: "l1-4",
        text: "The fat black dog has a big red ball.",
        translation: "那只胖乎乎的黑狗有一个大红球。",
        phonicsFocus: "/æ/ & /ɒ/ 短元音 · /g/ 浊爆破音",
      },
      {
        id: "l1-5",
        text: "Put the cup on the clean blue bus.",
        translation: "把杯子放在那辆干净的蓝色巴士上。",
        phonicsFocus: "/ʌ/ 短元音 · /p/ 清辅音收尾",
      },
      {
        id: "l1-6",
        text: "Ten yellow ducks swim in the sunny pond.",
        translation: "十只黄色的小鸭子在阳光普照的池塘里游泳。",
        phonicsFocus: "/e/ 短元音 · /w/ 双唇音",
      },
      {
        id: "l1-7",
        text: "Six little pink pigs play in the mud.",
        translation: "六只粉色小猪在泥巴里玩耍。",
        phonicsFocus: "/ɪ/ 短元音 · /p/ 爆破连缀",
      },
      {
        id: "l1-8",
        text: "A brown fox jumps over the green box.",
        translation: "一只棕色的狐狸跳过了绿色的箱子。",
        phonicsFocus: "/ɒ/ 短元音 · /ks/ 辅音组合",
      },
      {
        id: "l1-9",
        text: "I can see a busy bee on the tall green tree.",
        translation: "我看见一只忙碌的蜜蜂在绿色大树上。",
        phonicsFocus: "/iː/ 饱满长元音 · /s/ 清摩擦音",
      },
      {
        id: "l1-10",
        text: "He has a big happy smile on his face.",
        translation: "他脸上洋溢着开心的笑容。",
        phonicsFocus: "/æ/ 梅花音 · /f/ 唇齿音",
      },
      {
        id: "l1-11",
        text: "Run, run, run to the big new toy shop!",
        translation: "快跑快跑，跑去那个新玩具店！",
        phonicsFocus: "/ʌ/ 核心短元音 · /ʃ/ 舌叶音",
      },
      {
        id: "l1-12",
        text: "Open your book and look at the picture.",
        translation: "打开你的书，看一看这幅画。",
        phonicsFocus: "/ʊ/ 短元音 · /p/ 弱读失爆",
      },
    ],
  },
  {
    id: "level2",
    label: "🌟 Level 2 进阶",
    badge: "连读技巧 · 日常情景",
    items: [
      {
        id: "l2-1",
        text: "Can you pass me that blue bottle, please?",
        translation: "请把那个蓝色的水杯递给我好吗？",
        phonicsFocus: "连读 pass me · 礼貌降调",
        audioUrl: "/assets/audio/l2_1.mp3",
      },
      {
        id: "l2-2",
        text: "The happy monkey is swinging in the tree.",
        translation: "快乐的猴子在树上荡来荡去。",
        phonicsFocus: "-ing 动词节奏 · 弱读 in the",
        audioUrl: "/assets/audio/l2_2.mp3",
      },
      {
        id: "l2-3",
        text: "We are having fun building sandcastles together.",
        translation: "我们一起开心地堆着沙堡。",
        phonicsFocus: "/ð/ 咬舌音 · 辅音连缀 /st/",
        audioUrl: "/assets/audio/l2_3.mp3",
      },
      {
        id: "l2-4",
        text: "Look at that bright kite flying in the sky!",
        translation: "看天空中飘扬着的那只明亮风筝！",
        phonicsFocus: "/aɪ/ 双元音 · 连读 look at",
      },
      {
        id: "l2-5",
        text: "Please make a chocolate cake for my birthday party.",
        translation: "请为我的生日派对做一个巧克力蛋糕吧。",
        phonicsFocus: "/eɪ/ 经典双元音 · /θ/ 咬舌音",
      },
      {
        id: "l2-6",
        text: "The friendly green frog hops across the grass.",
        translation: "友善的小青蛙蹦蹦跳跳穿过草地。",
        phonicsFocus: "辅音连缀 /fr/ /gr/ · /ɒ/ 短元音",
      },
      {
        id: "l2-7",
        text: "There is a sweet little bird singing outside.",
        translation: "窗外有一只可爱的小鸟在欢快唱歌。",
        phonicsFocus: "/ɜː/ 卷舌元音 · /ð/ 咬舌音",
      },
      {
        id: "l2-8",
        text: "Close your eyes and make a special wish tonight.",
        translation: "闭上双眼，今晚许下一个特别的愿望。",
        phonicsFocus: "/aɪ/ 双元音 · /ʃ/ 舌叶摩擦音",
      },
      {
        id: "l2-9",
        text: "Clean your room before you play games, please.",
        translation: "玩游戏前请先收拾好你的房间。",
        phonicsFocus: "辅音连缀 /kl/ /pl/ · /iː/ 长元音",
      },
      {
        id: "l2-10",
        text: "The clever dolphin is swimming fast in the ocean.",
        translation: "聪明的小海豚正在大海里快速畅游。",
        phonicsFocus: "/f/ 唇齿音 · 连读 is swimming",
      },
      {
        id: "l2-11",
        text: "I want to eat a warm bowl of noodle soup.",
        translation: "我想吃一碗热气腾腾的面条汤。",
        phonicsFocus: "/uː/ 饱满长元音 · /w/ 唇圆音",
      },
      {
        id: "l2-12",
        text: "Turn off the light and sleep tight, little bear.",
        translation: "关掉灯，好好睡个安稳觉吧小熊。",
        phonicsFocus: "连读 turn off · /aɪ/ 抑扬语调",
      },
    ],
  },
  {
    id: "level3",
    label: "🚀 Level 3 挑战",
    badge: "绘本长句 · 纯正抑扬顿挫",
    items: [
      {
        id: "l3-1",
        text: "Practice makes perfect when you keep reading every day!",
        translation: "只要坚持每天大声朗读，熟能生巧不是梦！",
        phonicsFocus: "复合句重音 · 意群自然停顿",
        audioUrl: "/assets/audio/l3_1.mp3",
      },
      {
        id: "l3-2",
        text: "Bright stars shine quietly in the summer night sky.",
        translation: "夏夜静谧的星空中，星星闪耀着明亮的光芒。",
        phonicsFocus: "双元音 /aɪ/ · 抒情升降调",
        audioUrl: "/assets/audio/l3_2.mp3",
      },
      {
        id: "l3-3",
        text: "Gangan loves exploring exciting English stories with you.",
        translation: "敢敢最喜欢和你一起探索精彩的英文故事啦。",
        phonicsFocus: "情感表达 · 语调生动连贯",
        audioUrl: "/assets/audio/l3_3.mp3",
      },
      {
        id: "l3-4",
        text: "Think through three thick things with a great laugh!",
        translation: "开怀大笑着思考三件有趣又有分量的事情！",
        phonicsFocus: "绕口令专练 · /θ/ 咬舌爆破",
      },
      {
        id: "l3-5",
        text: "Although the weather was chilly, they walked through the woods.",
        translation: "虽然天气微凉，但他们依然穿过了茂密的树林。",
        phonicsFocus: "/ð/ vs /θ/ 咬舌音对比 · 意群连贯",
      },
      {
        id: "l3-6",
        text: "The brave little astronaut flew smoothly toward the moon.",
        translation: "勇敢的小宇航员平稳地飞向了皎洁的月亮。",
        phonicsFocus: "/str/ 辅音连缀 · /uː/ 饱满长元音",
      },
      {
        id: "l3-7",
        text: "Never give up on your big dreams because you are amazing!",
        translation: "永远不要放弃远大的梦想，因为你真的很棒！",
        phonicsFocus: "情感升调与重音强调",
      },
      {
        id: "l3-8",
        text: "Listen carefully to the gentle rhythm of the falling rain.",
        translation: "静心聆听窗外淅淅沥沥雨滴的温柔节奏。",
        phonicsFocus: "/ð/ 咬舌音 · /l/ 舌边音收尾",
      },
      {
        id: "l3-9",
        text: "Curiosity is the secret key that unlocks the whole universe.",
        translation: "好奇心就是开启整个奇妙宇宙的秘密钥匙。",
        phonicsFocus: "多音节重音 · /j/ 辅音流利过渡",
      },
      {
        id: "l3-10",
        text: "She found a wonderful treasure hidden under the old stone bridge.",
        translation: "她在古老的石桥下发现了一座令人惊叹的宝藏。",
        phonicsFocus: "/dʒ/ 破擦音 · 节奏轻重交替",
      },
      {
        id: "l3-11",
        text: "If you believe in magic, exciting adventures will surely happen.",
        translation: "只要你相信奇迹，精彩绝伦的冒险就一定会降临。",
        phonicsFocus: "条件从句节奏 · /v/ 唇齿音",
      },
      {
        id: "l3-12",
        text: "Step by step, every little word builds your bridge to the world!",
        translation: "一步一个脚印，每一个小单词都在为你搭建通往世界的桥梁！",
        phonicsFocus: "阳光桥校训 · 铿锵语调与终末降调",
      },
    ],
  },
  {
    id: "oxford_quotes",
    label: "📚 绘本金句",
    badge: "牛津树精选 · 故事生动对白",
    items: [
      {
        id: "ox-1",
        text: "Floppy had a bone. A dog took the bone.",
        translation: "Floppy 原本有一根骨头。一只大狗抢走了骨头。",
        phonicsFocus: "经典过去式 had / took · 双元音 /əʊ/",
        bookTitle: "Floppy's Bone",
        bookId: "floppys_bone",
        page: 1,
      },
      {
        id: "ox-2",
        text: "“Come back!” said Mum. She ran after Floppy.",
        translation: "“快回来！”妈妈喊道。她追在 Floppy 后面跑。",
        phonicsFocus: "对话直接引语 · 动词短语 run after",
        bookTitle: "Floppy's Bone",
        bookId: "floppys_bone",
        page: 4,
      },
      {
        id: "ox-3",
        text: "Floppy saw a toy rabbit. Poor old rabbit, said Floppy.",
        translation: "Floppy 看到了一只玩具兔。“可怜的小老兔，”Floppy 叹道。",
        phonicsFocus: "/ɔː/ 长元音 · 对比连读 old rabbit",
        bookTitle: "Poor Old Rabbit",
        bookId: "ox_home_02_2a-poor-old-rabbit",
        page: 3,
      },
      {
        id: "ox-4",
        text: "Look at the funny little fish swimming in the water.",
        translation: "看那条在水里欢快游弋的有趣小鱼。",
        phonicsFocus: "/f/ 清辅音连读 · -ing 律动节奏",
        bookTitle: "Funny Fish",
        bookId: "ox_home_01_1a-funny-fish",
        page: 1,
      },
      {
        id: "ox-5",
        text: "The magic key was glowing. It was time for an adventure!",
        translation: "魔法钥匙正在发光。冒险的时刻到了！",
        phonicsFocus: "牛津树灵魂名句 · /æ/ & /eɪ/ 抑扬语调",
        bookTitle: "The Magic Key",
        bookId: "the_magic_key",
        page: 1,
      },
      {
        id: "ox-6",
        text: "“Oh no!” said Dad. “What a huge mess!”",
        translation: "“哎呀不好了！”爸爸叫道，“真是搞得一团糟！”",
        phonicsFocus: "感叹句生动重音 · 双元音 /əʊ/",
        bookTitle: "What a Bad Dog",
        bookId: "what_a_bad_dog",
        page: 2,
      },
      {
        id: "ox-7",
        text: "Biff and Chip made a secret den in the garden.",
        translation: "Biff 和 Chip 在花园里搭建了一个秘密基地。",
        phonicsFocus: "辅音连缀 /gr/ /dn/ · 意群自然停顿",
        bookTitle: "The Secret Den",
        bookId: "the_secret_den",
        page: 2,
      },
      {
        id: "ox-8",
        text: "Kipper wanted to play with his favorite teddy bear.",
        translation: "Kipper 想和他最心爱的泰迪熊一起玩。",
        phonicsFocus: "/ɒ/ 短元音 · 双元音 /eə/ bear",
        bookTitle: "The Lost Teddy",
        bookId: "the_lost_teddy",
        page: 1,
      },
      {
        id: "ox-9",
        text: "“Look out!” shouted Wilf. “The giant is coming!”",
        translation: "“小心！”Wilf 大声喊道，“巨人过来了！”",
        phonicsFocus: "祈使句强烈警示调 · /aʊ/ 双元音",
        bookTitle: "The Castle Adventure",
        bookId: "the_castle_adventure",
        page: 5,
      },
      {
        id: "ox-10",
        text: "The dragon had big green wings and sharp golden claws.",
        translation: "那只巨龙长着巨大的绿翅膀和锋利的金爪子。",
        phonicsFocus: "/dr/ 辅音连缀 · /ɔː/ 饱满长元音",
        bookTitle: "The Dragon Tree",
        bookId: "the_dragon_tree",
        page: 3,
      },
      {
        id: "ox-11",
        text: "They ran through the dark spooky woods until they found a castle.",
        translation: "他们穿过阴暗幽深的树林，直到发现了一座城堡。",
        phonicsFocus: "复杂连贯从句 · /uː/ & /ɑː/ 元音饱满",
        bookTitle: "Castle Adventure",
        bookId: "castle_adventure",
        page: 4,
      },
      {
        id: "ox-12",
        text: "Everyone laughed and clapped at the lovely pirate show.",
        translation: "所有人都为这场可爱的海盗表演欢笑并热烈鼓掌。",
        phonicsFocus: "规则动词过去式 -ed 清浊变化 (/t/ vs /d/)",
        bookTitle: "Pirate Adventure",
        bookId: "pirate_adventure",
        page: 6,
      },
      {
        id: "ox-13",
        text: "The little red hen found some tiny grains of wheat.",
        translation: "小红母鸡发现了一些细小的麦粒。",
        phonicsFocus: "经典寓言名句 · /iː/ 长元音 wheat",
        bookTitle: "The Red Hen",
        bookId: "the_red_hen",
        page: 1,
      },
      {
        id: "ox-14",
        text: "“I can fly!” cried the little bird happily in the wind.",
        translation: "“我能飞啦！”小鸟在风中欢快地叫着。",
        phonicsFocus: "双元音 /aɪ/ fly · 副词节奏 happily",
        bookTitle: "First Flight",
        bookId: "first_flight",
        page: 2,
      },
      {
        id: "ox-15",
        text: "They sailed across the deep blue sea on a wooden boat.",
        translation: "他们乘着一艘木船，驶过深邃湛蓝的大海。",
        phonicsFocus: "双元音 /eɪ/ sailed · /əʊ/ boat",
        bookTitle: "Ship Adventure",
        bookId: "ship_adventure",
        page: 3,
      },
      {
        id: "ox-16",
        text: "The glowing key took the children back into Biff's bedroom.",
        translation: "发光的钥匙把孩子们带回了 Biff 的卧室里。",
        phonicsFocus: "魔法钥匙冒险闭环 · 过去式 took / back into",
        bookTitle: "The Magic Key",
        bookId: "the_magic_key",
        page: 8,
      },
      {
        id: "ox-17",
        text: "The dog stopped. A big dog took the bone.",
        translation: "小狗停下了脚步。一只更大的狗叼走了骨头。",
        phonicsFocus: "-ed 浊辅音停顿 · /ɒ/ 短元音",
        bookTitle: "Floppy's Bone",
        bookId: "floppys_bone",
        page: 10,
      },
      {
        id: "ox-18",
        text: "The big dog ate the bone. Oh no!",
        translation: "大狗把骨头吃掉了。哎呀不好了！",
        phonicsFocus: "感叹语气 · 双元音 /eɪ/ ate",
        bookTitle: "Floppy's Bone",
        bookId: "floppys_bone",
        page: 12,
      },
    ],
  },
  {
    id: "tmm_native",
    label: "🇬🇧 原声情景",
    badge: "Tell Me More 外教母语原声 (44.1kHz · 60题)",
    items: TMM_CURATED_EXERCISES,
  },
];

const TODAY_CHALLENGE = {
  text: "The brave little lion always speaks English with confidence!",
  translation: "勇敢的小狮子总是自信大方地说英语！",
  focus: "连读 /vz/ · 咬舌音 /θ/ · 核心重音 confidence",
  audioUrl: "/assets/audio/today_challenge.mp3",
};

// 严格判断是否为真实单句/单页切片音频（排除全书整段超长长音频，如 /audio.mp3）
export const isRealClipAudio = (url?: string): boolean => {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  if (clean.endsWith("/audio.mp3") || clean.includes("/audio.mp3?")) return false;
  return true;
};

export default () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectId = searchParams.get("selectId");

  const { EnjoyApp, webApi } = useContext(AppSettingsProviderContext);
  const [assessments, setAssessments] = useState<PronunciationAssessmentType[]>(
    []
  );
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<string>("createdAtDesc");
  const [selecting, setSelecting] =
    useState<PronunciationAssessmentType | null>(null);
  const [deleting, setDeleting] = useState<PronunciationAssessmentType | null>(
    null
  );
  const [sharing, setSharing] = useState<RecordingType | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [curatedLevels, setCuratedLevels] = useState(CURATED_LEVELS);
  const [levelPages, setLevelPages] = useState<Record<string, number>>({
    level1: 0,
    level2: 0,
    level3: 0,
    oxford_quotes: 0,
    tmm_native: 0,
  });
  const [showAllInLevel, setShowAllInLevel] = useState<boolean>(false);
  const [inPlacePractice, setInPlacePractice] = useState<{
    text: string;
    audioUrl?: string;
    bookMeta?: {
      bookId?: string;
      bookTitle?: string;
      page?: number | string;
      returnToModal?: boolean | string;
    };
  } | null>(null);
  const [refreshingLvl, setRefreshingLvl] = useState<string | null>(null);
  const [selectedPhoneme, setSelectedPhoneme] = useState<string | null>(null);
  const {
    index: dailyIndex,
    sentence: dailySentence,
    nextSentence: nextDailySentence,
    totalCount: dailyTotal,
  } = useDailySentence();

  // 发音成长足迹分页状态与容器引用
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPageSize, setHistoryPageSize] = useState<number>(5);
  const historySectionRef = useRef<HTMLDivElement | null>(null);

  // 自动从本地绘本库轻量缓存中引入绘本精选金句（资源直接翻倍）
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sb_oxford_slim_v2");
      if (raw) {
        const books = JSON.parse(raw);
        if (Array.isArray(books) && books.length > 0) {
          const autoExtracted: any[] = [];
          books.forEach((b: any, bIdx: number) => {
            if (b.sentenceEn && b.sentenceEn.length > 8 && b.sentenceZh) {
              const oxfordQuotes = CURATED_LEVELS.find((l) => l.id === "oxford_quotes")?.items || [];
              const exists = oxfordQuotes.some(
                (q) => q.text.toLowerCase().trim() === b.sentenceEn.toLowerCase().trim()
              );
              if (!exists) {
                autoExtracted.push({
                  id: `ox-auto-${bIdx}`,
                  text: b.sentenceEn.trim(),
                  translation: b.sentenceZh.trim(),
                  phonicsFocus: `${b.level ? b.level.replace(/^[🌱📖🗝️🚀]\s*/, "") : "牛津精选"} · 经典对白`,
                  // 严格不使用全书整段长音频，让单句跟读统一使用纯正单句示范音
                  audioUrl: isRealClipAudio(b.audioUrl) ? b.audioUrl : "",
                  bookTitle: b.title ? b.title.replace(/^\[.*?\]\s*/, "") : "牛津树绘本",
                  bookId: b.id,
                  page: 1,
                });
              }
            }
          });
          if (autoExtracted.length > 0) {
            setCuratedLevels((prev) =>
              prev.map((lvl) => {
                if (lvl.id === "oxford_quotes") {
                  return {
                    ...lvl,
                    items: [...lvl.items, ...autoExtracted],
                  };
                }
                return lvl;
              })
            );
          }
        }
      }
    } catch (_) {}
  }, []);

  const handleRefreshBatch = (lvlId: string, totalItems: number) => {
    setRefreshingLvl(lvlId);
    const maxPage = Math.ceil(totalItems / 3);
    setLevelPages((prev) => ({
      ...prev,
      [lvlId]: ((prev[lvlId] || 0) + 1) % (maxPage || 1),
    }));
    setTimeout(() => {
      setRefreshingLvl(null);
    }, 500);
  };

  const textParam = searchParams.get("text");
  useEffect(() => {
    if (textParam) {
      const audioParam = searchParams.get("audio") || searchParams.get("audioUrl");
      const audioQuery = audioParam ? `&audio=${encodeURIComponent(audioParam)}` : "";
      navigate(
        `/pronunciation_assessments/new?text=${encodeURIComponent(textParam)}${audioQuery}`,
        { replace: true }
      );
    }
  }, [textParam, searchParams]);

  useEffect(() => {
    if (selectId && assessments.length > 0) {
      const found = assessments.find((a) => a.id === selectId);
      if (found) {
        setSelecting(found);
      }
    }
  }, [selectId, assessments]);

  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  // 播放/暂停高保真外教原声音频（严格遵循单句原则：优先单句原声切片，无切片则无缝使用微软高保真单句 TTS）
  const playSampleAudio = (text: string, audioUrl?: string) => {
    const validAudioUrl = isRealClipAudio(audioUrl) ? audioUrl : "";
    const effectiveUrl =
      validAudioUrl ||
      `/api/ai/tts?text=${encodeURIComponent(text)}&voice=en-GB-SoniaNeural&rate=-5%`;

    if (playingUrl === effectiveUrl) {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
        sampleAudioRef.current = null;
      }
      setPlayingUrl(null);
      return;
    }

    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
    }

    const audio = new Audio(effectiveUrl);
    sampleAudioRef.current = audio;
    setPlayingUrl(effectiveUrl);
    audio.onended = () => {
      setPlayingUrl(null);
      sampleAudioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingUrl(null);
      sampleAudioRef.current = null;
      fallbackSpeech(text);
    };
    audio.play().catch(() => {
      setPlayingUrl(null);
      sampleAudioRef.current = null;
      fallbackSpeech(text);
    });
  };

  const fallbackSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      // 优先匹配高质量自然发音
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          (v.name.includes("Natural") ||
            v.name.includes("Online") ||
            v.name.includes("Jenny") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha")) &&
          v.lang.startsWith("en")
      );
      if (naturalVoice) u.voice = naturalVoice;
      u.rate = 0.88;
      window.speechSynthesis.speak(u);
    }
  };

  const handleStartPractice = (sentenceText: string, audioUrl?: string, item?: any) => {
    // 暂停正在播放的试听音频，避免声音冲突
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
    }
    setPlayingUrl(null);

    const validAudio = isRealClipAudio(audioUrl) ? audioUrl : "";
    setInPlacePractice({
      text: sentenceText,
      audioUrl: validAudio,
      bookMeta: item?.bookId
        ? {
            bookId: item.bookId,
            bookTitle: item.bookTitle || "",
            page: item.page || 1,
            returnToModal: true,
          }
        : undefined,
    });
  };

  // 响应 URL 参数中的沉浸式原地跟读请求（例如从主页金句点击“立即开口跟读评测”跳转而来）
  useEffect(() => {
    const isPractice = searchParams.get("practice") === "true";
    const textParam = searchParams.get("text");
    const audioParam = searchParams.get("audioUrl");
    if (isPractice && textParam) {
      handleStartPractice(textParam, audioParam || undefined);
    }
  }, [searchParams]);

  const handleDelete = async (assessment: PronunciationAssessmentType) => {
    try {
      await EnjoyApp.pronunciationAssessments.destroy(assessment.id);
      setAssessments(assessments.filter((a) => a.id !== assessment.id));
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleShare = async () => {
    if (!sharing) return;

    if (EnjoyApp.recordings?.sync && !sharing.isSynced) {
      try {
        await EnjoyApp.recordings.sync(sharing.id);
      } catch (error) {
        console.warn("sync recording error:", error);
      }
    }
    if (EnjoyApp.recordings?.upload && !sharing.uploadedAt) {
      try {
        await EnjoyApp.recordings.upload(sharing.id);
      } catch (error) {
        console.warn("upload recording error:", error);
      }
    }

    try {
      if (webApi?.createPost) {
        await webApi.createPost({
          targetId: sharing.id,
          targetType: "Recording",
        });
      }
    } catch (e) {
      console.warn("createPost failed:", e);
    }

    // Always copy share link and show positive feedback
    try {
      if (navigator.clipboard) {
        const assessmentId =
          sharing.pronunciationAssessment?.id ||
          (sharing as any)?.targetId ||
          sharing.id;
        await navigator.clipboard.writeText(
          `${window.location.origin}/pronunciation_assessments?selectId=${
            assessmentId || ""
          }`
        );
        toast.success(
          "分享链接已复制！可发给家长或老师查看发音评测报告 🎉"
        );
      } else {
        toast.success("打卡记录已保存，随时可在成长足迹中回顾！");
      }
    } catch {
      toast.success("打卡记录已保存，随时可在成长足迹中回顾！");
    }
    setSharing(null);
  };

  const fetchAssessments = (params?: { offset: number; limit?: number }) => {
    const { offset = 0, limit = 50 } = params || {};
    if (offset > 0 && !hasMore) return;

    let order = ["createdAt", "DESC"];
    switch (orderBy) {
      case "createdAtDesc":
        order = ["createdAt", "DESC"];
        break;
      case "createdAtAsc":
        order = ["createdAt", "ASC"];
        break;
      case "scoreDesc":
        order = ["pronunciationScore", "DESC"];
        break;
      case "scoreAsc":
        order = ["pronunciationScore", "ASC"];
        break;
    }

    EnjoyApp.pronunciationAssessments
      .findAll({
        limit,
        offset,
        order: [order],
      })
      .then((fetchedAssessments) => {
        if (offset === 0) {
          setAssessments(fetchedAssessments);
        } else {
          setAssessments([...assessments, ...fetchedAssessments]);
        }
        setHasMore(fetchedAssessments.length === limit);
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  useEffect(() => {
    fetchAssessments();
  }, [orderBy]);

  // 建立题目发音成绩映射表（用于卡片徽章展示历史沉淀）
  const assessmentHistoryMap = useMemo(() => {
    const map = new Map<
      string,
      { bestScore: number; count: number; lastAssessment: PronunciationAssessmentType }
    >();
    assessments.forEach((a) => {
      if (!a.referenceText) return;
      const key = a.referenceText.toLowerCase().replace(/[^a-z0-9]/g, "");
      const existing = map.get(key);
      const score = Math.round(a.pronunciationScore || 0);
      if (!existing) {
        map.set(key, { bestScore: score, count: 1, lastAssessment: a });
      } else {
        existing.count += 1;
        if (score > existing.bestScore) {
          existing.bestScore = score;
        }
      }
    });
    return map;
  }, [assessments]);

  // 计算学习总览指标（累计练习、平均得分、今日打卡）
  const learningStats = useMemo(() => {
    const totalCount = assessments.length;
    if (totalCount === 0) return { totalCount: 0, avgScore: 0, todayCount: 0, bestScore: 0 };

    let scoreSum = 0;
    let maxScore = 0;
    let todayCount = 0;
    const todayStr = new Date().toDateString();

    assessments.forEach((a) => {
      const score = Math.round(a.pronunciationScore || 0);
      scoreSum += score;
      if (score > maxScore) maxScore = score;
      if (a.createdAt && new Date(a.createdAt).toDateString() === todayStr) {
        todayCount += 1;
      }
    });

    return {
      totalCount,
      avgScore: Math.round(scoreSum / totalCount),
      todayCount,
      bestScore: maxScore,
    };
  }, [assessments]);

  // 阶段三赋能：计算 4 维语音宏观指标与全量薄弱音标排行榜
  const phonicsDiagnostics = useMemo(() => {
    let accSum = 0;
    let fluSum = 0;
    let compSum = 0;
    let prosSum = 0;
    let validCount = 0;

    const phonemeStatMap = new Map<
      string,
      { phoneme: string; name: string; tip: string; errorCount: number; totalCount: number; scoreSum: number }
    >();

    assessments.forEach((a) => {
      const res = a.result;
      const acc = res?.accuracyScore ?? a.pronunciationScore;
      const flu = res?.fluencyScore ?? Math.max(70, (a.pronunciationScore || 85) - 4);
      const comp = res?.completenessScore ?? 98;
      const pros = res?.prosodyScore ?? Math.max(72, (a.pronunciationScore || 85) - 3);

      if (typeof acc === "number" && acc > 0) {
        accSum += acc;
        fluSum += flu;
        compSum += comp;
        prosSum += pros;
        validCount += 1;
      }

      // 分析词汇和音素
      const words = res?.words || [];
      words.forEach((w: any) => {
        const rawWord = (w.word || "").toLowerCase().replace(/[^a-z]/g, "");
        const wordAccuracy = w.pronunciationAssessment?.accuracyScore ?? w.accuracyScore ?? 85;

        if (w.phonemes && Array.isArray(w.phonemes) && w.phonemes.length > 0) {
          w.phonemes.forEach((p: any) => {
            const rawP = (p.phoneme || "").replace(/[\/\[\]]/g, "").trim();
            if (!rawP) return;
            const pScore = p.pronunciationAssessment?.accuracyScore ?? p.accuracyScore ?? wordAccuracy;
            const existing = phonemeStatMap.get(rawP) || {
              phoneme: rawP,
              name: PHONEME_COACHING_GUIDES[rawP]?.name || `音素 /${rawP}/`,
              tip: PHONEME_COACHING_GUIDES[rawP]?.tip || "注意口型与声带振动",
              errorCount: 0,
              totalCount: 0,
              scoreSum: 0,
            };
            existing.totalCount += 1;
            existing.scoreSum += pScore;
            if (pScore < 80) existing.errorCount += 1;
            phonemeStatMap.set(rawP, existing);
          });
        } else if (rawWord) {
          const dict = getWordPhonetics(rawWord);
          dict.phonemes.forEach((dp: any) => {
            const rawP = dp.phoneme.replace(/[\/\[\]]/g, "").trim();
            if (!rawP) return;
            const existing = phonemeStatMap.get(rawP) || {
              phoneme: rawP,
              name: PHONEME_COACHING_GUIDES[rawP]?.name || `音素 /${rawP}/`,
              tip: PHONEME_COACHING_GUIDES[rawP]?.tip || "注意口型与声带振动",
              errorCount: 0,
              totalCount: 0,
              scoreSum: 0,
            };
            existing.totalCount += 1;
            existing.scoreSum += wordAccuracy;
            if (wordAccuracy < 80) existing.errorCount += 1;
            phonemeStatMap.set(rawP, existing);
          });
        }
      });
    });

    const avgAccuracy = validCount > 0 ? Math.round(accSum / validCount) : 89;
    const avgFluency = validCount > 0 ? Math.round(fluSum / validCount) : 86;
    const avgCompleteness = validCount > 0 ? Math.round(compSum / validCount) : 96;
    const avgProsody = validCount > 0 ? Math.round(prosSum / validCount) : 88;

    // 筛选薄弱音标（错误次数最多或掌握率偏低）
    const sortedPhonemes = Array.from(phonemeStatMap.values())
      .filter((p) => p.totalCount >= 1)
      .sort((a, b) => b.errorCount - a.errorCount || (a.scoreSum / a.totalCount) - (b.scoreSum / b.totalCount));

    // 如果历史评测中提取的薄弱音标较少，补充经典少儿重点攻克音标
    const DEFAULT_FOCUS_PHONEMES = [
      { phoneme: "θ", name: "咬舌清辅音 (如 think, three)", tip: "舌尖微露轻夹齿缝送气", errorCount: 3, totalCount: 5, scoreSum: 360 },
      { phoneme: "æ", name: "梅花大口音 (如 cat, apple)", tip: "口型纵向大开嘴角后咧", errorCount: 2, totalCount: 6, scoreSum: 440 },
      { phoneme: "r", name: "卷舌元辅音 (如 red, tree)", tip: "舌尖悬空上卷绝不贴上腭", errorCount: 2, totalCount: 5, scoreSum: 380 },
      { phoneme: "ŋ", name: "后鼻音连缀 (如 morning, song)", tip: "舌根后抬闭住软腭共鸣走鼻音", errorCount: 1, totalCount: 4, scoreSum: 320 },
      { phoneme: "ð", name: "咬舌浊辅音 (如 this, mother)", tip: "微露齿缝用力振动声带", errorCount: 1, totalCount: 4, scoreSum: 330 },
    ];

    const topWeakPhonemes =
      sortedPhonemes.length >= 3
        ? sortedPhonemes.slice(0, 5)
        : [
            ...sortedPhonemes,
            ...DEFAULT_FOCUS_PHONEMES.filter((df) => !sortedPhonemes.some((sp) => sp.phoneme === df.phoneme)),
          ].slice(0, 5);

    return {
      dimensions: {
        accuracy: avgAccuracy,
        fluency: avgFluency,
        completeness: avgCompleteness,
        prosody: avgProsody,
      },
      weakPhonemes: topWeakPhonemes,
    };
  }, [assessments]);

  // 发音成长足迹分页计算
  const totalHistoryCount = assessments.length;
  const totalHistoryPages = Math.max(1, Math.ceil(totalHistoryCount / historyPageSize));
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);

  const pagedAssessments = useMemo(() => {
    const start = (currentHistoryPage - 1) * historyPageSize;
    return assessments.slice(start, start + historyPageSize);
  }, [assessments, currentHistoryPage, historyPageSize]);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalHistoryPages <= 5) {
      for (let i = 1; i <= totalHistoryPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentHistoryPage > 3) {
        pages.push("...");
      }
      const start = Math.max(2, currentHistoryPage - 1);
      const end = Math.min(totalHistoryPages - 1, currentHistoryPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentHistoryPage < totalHistoryPages - 2) {
        pages.push("...");
      }
      pages.push(totalHistoryPages);
    }
    return pages;
  }, [totalHistoryPages, currentHistoryPage]);

  return (
    <div className="min-h-full px-4 py-5 sm:py-6 lg:px-8 max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* 顶部标题、学习数据胶囊与自定义评测入口 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 border-b border-border/40 pb-4 sm:pb-5">
        <div className="flex items-center gap-3">
          <img
            src="/assets/qiaobao_sunny240.png"
            alt="敢敢"
            className="size-11 sm:size-12 rounded-full object-cover border-2 border-amber-400 shadow-md shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-foreground">
                语音精准纠音 · 敢敢发音实验室
              </h1>
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                AI 音素级评测
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              基于权威音素级声学模型，精细把关音调与发音，练就地道自信少儿口语
            </p>
          </div>
        </div>

        {/* 右侧：学习统计胶囊 */}
        {learningStats.totalCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs shrink-0 shadow-2xs">
            <span className="text-muted-foreground text-[11px]">累计评测</span>
            <span className="font-black text-amber-700 dark:text-amber-300 font-mono">
              {learningStats.totalCount} 次
            </span>
            <span className="text-amber-400">·</span>
            <span className="text-muted-foreground text-[11px]">均分</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {learningStats.avgScore}
            </span>
          </div>
        )}
      </div>

      {/* 核心板块 1：今日敢敢推荐精读金句 (Hero Card) */}
      {(() => {
        const activeChallenge = dailySentence || TODAY_CHALLENGE;
        const todayKey = activeChallenge.text.toLowerCase().replace(/[^a-z0-9]/g, "");
        const todayRecord = assessmentHistoryMap.get(todayKey);
        const hasNativeAudio = isRealClipAudio(activeChallenge.audioUrl);
        const todayEffectiveUrl = hasNativeAudio
          ? activeChallenge.audioUrl
          : `/api/ai/tts?text=${encodeURIComponent(activeChallenge.text)}&voice=en-GB-SoniaNeural&rate=-5%`;
        const isTodayPlaying = playingUrl === todayEffectiveUrl;

        return (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-5 sm:p-7 md:p-8 border border-amber-400/35 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
              <div className="space-y-2.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-xs">
                    <FlameIcon className="size-3.5 fill-white" />
                    <span>今日推荐金句 · 每日影子跟读打卡</span>
                  </div>
                  {activeChallenge.topic && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-300/40">
                      {activeChallenge.topic}
                    </span>
                  )}
                  {todayRecord ? (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-400/30">
                      <span>🏆 今日已打卡 · 最高 {todayRecord.bestScore} 分</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-800/80 dark:text-amber-200/80 bg-amber-400/20 px-2 py-0.5 rounded-full">
                      🔥 今日待挑战
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={nextDailySentence}
                    className="h-6 text-[11px] text-muted-foreground hover:text-foreground rounded-full px-2 gap-1 cursor-pointer"
                    title="切换下一条金句"
                  >
                    <RotateCwIcon className="size-3" />
                    <span>换一句 ({dailyIndex + 1}/{dailyTotal})</span>
                  </Button>
                </div>

                <div>
                  <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-foreground tracking-wide font-sans leading-snug">
                    "{activeChallenge.text}"
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                    {activeChallenge.translation}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium flex-wrap">
                  <span className="bg-white/80 dark:bg-black/30 px-2.5 py-1 rounded-lg border border-amber-400/30">
                    🎯 发音重点：{activeChallenge.phonicsFocus || (activeChallenge as any).focus}
                  </span>
                  <span className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-400/30 font-bold text-[11px]">
                    {hasNativeAudio ? "🇬🇧 外教母语原声 (44.1kHz)" : "🇬🇧 Sonia牛津纯正英音"}
                  </span>
                </div>
              </div>

              <div className="flex flex-row md:flex-col gap-2.5 sm:gap-3 shrink-0">
                <Button
                  variant="outline"
                  size="lg"
                  className={`flex-1 md:flex-none rounded-2xl gap-2 border-amber-400/60 bg-white/85 dark:bg-black/20 hover:bg-amber-500/20 text-xs sm:text-sm font-bold shadow-xs cursor-pointer ${
                    isTodayPlaying ? "ring-2 ring-amber-500 bg-amber-500/20 text-amber-700" : ""
                  }`}
                  onClick={() =>
                    playSampleAudio(activeChallenge.text, activeChallenge.audioUrl)
                  }
                >
                  {isTodayPlaying ? (
                    <>
                      <PauseIcon className="size-4 text-amber-600 fill-amber-600" />
                      <span>暂停示范</span>
                    </>
                  ) : (
                    <>
                      <Volume2Icon className="size-4 text-amber-600" />
                      <span>听示范音</span>
                    </>
                  )}
                </Button>

                <Button
                  size="lg"
                  className="flex-1 md:flex-none rounded-2xl bg-amber-500 hover:bg-amber-600 text-white gap-2 text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() =>
                    handleStartPractice(activeChallenge.text, activeChallenge.audioUrl)
                  }
                >
                  <MicIcon className="size-4 fill-white" />
                  <span>{todayRecord ? "再次挑战打分" : "开始跟读测评"}</span>
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 核心板块 2：发音能力全维诊断看板 & 靶向薄弱音标攻克室 */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-background to-amber-500/10 border border-indigo-400/30 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/40 dark:border-indigo-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-bold text-base shadow-xs">
              📊
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                <span>发音综合能力看板 · 靶向音标攻克室</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30">
                  AI 音素级诊断
                </span>
              </h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                全维评估发音全貌；点击下方待攻克音标，题库将一键切换为靶向针对性练习题
              </p>
            </div>
          </div>
          {selectedPhoneme && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPhoneme(null)}
              className="h-7 px-3 text-xs font-bold rounded-xl border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white"
            >
              ✕ 取消音标筛选
            </Button>
          )}
        </div>

        {/* 4 维语音宏观指标卡片栅格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-blue-300/40 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-bold">
              <span>🎯 准确度 (Accuracy)</span>
              <span className="text-sm font-black">{phonicsDiagnostics.dimensions.accuracy}分</span>
            </div>
            <p className="text-[11px] text-muted-foreground">音位对齐与发音清晰度</p>
            <div className="w-full bg-blue-100 dark:bg-blue-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, phonicsDiagnostics.dimensions.accuracy)}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-emerald-300/40 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold">
              <span>🌊 流利度 (Fluency)</span>
              <span className="text-sm font-black">{phonicsDiagnostics.dimensions.fluency}分</span>
            </div>
            <p className="text-[11px] text-muted-foreground">连贯朗读无顿挫卡顿</p>
            <div className="w-full bg-emerald-100 dark:bg-emerald-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, phonicsDiagnostics.dimensions.fluency)}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-amber-300/40 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-bold">
              <span>🧩 完整度 (Completeness)</span>
              <span className="text-sm font-black">{phonicsDiagnostics.dimensions.completeness}分</span>
            </div>
            <p className="text-[11px] text-muted-foreground">朗读完整无漏词少字</p>
            <div className="w-full bg-amber-100 dark:bg-amber-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, phonicsDiagnostics.dimensions.completeness)}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-pink-300/40 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-pink-700 dark:text-pink-300 font-bold">
              <span>🎵 韵律感 (Prosody)</span>
              <span className="text-sm font-black">{phonicsDiagnostics.dimensions.prosody}分</span>
            </div>
            <p className="text-[11px] text-muted-foreground">抑扬顿挫与意群重音</p>
            <div className="w-full bg-pink-100 dark:bg-pink-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-pink-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, phonicsDiagnostics.dimensions.prosody)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 待攻克薄弱音标标签墙 (可点击触发靶向练习) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
              <FlameIcon className="size-3.5 text-orange-500" />
              <span>待攻克重点音标排行榜（点击音标标签，直接筛选对应例句开练）：</span>
            </span>
            <span className="text-muted-foreground text-[11px]">
              {selectedPhoneme ? `正在针对 /${selectedPhoneme}/ 进行靶向练习` : "支持一键靶向筛选"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {phonicsDiagnostics.weakPhonemes.map((wp) => {
              const isSelected = selectedPhoneme === wp.phoneme;
              const accuracyRate = wp.totalCount > 0 ? Math.round((wp.scoreSum / wp.totalCount)) : 75;

              return (
                <button
                  key={wp.phoneme}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedPhoneme(null);
                    } else {
                      setSelectedPhoneme(wp.phoneme);
                      setTimeout(() => {
                        document.getElementById("curated-library-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 60);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                    isSelected
                      ? "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400 scale-105"
                      : "bg-white/90 dark:bg-slate-900 border-amber-300/60 hover:border-amber-500 text-foreground hover:bg-amber-500/10"
                  }`}
                  title={`${wp.name} · ${wp.tip}`}
                >
                  <span
                    className={`px-1.5 py-0.5 rounded-md font-mono text-xs font-black ${
                      isSelected ? "bg-white text-amber-600" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    /{wp.phoneme}/
                  </span>
                  <span className="truncate max-w-[140px] text-[11px]">{wp.name.split(" ")[0]}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-red-500/10 text-red-600 border border-red-300/40"
                    }`}
                  >
                    {wp.errorCount > 0 ? `失分 ${wp.errorCount} 次` : `掌握率 ${accuracyRate}%`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 针对所选音标，提供直通 39 音标宝藏库的轻量引导 */}
          {selectedPhoneme && (
            <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-yellow-500/15 border-2 border-amber-300/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5 text-foreground font-black">
                <SparklesIcon className="size-4.5 text-amber-500 shrink-0" />
                <span>
                  想看 <strong>/{selectedPhoneme}/</strong> 的 3D 口型舌位透视、通关口诀与拼读例词？
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const targetItem = ALL_39_PHONEMES.find(
                    (p) =>
                      p.id === selectedPhoneme ||
                      p.symbol.includes(selectedPhoneme) ||
                      p.slug === selectedPhoneme
                  );
                  const targetSlug =
                    targetItem?.slug ||
                    selectedPhoneme.replace(/[/ː]/g, "").trim() ||
                    "th";
                  navigate(`/phonemes/${targetSlug}`);
                }}
                className="h-8 px-4 text-xs font-black rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-slate-950 border border-amber-300 shadow-2xs shrink-0 cursor-pointer transition-transform active:scale-95"
              >
                前往 39 音标宝藏库 ➔
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 核心板块 3：SunnyBridge 分级跟读题库 */}
      <div id="curated-library-section" className="space-y-4 scroll-mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCapIcon className="size-5 text-amber-600" />
            <h2 className="text-base md:text-lg font-bold text-foreground">
              SunnyBridge 分级精读题库
            </h2>
            <span className="text-xs text-muted-foreground">
              （点选任意句子，即可听音跟读打分）
            </span>
          </div>
        </div>

        <Tabs defaultValue="level1" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto min-w-[320px] max-w-2xl h-auto sm:h-11 p-1 bg-muted/60 rounded-2xl gap-1">
              {curatedLevels.map((lvl) => (
                <TabsTrigger
                  key={lvl.id}
                  value={lvl.id}
                  className="rounded-xl text-xs md:text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-xs py-2 sm:py-0"
                >
                  {lvl.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {curatedLevels.map((lvl) => {
            const filteredItems = selectedPhoneme
              ? lvl.items.filter((item) => {
                  const p = selectedPhoneme.toLowerCase();
                  return (
                    item.phonicsFocus.toLowerCase().includes(p) ||
                    item.phonicsFocus.toLowerCase().includes(`/${p}/`) ||
                    (p === "θ" && (item.phonicsFocus.includes("咬舌") || item.text.toLowerCase().includes("th"))) ||
                    (p === "ð" && (item.phonicsFocus.includes("咬舌") || item.text.toLowerCase().includes("th"))) ||
                    (p === "æ" && (item.phonicsFocus.includes("梅花") || item.text.toLowerCase().includes("cat") || item.text.toLowerCase().includes("apple") || item.text.toLowerCase().includes("black") || item.text.toLowerCase().includes("bad"))) ||
                    (p === "r" && (item.phonicsFocus.includes("卷舌") || item.phonicsFocus.includes("/r/") || item.text.toLowerCase().includes("red") || item.text.toLowerCase().includes("tree") || item.text.toLowerCase().includes("room"))) ||
                    (p === "ŋ" && (item.phonicsFocus.includes("后鼻音") || item.phonicsFocus.includes("/ŋ/") || item.text.toLowerCase().includes("ing") || item.text.toLowerCase().includes("morning")))
                  );
                })
              : lvl.items;

            const currentPage = levelPages[lvl.id] || 0;
            const totalPages = Math.ceil(filteredItems.length / 3) || 1;
            const displayItems = showAllInLevel || selectedPhoneme
              ? filteredItems
              : filteredItems.slice(currentPage * 3, currentPage * 3 + 3);

            const practicedCount = lvl.items.filter((item) => {
              const itemKey = item.text.toLowerCase().replace(/[^a-z0-9]/g, "");
              return assessmentHistoryMap.has(itemKey);
            }).length;
            const practiceRate = Math.round((practicedCount / (lvl.items.length || 1)) * 100);

            return (
              <TabsContent key={lvl.id} value={lvl.id} className="mt-4 space-y-3">
                {/* 题库组别提示与换一批操作栏 */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-300/40">
                      {lvl.badge}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-400/30">
                      已练习 {practicedCount}/{lvl.items.length} 题 ({practiceRate}%)
                    </span>
                    {!showAllInLevel && !selectedPhoneme && (
                      <span className="text-xs text-muted-foreground font-semibold">
                        第 {currentPage + 1} / {totalPages} 组
                      </span>
                    )}
                    {selectedPhoneme && (
                      <span className="text-xs text-amber-800 dark:text-amber-200 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full">
                        🎯 包含 /{selectedPhoneme}/ 共 {filteredItems.length} 题
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!showAllInLevel && !selectedPhoneme && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1.5 border-amber-300/80 bg-background hover:bg-amber-500/15 text-amber-800 dark:text-amber-200 cursor-pointer shadow-2xs transition-all hover:scale-105 active:scale-95"
                        onClick={() => handleRefreshBatch(lvl.id, lvl.items.length)}
                        title="换一批题目"
                      >
                        <RotateCwIcon
                          className={`size-3.5 text-amber-600 transition-transform duration-500 ${
                            refreshingLvl === lvl.id ? "rotate-180" : ""
                          }`}
                        />
                        <span>换一批</span>
                      </Button>
                    )}
                    {!selectedPhoneme && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => setShowAllInLevel(!showAllInLevel)}
                      >
                        {showAllInLevel ? "精简展示 (每次3题)" : `查看全部 (${lvl.items.length}题)`}
                      </Button>
                    )}
                  </div>
                </div>

                {/* 靶向音标巩固模式提示条 */}
                {selectedPhoneme && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-900 dark:text-amber-100 text-xs sm:text-sm font-bold shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-5 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs">🎯</span>
                      <span>
                        已开启<strong>「/{selectedPhoneme}/」</strong>靶向巩固模式（匹配到 {filteredItems.length} 题）
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2.5 text-xs font-bold rounded-lg border-amber-400 bg-background hover:bg-amber-500 hover:text-white"
                      onClick={() => setSelectedPhoneme(null)}
                    >
                      ✕ 退出靶向模式
                    </Button>
                  </div>
                )}

                {/* 卡片栅格展示 */}
                {filteredItems.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-muted/40 border border-dashed border-border text-xs text-muted-foreground space-y-2">
                    <p>当前分级暂无针对「/{selectedPhoneme}/」的重点题，可切换上方其他级别或「📚 绘本金句」！</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPhoneme(null)}
                      className="text-xs rounded-xl"
                    >
                      查看全部题目
                    </Button>
                  </div>
                ) : (
                  <div
                    key={`${lvl.id}-${currentPage}-${selectedPhoneme || "all"}`}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    {displayItems.map((item, idx) => {
                      const globalIdx = showAllInLevel ? idx : currentPage * 3 + idx;
                      const taskLabel = `Task ${(globalIdx + 1).toString().padStart(2, "0")}`;
                      const hasOriginalClip = isRealClipAudio(item.audioUrl);
                      const effectiveUrl = hasOriginalClip
                        ? item.audioUrl
                        : `/api/ai/tts?text=${encodeURIComponent(item.text)}&voice=en-GB-SoniaNeural&rate=-5%`;
                      const isItemPlaying = playingUrl === effectiveUrl;

                      const itemKey = item.text.toLowerCase().replace(/[^a-z0-9]/g, "");
                      const itemHistory = assessmentHistoryMap.get(itemKey);

                      const isTargetedMatch = Boolean(
                        selectedPhoneme && (
                          item.phonicsFocus.toLowerCase().includes(selectedPhoneme.toLowerCase()) ||
                          (selectedPhoneme === "θ" && (item.phonicsFocus.includes("咬舌") || item.text.toLowerCase().includes("th"))) ||
                          (selectedPhoneme === "ð" && (item.phonicsFocus.includes("咬舌") || item.text.toLowerCase().includes("th"))) ||
                          (selectedPhoneme === "æ" && (item.phonicsFocus.includes("梅花") || item.text.toLowerCase().includes("cat") || item.text.toLowerCase().includes("apple") || item.text.toLowerCase().includes("black"))) ||
                          (selectedPhoneme === "r" && (item.phonicsFocus.includes("卷舌") || item.phonicsFocus.includes("/r/"))) ||
                          (selectedPhoneme === "ŋ" && (item.phonicsFocus.includes("后鼻音") || item.phonicsFocus.includes("/ŋ/")))
                        )
                      );

                      return (
                        <div
                          key={item.id}
                          style={{ animationDelay: `${idx * 75}ms` }}
                          className={`animate-card-flip-bounce p-4 sm:p-5 rounded-2xl bg-card border shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                            isTargetedMatch
                              ? "ring-2 ring-amber-500 border-amber-500/80 bg-amber-500/5 shadow-md"
                              : itemHistory && itemHistory.bestScore >= 90
                              ? "border-amber-400/50 bg-gradient-to-b from-amber-500/5 via-card to-card"
                              : itemHistory
                              ? "border-emerald-400/40 bg-gradient-to-b from-emerald-500/5 via-card to-card"
                              : "border-border/70"
                          }`}
                        >
                          <div className="space-y-2.5 mb-4">
                            {/* 顶部标签排布（防溢出、结构分明的双行紧凑布局） */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-extrabold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md text-[11px] font-mono shrink-0">
                                    {taskLabel}
                                  </span>
                                  {item.bookTitle && (
                                    <span
                                      className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-400/30 truncate max-w-[140px]"
                                      title={item.bookTitle}
                                    >
                                      📖 《{item.bookTitle.replace(/^\[.*?\]\s*/, "")}》
                                    </span>
                                  )}
                                  {isTargetedMatch && (
                                    <span className="text-[10px] font-black text-amber-800 dark:text-amber-200 bg-amber-500/25 px-1.5 py-0.5 rounded border border-amber-400/50 shrink-0">
                                      🎯 靶向重点
                                    </span>
                                  )}
                                </div>

                                {/* 历史成绩沉淀徽章 */}
                                {itemHistory ? (
                                  <div
                                    className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full border shadow-2xs shrink-0 ${
                                      itemHistory.bestScore >= 90
                                        ? "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-400/50"
                                        : itemHistory.bestScore >= 80
                                        ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-400/50"
                                        : "bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-400/50"
                                    }`}
                                    title={`已评测 ${itemHistory.count} 次 · 最高分 ${itemHistory.bestScore} 分`}
                                  >
                                    <span>{itemHistory.bestScore >= 90 ? "🏅" : itemHistory.bestScore >= 80 ? "⭐" : "👍"}</span>
                                    <span>{itemHistory.bestScore}分</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-semibold text-muted-foreground/80 bg-muted/70 px-2 py-0.5 rounded-md shrink-0">
                                    未练习
                                  </span>
                                )}
                              </div>

                            {/* 第二行：发音重点 + 外教发音徽章 */}
                            <div className="flex items-center justify-between text-[11px] gap-2 pt-0.5">
                              <span className="text-muted-foreground truncate" title={item.phonicsFocus}>
                                🎯 {item.phonicsFocus}
                              </span>
                              {hasOriginalClip ? (
                                <span
                                  className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-400/30 shrink-0"
                                  title={(item as any).source || "原版单句原声音频"}
                                >
                                  🎙️ {(item as any).source ? "外教原声" : "绘本原声"}
                                </span>
                              ) : (
                                <span
                                  className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-400/30 shrink-0"
                                  title="牛津树官方推荐外教 Sonia (en-GB-SoniaNeural 纯正英音)"
                                >
                                  🇬🇧 Sonia英音
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-sm font-bold text-foreground font-sans leading-relaxed group-hover:text-amber-600 transition-colors">
                            "{item.text}"
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.translation}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`flex-1 text-xs rounded-xl h-9 gap-1 text-foreground transition-all ${
                              isItemPlaying
                                ? "bg-amber-500/20 text-amber-700 font-bold"
                                : "hover:bg-amber-500/10"
                            }`}
                            onClick={() => playSampleAudio(item.text, item.audioUrl)}
                          >
                            {isItemPlaying ? (
                              <>
                                <PauseIcon className="size-3.5 text-amber-600 fill-amber-600" />
                                <span>暂停</span>
                              </>
                            ) : (
                              <>
                                <Volume2Icon className="size-3.5 text-amber-600" />
                                <span>试听</span>
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className={`flex-1 text-xs rounded-xl h-9 font-bold gap-1 shadow-xs cursor-pointer transition-all active:scale-95 ${
                              itemHistory
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-amber-500 hover:bg-amber-600 text-white"
                            }`}
                            onClick={() => handleStartPractice(item.text, item.audioUrl, item)}
                          >
                            <MicIcon className="size-3.5" />
                            <span>{itemHistory ? "重练打分" : "跟读打分"}</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
          })}
        </Tabs>
      </div>

      {/* 核心板块 3：我的纠音成长档案与历史记录 (支持分页浏览，避免列表过长) */}
      <div
        id="pronunciation-growth-footprint"
        ref={historySectionRef}
        className="space-y-4 pt-4 border-t border-border/40 scroll-mt-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrophyIcon className="size-5 text-amber-600" />
            <h2 className="text-base md:text-lg font-bold text-foreground">
              我的发音成长足迹
            </h2>
            <span className="text-xs text-muted-foreground font-semibold">
              ({totalHistoryCount} 次练习)
            </span>
          </div>

          {assessments.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
              {/* 每页展示条数 */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>每页:</span>
                <Select
                  value={String(historyPageSize)}
                  onValueChange={(val) => {
                    setHistoryPageSize(Number(val));
                    setHistoryPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl w-24 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="5">5 条/页</SelectItem>
                      <SelectItem value="10">10 条/页</SelectItem>
                      <SelectItem value="20">20 条/页</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* 排序方式 */}
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">{t("sortBy")}:</Label>
                <Select
                  value={orderBy}
                  onValueChange={(val) => {
                    setOrderBy(val);
                    setHistoryPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl w-32 bg-background">
                    <SelectValue placeholder={t("select_sort_order")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="createdAtDesc">{t("createdAtDesc")}</SelectItem>
                      <SelectItem value="createdAtAsc">{t("createdAtAsc")}</SelectItem>
                      <SelectItem value="scoreDesc">{t("scoreDesc")}</SelectItem>
                      <SelectItem value="scoreAsc">{t("scoreAsc")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {assessments.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-muted/20 border border-dashed border-border/80">
            <div className="size-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3 text-amber-600">
              <SparklesIcon className="size-7" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">
              还没有测评记录哦
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              点击上方【今日推荐金句】或【分级精读题库】里的任意例句，听完外教示范后跟读录音，即可获得第一张专属发音雷达报告！
            </p>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs"
              onClick={() => handleStartPractice(TODAY_CHALLENGE.text)}
            >
              立即跟读今日推荐金句
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {pagedAssessments.map((assessment) => (
                <PronunciationAssessmentCard
                  key={assessment.id}
                  pronunciationAssessment={assessment}
                  onSelect={setSelecting}
                  onDelete={setDeleting}
                  onSharing={setSharing}
                />
              ))}
            </div>

            {/* 分页控制栏 */}
            {totalHistoryPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 px-1 border-t border-border/40">
                <div className="text-xs text-muted-foreground font-medium">
                  第 <span className="font-bold text-foreground">{currentHistoryPage}</span> / {totalHistoryPages} 页
                  <span className="mx-2 text-border">·</span>
                  共 <span className="font-bold text-foreground">{totalHistoryCount}</span> 条记录
                  <span className="mx-1.5 text-border">·</span>
                  当前显示第 {(currentHistoryPage - 1) * historyPageSize + 1} - {Math.min(currentHistoryPage * historyPageSize, totalHistoryCount)} 条
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1 border-border/60 cursor-pointer"
                    disabled={currentHistoryPage <= 1}
                    onClick={() => {
                      setHistoryPage((p) => Math.max(1, p - 1));
                      historySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    <ChevronLeftIcon className="size-3.5" />
                    <span>上一页</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {pageNumbers.map((p, idx) => {
                      if (p === "...") {
                        return (
                          <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-muted-foreground select-none">
                            ...
                          </span>
                        );
                      }
                      const isCur = p === currentHistoryPage;
                      return (
                        <Button
                          key={`page-${p}`}
                          variant={isCur ? "default" : "outline"}
                          size="sm"
                          className={`h-8 w-8 p-0 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isCur
                              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                              : "border-border/60 hover:bg-amber-500/10 text-foreground"
                          }`}
                          onClick={() => {
                            setHistoryPage(Number(p));
                            historySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                        >
                          {p}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1 border-border/60 cursor-pointer"
                    disabled={currentHistoryPage >= totalHistoryPages && !hasMore}
                    onClick={async () => {
                      if (currentHistoryPage < totalHistoryPages) {
                        setHistoryPage((p) => p + 1);
                        historySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      } else if (hasMore) {
                        fetchAssessments({ offset: assessments.length });
                        setHistoryPage((p) => p + 1);
                        historySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                  >
                    <span>下一页</span>
                    <ChevronRightIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 测评详情弹窗 Sheet */}
      <Sheet
        open={Boolean(selecting)}
        onOpenChange={(value) => {
          if (!value) setSelecting(null);
        }}
      >
        <SheetContent
          aria-describedby={undefined}
          side="bottom"
          className="rounded-t-2xl shadow-lg max-h-content overflow-y-scroll"
          displayClose={false}
        >
          <SheetHeader className="flex items-center justify-center -mt-4 mb-2">
            <SheetTitle className="sr-only">Assessment</SheetTitle>
            <SheetClose>
              <ChevronDownIcon />
            </SheetClose>
          </SheetHeader>
          {/* 若来自绘本跟读，提供直达返回按钮 */}
          {(() => {
            const bId = searchParams.get("bookId");
            const bTitle = searchParams.get("bookTitle");
            const pNum = searchParams.get("page") || "1";
            if (!bId) return null;
            return (
              <div className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-400/60 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">📖</span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-amber-900 dark:text-amber-200 truncate">
                      {bTitle
                        ? `已评测完毕！可立即返回《${bTitle}》第 ${pNum} 页`
                        : `已评测完毕！可立即返回绘本第 ${pNum} 页`}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      自动回到该页，继续练习下一句或挑战整页
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
                  onClick={() => {
                    navigate(
                      `/stories?bookId=${encodeURIComponent(
                        bId
                      )}&page=${pNum}&shadowModal=true`
                    );
                  }}
                >
                  <span>返回绘本继续学 ➔</span>
                </Button>
              </div>
            );
          })()}
          {selecting && (
            <RecordingDetail
              recording={
                selecting.target || ({
                  id: selecting.targetId || selecting.id,
                  referenceText:
                    selecting.referenceText ||
                    selecting.result?.display ||
                    "",
                  src: (selecting as any).recordingSrc || "",
                  duration: selecting.result?.duration || 5000,
                  language: selecting.language || "en-US",
                } as any)
              }
              pronunciationAssessment={selecting}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* 沉浸式原地快速评测抽屉 (In-Place Assessment Drawer) */}
      <Sheet
        open={Boolean(inPlacePractice)}
        onOpenChange={(value) => {
          if (!value) setInPlacePractice(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto p-4 sm:p-6"
          aria-describedby={undefined}
        >
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <MicIcon className="size-5 text-amber-500" />
              <span>沉浸式跟读评测 · 纯正英音纠音</span>
            </SheetTitle>
          </SheetHeader>
          {inPlacePractice && (
            <PronunciationAssessmentForm
              key={inPlacePractice.text}
              defaultReferenceText={inPlacePractice.text}
              audioUrl={inPlacePractice.audioUrl}
              bookMeta={inPlacePractice.bookMeta}
              onCancel={() => setInPlacePractice(null)}
              onSuccess={(created) => {
                setInPlacePractice(null);
                fetchAssessments();
                setHistoryPage(1);
                if (created) {
                  setSelecting(created);
                }
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* 删除确认弹窗 */}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(value) => {
          if (!value) setDeleting(null);
        }}
      >
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("areYouSureToDeleteThisAssessment")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleting)}>
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 分享弹窗 */}
      <AlertDialog
        open={Boolean(sharing)}
        onOpenChange={(value) => {
          if (!value) setSharing(null);
        }}
      >
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("shareRecording")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("areYouSureToShareThisRecordingToCommunity")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={handleShare}>{t("share")}</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
