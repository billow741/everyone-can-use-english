import { t } from "i18next";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Sheet,
  SheetContent,
  ScrollArea,
  toast,
  SheetHeader,
  SheetTitle,
} from "@renderer/components/ui";
import { ConversationCard, ConversationForm } from "@renderer/components";
import { useState, useEffect, useContext, useReducer } from "react";
import {
  LoaderIcon,
  SparklesIcon,
  MessageSquareIcon,
  PlusCircleIcon,
  CompassIcon,
  FlameIcon,
  ClockIcon,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  DbProviderContext,
  AppSettingsProviderContext,
  AISettingsProviderContext,
} from "@renderer/context";
import { conversationsReducer } from "@renderer/reducers";
import { GPT_PRESETS } from "@/constants";
import { v4 as uuidv4 } from "uuid";

// 预设精选少儿口语对话情景
const CURATED_SCENARIOS = [
  {
    id: "pets",
    title: "🐱 宠物小伙伴 (My Pet Friends)",
    tag: "启蒙互动 · 动物萌宠",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    description: "你喜欢小猫、小狗还是小兔子？快来和敢敢分享你的宠物伙伴吧！",
    starterMessage:
      "Hello friend! 🦁 I am Gangan! I love cute animals. Do you have a pet at home, like a puppy or a kitten? 🐾",
    systemPrompt:
      "You are Gangan (敢敢), a friendly, energetic, warm little lion mascot and AI English study companion for children learning English at SunnyBridge. Chat about pets and cute animals. Keep your English simple, pure, and encouraging (Pre-A1/A1 level). Ask only ONE simple question at a time. NEVER use Chinese translations or Chinese characters under any circumstances. Speak strictly and purely in English! Always praise the child enthusiastically!",
  },
  {
    id: "food",
    title: "🍕 美味食物分享 (Yummy Food Time)",
    tag: "生活场景 · 美食口语",
    badgeColor: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    description: "今天吃了什么好吃的？敢敢最爱吃甜苹果和披萨啦，你最喜欢什么？",
    starterMessage:
      "Hi there! 🍕 Gangan loves sweet red apples and crispy pizza! What is your favorite yummy food? 🍎",
    systemPrompt:
      "You are Gangan (敢敢), a friendly little lion mascot and AI English companion at SunnyBridge. Chat with the child about food, fruits, snacks, and meals. Keep sentences short and simple. Ask one question at a time. Use cute emojis. NEVER use Chinese translations or Chinese characters. Speak purely in simple English.",
  },
  {
    id: "school",
    title: "🎒 学校里的开心事 (My School Day)",
    tag: "校园日常 · 朋友分享",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    description: "今天在学校或幼儿园有什么开心好玩的事？悄悄告诉敢敢吧！",
    starterMessage:
      "Welcome back! 🎒 School is full of exciting games! What was the most fun thing that happened today? 🌟",
    systemPrompt:
      "You are Gangan (敢敢), SunnyBridge's little lion companion. Chat with the child about school life, friends, games, and art class. Be supportive, ask about their friends and favorite activities, and keep English simple and clear. Do NOT include Chinese translations or Chinese characters in your replies.",
  },
  {
    id: "adventure",
    title: "🚀 奇妙森林与太空 (Jungle & Space)",
    tag: "想象力激发 · 趣味探险",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    description: "想坐上火箭去太空摘星星，还是去神秘大森林看大象？我们出发吧！",
    starterMessage:
      "Hop in! 🚀 Gangan is getting ready for a big space flight! Should we fly to the bright moon or explore the magic jungle? ✨",
    systemPrompt:
      "You are Gangan (敢敢), a little lion adventurer. Guide the young child through a gentle, imaginative storytelling adventure (space, animals, magic kingdom). Use simple English words, vivid sound effects (Whoosh! Vroom!), and keep it full of wonder. Speak purely in English with NO Chinese translations.",
  },
  {
    id: "free_talk",
    title: "🦁 和敢敢自由畅聊 (Free Talk)",
    tag: "日常陪伴 · 倾听解惑",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    description: "英语提问、日常分享、倾听心事，敢敢 24 小时随叫随到陪你聊！",
    starterMessage:
      "Hi friend! 🦁 Gangan is so happy to see you! How are you feeling today? What would you like to talk about? 🌟",
    systemPrompt:
      "You are Gangan (敢敢), a patient, warm, encouraging AI English tutor and companion for children at SunnyBridge. Help the child practice English freely, gently praise and encourage them, and keep your replies strictly in simple, pure English without any Chinese translations.",
  },
];

