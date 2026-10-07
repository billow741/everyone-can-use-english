import { useContext, useState } from "react";
import { AppSettingsProviderContext } from "@renderer/context";
import { Button } from "@renderer/components/ui";
import { Link } from "react-router-dom";
import {
  SparklesIcon,
  MicIcon,
  BookOpenIcon,
  BotIcon,
  Volume2Icon,
  FlameIcon,
  ArrowRightIcon,
  PlayIcon,
  HeadphonesIcon,
  CheckCircle2Icon,
} from "lucide-react";

export default () => {
  return (
    <div className="w-full relative pb-16">
      <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 space-y-6">
        <SunnyBridgeWelcomeHero />
        <SunnyBridgeDailySentence />
        <SunnyBridgeCuratedStories />
        <SunnyBridgeCuratedAudios />
      </div>
    </div>
  );
};

const SunnyBridgeWelcomeHero = () => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-yellow-500/15 border border-amber-300/40 p-6 md:p-8 shadow-xs">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <img
              src="/assets/qiaobao_sunny240.png"
              alt="吉祥物敢敢"
              className="size-20 md:size-24 rounded-3xl object-cover border-2 border-amber-300/80 shadow-md bg-white p-1"
            />
            <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold shadow-xs">
              敢敢
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                SunnyBridge 阳光桥少儿英语
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <SparklesIcon className="size-3" />
                AI 智能伴学
              </span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-xl">
              1对1 专属固定外教 · 50 分钟沉浸互动 · 课后 AI 助教精准纠音与分级精读，陪伴孩子自信开口说流利英语。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 shrink-0 w-full md:w-auto">
          <Link
            to="/conversations"
            className="flex items-center gap-2.5 px-3.5 py-2.5 bg-background/80 hover:bg-background border border-border/60 hover:border-amber-400 rounded-2xl transition-all shadow-2xs group"
          >
            <BotIcon className="size-5 text-amber-500 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="text-xs font-bold text-foreground">敢敢 AI 陪练</div>
              <div className="text-[10px] text-muted-foreground">少儿主题情景对话</div>
            </div>
          </Link>
          <Link
            to="/pronunciation_assessments"
            className="flex items-center gap-2.5 px-3.5 py-2.5 bg-background/80 hover:bg-background border border-border/60 hover:border-orange-400 rounded-2xl transition-all shadow-2xs group"
          >
            <MicIcon className="size-5 text-orange-500 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="text-xs font-bold text-foreground">语音精准纠错</div>
              <div className="text-[10px] text-muted-foreground">多维发音即时评测</div>
            </div>
          </Link>
          <Link
            to="/stories"
            className="flex items-center gap-2.5 px-3.5 py-2.5 bg-background/80 hover:bg-background border border-border/60 hover:border-yellow-400 rounded-2xl transition-all shadow-2xs group"
          >
            <BookOpenIcon className="size-5 text-yellow-600 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="text-xs font-bold text-foreground">牛津精选绘本</div>
              <div className="text-[10px] text-muted-foreground">原版分级精听精读</div>
            </div>
          </Link>
          <a
            href="https://www.sunnybridge.qzz.io/apply.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition-all shadow-xs text-xs"
          >
            <SparklesIcon className="size-4" />
            <span>预约外教试听</span>
          </a>
        </div>
      </div>
    </div>
  );
};

const SunnyBridgeDailySentence = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const sentence = "The sun is shining bright, and our little bridge connects the world.";
  const translation = "阳光洒在大地上，我们的小小彩虹桥连通大世界。";

  const handlePlayAudio = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = "en-US";
      utterance.rate = 0.85; // 慢速更适合少儿
      setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-sm">
            ☀️
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">今日少儿金句跟读 (Daily Shadowing)</h3>
            <p className="text-xs text-muted-foreground">听外教示范发音，大声开口跟读纠音</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
          <FlameIcon className="size-3.5 text-orange-500 fill-orange-500" />
          <span>连续跟读 3 天</span>
        </div>
      </div>

      <div className="p-4 md:p-5 rounded-2xl bg-muted/40 border border-border/50 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-lg md:text-xl font-bold text-foreground font-serif tracking-wide">
              &ldquo;{sentence}&rdquo;
            </div>
            <div className="text-xs text-muted-foreground">{translation}</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlayAudio}
            className={`rounded-full shrink-0 ${isPlaying ? "border-amber-500 text-amber-600 animate-pulse" : ""}`}
          >
            <Volume2Icon className="size-4 mr-1" />
            {isPlaying ? "正在示范..." : "听示范发音"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2Icon className="size-4 text-emerald-500" />
          <span>支持标准英音/美音智能纠音打分</span>
        </div>
        <Link to="/pronunciation_assessments">
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl gap-1.5 shadow-xs">
            <MicIcon className="size-3.5" />
            <span>立即开口跟读评测</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

const SunnyBridgeCuratedStories = () => {
  const stories = [
    {
      id: "oxford-1",
      title: "The Magic Key (魔法钥匙)",
      level: "Level 1 · 启蒙级",
      badge: "牛津树经典",
      desc: "跟随 Biff 和 Chip 一起探索阁楼，点亮会发光的魔法钥匙！",
      color: "from-blue-500/10 to-indigo-500/10 border-blue-200/60 dark:border-blue-900/40",
      tagColor: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
    },
    {
      id: "oxford-2",
      title: "Little Bear's Adventure (小熊探险记)",
      level: "Level 2 · 进阶级",
      badge: "自然拼读",
      desc: "小熊走进神秘的大森林，用有趣的字母发音交到了新朋友。",
      color: "from-emerald-500/10 to-teal-500/10 border-emerald-200/60 dark:border-emerald-900/40",
      tagColor: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
    },
    {
      id: "oxford-3",
      title: "The Friendly Dragon (善良的喷火龙)",
      level: "Level 3 · 飞跃级",
      badge: "流利表达",
      desc: "喷火龙喜欢烤松饼而不是喷火，一段暖心的友情故事。",
      color: "from-purple-500/10 to-pink-500/10 border-purple-200/60 dark:border-purple-900/40",
      tagColor: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="size-5 text-amber-600" />
          <h3 className="font-bold text-base text-foreground">官方精选少儿绘本精读</h3>
        </div>
        <Link to="/stories" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-0.5">
          查看全部绘本 <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stories.map((story) => (
          <div
            key={story.id}
            className={`p-5 rounded-2xl bg-gradient-to-br ${story.color} border flex flex-col justify-between transition-all hover:shadow-md`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${story.tagColor}`}>
                  {story.badge}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">{story.level}</span>
              </div>
              <h4 className="font-bold text-sm text-foreground mb-1.5 line-clamp-1">{story.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{story.desc}</p>
            </div>
            <Link to="/stories">
              <Button size="sm" variant="outline" className="w-full text-xs rounded-xl bg-background/80 hover:bg-background">
                开始精读
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

const SunnyBridgeCuratedAudios = () => {
  const audios = [
    {
      title: "Twinkle Twinkle Little Star (小星星儿歌)",
      category: "磨耳朵经典",
      duration: "02:15",
    },
    {
      title: "Phonics Song: Letter Sounds A to Z (自然拼读律动)",
      category: "自然拼读",
      duration: "03:40",
    },
    {
      title: "Head, Shoulders, Knees and Toes (身体律动歌)",
      category: "亲子互动",
      duration: "01:50",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeadphonesIcon className="size-5 text-orange-600" />
          <h3 className="font-bold text-base text-foreground">纯正少儿磨耳朵精选</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {audios.map((audio, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/60 hover:border-amber-300 transition-all shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <PlayIcon className="size-4 fill-amber-500" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground line-clamp-1">{audio.title}</div>
                <div className="text-[10px] text-muted-foreground">
                  {audio.category} · {audio.duration}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