export default () => {
  const [searchParams] = useSearchParams();
  const { addDblistener, removeDbListener } = useContext(DbProviderContext);
  const { EnjoyApp, webApi } = useContext(AppSettingsProviderContext);
  const { currentGptEngine } = useContext(AISettingsProviderContext);
  const [conversations, dispatchConversations] = useReducer(
    conversationsReducer,
    []
  );
  const [creating, setCreating] = useState<boolean>(false);
  const [starting, setStarting] = useState<boolean>(false);
  const [preset, setPreset] = useState<any>({});
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConversations();
    addDblistener(onConversationsUpdate);

    return () => {
      removeDbListener(onConversationsUpdate);
    };
  }, []);

  const fetchConversations = async () => {
    const limit = 20;

    setLoading(true);
    EnjoyApp.conversations
      .findAll({
        order: [["updatedAt", "DESC"]],
        limit,
        offset: conversations?.length || 0,
      })
      .then((_conversations) => {
        if (_conversations.length === 0) {
          setHasMore(false);
          return;
        }

        if (_conversations.length < limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        if (conversations.length === 0) {
          dispatchConversations({ type: "set", records: _conversations });
        } else {
          dispatchConversations({ type: "append", records: _conversations });
        }
      })
      .catch((error) => {
        toast.error(error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const onConversationsUpdate = (event: CustomEvent) => {
    const { model, action, record } = event.detail || {};
    if (model !== "Conversation") return;

    if (action === "create") {
      dispatchConversations({ type: "create", record });
    } else if (action === "update") {
      dispatchConversations({ type: "update", record });
    } else if (action === "destroy") {
      dispatchConversations({ type: "destroy", record });
    }
  };

  // 一键秒级开启精选场景伴学
  const handleStartScenario = async (
    scenario: (typeof CURATED_SCENARIOS)[0]
  ) => {
    if (starting) return;
    setStarting(true);
    try {
      // 1. 查找是否已有该场景的未完结对话
      const existing = conversations.find(
        (c) =>
          c.name === scenario.title ||
          c.name.includes(scenario.title.slice(2, 6))
      );
      if (existing) {
        navigate(`/conversations/${existing.id}`);
        return;
      }

      // 2. 自动创建该场景的伴学对话（内置敢敢少儿人设）
      const newConv = await EnjoyApp.conversations.create({
        name: scenario.title,
        engine: currentGptEngine?.name || "openai",
        configuration: {
          type: "gpt",
          roleDefinition: scenario.systemPrompt,
          model: currentGptEngine?.models?.default || "gpt-4o-mini",
          temperature: 0.7,
          tts: {
            engine: currentGptEngine?.name || "openai",
            model: "tts-1",
            voice: "nova",
          },
        },
      });

      // 3. 自动注入敢敢的开场白问候语
      const firstMessageId = uuidv4();
      await EnjoyApp.messages.createInBatch([
        {
          id: firstMessageId,
          conversationId: newConv.id,
          role: "assistant",
          content: scenario.starterMessage,
        },
      ]);

      navigate(`/conversations/${newConv.id}`);
    } catch (err: any) {
      toast.error(err.message || "创建对话失败");
    } finally {
      setStarting(false);
    }
  };

  const handleCreateFreeTalk = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const freeTalkScenario =
        CURATED_SCENARIOS.find((s) => s.id === "free_talk") ||
        CURATED_SCENARIOS[4];

      const count = conversations.filter((c) =>
        c.name.includes("敢敢自由畅聊")
      ).length;
      const convName =
        count === 0 ? "🦁 敢敢自由畅聊" : `🦁 敢敢自由畅聊 #${count + 1}`;

      const newConv = await EnjoyApp.conversations.create({
        name: convName,
        engine: "openai",
        configuration: {
          type: "gpt",
          roleDefinition: freeTalkScenario.systemPrompt,
          model: "nvidia/nemotron-3-ultra-550b-a55b",
          temperature: 0.7,
          tts: {
            engine: "edge-tts",
            model: "edge/en-US-AnaNeural",
            voice: "en-US-AnaNeural",
          },
        },
      });

      const firstMessageId = uuidv4();
      await EnjoyApp.messages.createInBatch([
        {
          id: firstMessageId,
          conversationId: newConv.id,
          role: "assistant",
          content: freeTalkScenario.starterMessage,
        },
      ]);

      navigate(`/conversations/${newConv.id}`);
    } catch (err: any) {
      toast.error(err.message || "创建对话失败");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-full px-4 py-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* 顶部标题横幅 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3">
          <img
            src="/assets/qiaobao_sunny240.png"
            alt="敢敢"
            className="size-12 rounded-full object-cover border-2 border-amber-400 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                敢敢 AI 英文陪练 · 口语伴学乐园
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>敢敢在线中</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              纯正母语语调 · 游戏化情境对话 · 鼓励孩子勇敢开口，不怕说错！
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={starting}
            onClick={handleCreateFreeTalk}
            className="rounded-xl border-dashed border-amber-400/60 bg-amber-500/5 hover:bg-amber-500/10 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
          >
            {starting ? (
              <LoaderIcon className="size-4 animate-spin text-amber-600" />
            ) : (
              <PlusCircleIcon className="size-4 text-amber-600" />
            )}
            <span>新建自由对话</span>
          </Button>
        </div>
      </div>

      {/* 核心板块 1：敢敢少儿口语主题广场 (Curated Scenarios) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CompassIcon className="size-5 text-amber-600" />
            <h2 className="text-base md:text-lg font-bold text-foreground">
              选择趣味话题 · 敢敢陪伴开口
            </h2>
            <span className="text-xs text-muted-foreground">
              （点击任意卡片，即刻开启专属对话）
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CURATED_SCENARIOS.map((scenario) => (
            <div
              key={scenario.id}
              onClick={() => handleStartScenario(scenario)}
              className="p-5 rounded-3xl bg-card border border-border/70 shadow-xs hover:shadow-lg hover:border-amber-400/60 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${scenario.badgeColor}`}
                  >
                    {scenario.tag}
                  </span>
                  <span className="text-xs text-muted-foreground group-hover:text-amber-600 font-semibold transition-colors">
                    进入 &rarr;
                  </span>
                </div>

                <h3 className="text-base font-bold text-foreground font-sans group-hover:text-amber-600 transition-colors">
                  {scenario.title}
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {scenario.description}
                </p>
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-medium truncate max-w-[200px]">
                  <span>💬 敢敢已就绪</span>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl text-xs h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1 shadow-xs"
                  disabled={starting}
                >
                  <span>立即畅聊</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 核心板块 2：历史伴学对话记录 */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockIcon className="size-5 text-amber-600" />
            <h2 className="text-base md:text-lg font-bold text-foreground">
              我的伴学足迹与对话档案
            </h2>
            <span className="text-xs text-muted-foreground">
              ({conversations.length} 个对话)
            </span>
          </div>
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-muted/20 border border-dashed border-border/80">
            <div className="size-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3 text-amber-600">
              <SparklesIcon className="size-7" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">
              还没有和敢敢的对话记录哦
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              点击上方【选择趣味话题】里的任意卡片，敢敢会立即带着小提问出来跟你打招呼，快开始你的第一句英语对话吧！
            </p>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs"
              onClick={() => handleStartScenario(CURATED_SCENARIOS[0])}
            >
              开启我的第一场伴学对话
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                to={`/conversations/${conversation.id}`}
              >
                <ConversationCard conversation={conversation} />
              </Link>
            ))}
          </div>
        )}

        {hasMore && conversations.length > 0 && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchConversations()}
              disabled={loading || !hasMore}
              className="rounded-xl text-xs px-6"
            >
              {t("loadMore")}
              {loading && <LoaderIcon className="w-4 h-4 animate-spin ml-2" />}
            </Button>
          </div>
        )}
      </div>

      {/* 自定义新建会话 Sheet */}
      <Sheet open={creating} onOpenChange={(value) => setCreating(value)}>
        <SheetContent className="p-0 pt-8" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle className="sr-only">新建对话</SheetTitle>
          </SheetHeader>
          <div className="h-content relative">
            <ConversationForm
              conversation={preset}
              onFinish={() => {
                setCreating(false);
                fetchConversations();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
