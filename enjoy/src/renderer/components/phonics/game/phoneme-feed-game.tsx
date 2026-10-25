import React, { useState, useEffect, useMemo } from "react";
import { Volume2Icon, SparklesIcon, HeartIcon } from "lucide-react";
import {
  PhonicsAnchorItem,
  PHONICS_ISLAND_39_ANCHORS,
} from "@renderer/lib/phoneme-anchors";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import {
  phonicsAudioFx,
  speakGanganPrompt,
} from "@renderer/lib/phonics-audio-fx";
import {
  GanganInteractiveMascot,
  GanganMood,
} from "./gangan-interactive-mascot";

interface PhonemeFeedGameProps {
  targetItem: PhonicsAnchorItem;
  onSuccess: () => void;
}

interface MacaronOption {
  item: PhonicsAnchorItem;
  colorGradient: string;
  borderColor: string;
}

const MACARON_THEMES = [
  {
    colorGradient: "from-pink-400 via-rose-400 to-rose-500",
    borderColor: "border-pink-300",
  },
  {
    colorGradient: "from-sky-400 via-cyan-400 to-teal-500",
    borderColor: "border-cyan-300",
  },
  {
    colorGradient: "from-amber-400 via-yellow-400 to-orange-500",
    borderColor: "border-yellow-300",
  },
  {
    colorGradient: "from-emerald-400 via-teal-400 to-green-500",
    borderColor: "border-emerald-300",
  },
  {
    colorGradient: "from-purple-400 via-violet-400 to-indigo-500",
    borderColor: "border-purple-300",
  },
];

export const PhonemeFeedGame: React.FC<PhonemeFeedGameProps> = ({
  targetItem,
  onSuccess,
}) => {
  const [mood, setMood] = useState<GanganMood>("hungry");
  const [speech, setSpeech] = useState<string>("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // 生成 1 个正确目标 + 2 个干扰项
  const options: MacaronOption[] = useMemo(() => {
    const distractors = PHONICS_ISLAND_39_ANCHORS.filter(
      (a) => a.id !== targetItem.id && a.letter !== targetItem.letter
    );
    // 随机抽取 2 个
    const shuffled = [...distractors].sort(() => 0.5 - Math.random());
    const pickedDistractors = shuffled.slice(0, 2);

    const pool = [targetItem, ...pickedDistractors].sort(
      () => 0.5 - Math.random()
    );

    return pool.map((item, idx) => ({
      item,
      colorGradient:
        MACARON_THEMES[idx % MACARON_THEMES.length].colorGradient,
      borderColor: MACARON_THEMES[idx % MACARON_THEMES.length].borderColor,
    }));
  }, [targetItem.id]);

  // 初始开场：敢敢提示肚子饿了，想要吃指定音素
  useEffect(() => {
    setMood("hungry");
    setIsCompleted(false);
    setWrongId(null);
    const promptText = `嗷呜！敢敢肚子饿啦，想吃发 ${targetItem.letter} 声音的马卡龙！快喂我吃吧！`;
    setSpeech(`想吃字母 ${targetItem.letter} 声音！`);

    const timer = setTimeout(() => {
      speakGanganPrompt(promptText, {
        onEnd: () => {
          // 念完后自动播放该音素标准原声
          playPhonemeSound(targetItem.ipaSymbol);
        },
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [targetItem.id]);

  // 试听某个马卡龙的发音
  const handleAudition = (e: React.MouseEvent, opt: MacaronOption) => {
    e.stopPropagation();
    phonicsAudioFx.playPop();
    setPlayingId(opt.item.id);
    playPhonemeSound(opt.item.ipaSymbol, {
      onEnd: () => setPlayingId(null),
    });
  };

  // 投喂动作处理
  const handleFeed = (opt: MacaronOption) => {
    if (isCompleted) return;

    if (opt.item.id === targetItem.id) {
      // 🎯 喂对了！
      setIsCompleted(true);
      setWrongId(null);
      phonicsAudioFx.playMunch();
      setMood("eating");
      setSpeech("啊呜！嘎吱嘎吱...真香！💖");

      setTimeout(() => {
        phonicsAudioFx.playSuccessChime();
        setMood("happy");
        setSpeech(`太棒啦！能量加满！就是 ${targetItem.letter}！⭐`);
        speakGanganPrompt("哇！太美味啦！能量已经加满啦！", {
          pitch: 1.3,
          onEnd: () => {
            setTimeout(onSuccess, 600);
          },
        });
        // 兜底 2 秒推进
        setTimeout(onSuccess, 2000);
      }, 900);
    } else {
      // ❌ 喂错了：零挫败诙谐反馈
      phonicsAudioFx.playBoing();
      setWrongId(opt.item.id);
      setMood("confused");
      setSpeech(`嗷呜~ 这个是 ${opt.item.letter}，味道麻麻的！`);

      // 念出错误的声音给孩子听，做听辨引导
      playPhonemeSound(opt.item.ipaSymbol);

      setTimeout(() => {
        setWrongId(null);
        setMood("hungry");
        setSpeech(`再试一次，找找 ${targetItem.letter} 吧！`);
      }, 1600);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between w-full min-h-[360px] py-2 relative select-none">
      {/* 顶部：小狮子敢敢与餐盘目标区 */}
      <div className="flex flex-col items-center relative">
        <GanganInteractiveMascot
          mood={mood}
          size={160}
          speechText={speech}
          onClick={() => {
            phonicsAudioFx.playPop();
            playPhonemeSound(targetItem.ipaSymbol);
          }}
        />

        {/* 3D 地面投影垫与目标提示小灯牌 */}
        <div className="w-36 h-3 -mt-2 bg-amber-950/20 dark:bg-amber-100/10 rounded-full blur-[2px]" />

        <div className="mt-2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-400 text-xs font-black text-amber-950 dark:text-amber-100 shadow-sm">
          <SparklesIcon className="size-3.5 text-amber-500 animate-spin" />
          <span>
            想吃的声音：<strong className="text-sm font-mono">{targetItem.letter}</strong>
          </span>
          <button
            type="button"
            onClick={() => playPhonemeSound(targetItem.ipaSymbol)}
            className="size-5 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-900 flex items-center justify-center cursor-pointer shadow-xs ml-0.5"
            title="再听一次目标发音"
          >
            <Volume2Icon className="size-3" />
          </button>
        </div>
      </div>

      {/* 中部：投喂能量槽 (5 格饱腹度) */}
      <div className="w-full max-w-xs mt-3 mb-2 flex items-center justify-between text-[11px] font-bold text-muted-foreground px-2">
        <span className="flex items-center gap-1">
          <HeartIcon className="size-3.5 fill-rose-500 text-rose-500" />
          <span>敢敢饱腹度</span>
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((cell) => (
              <div
                key={cell}
                className={`h-2.5 w-4 rounded-xs border border-amber-400/60 transition-all ${
                  (isCompleted ? 3 : 1) >= cell
                    ? "bg-amber-400 shadow-xs"
                    : "bg-amber-950/20 dark:bg-amber-100/10"
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
            {isCompleted ? "3 / 5 格" : "1 / 5 格"}
          </span>
        </div>
      </div>

      {/* 底部：3 颗 Q 弹马卡龙饼干 */}
      <div className="w-full flex items-center justify-center gap-3 sm:gap-4 pt-1">
        {options.map((opt, idx) => {
          const isWrong = wrongId === opt.item.id;
          const isPlaying = playingId === opt.item.id;

          return (
            <div
              key={opt.item.id}
              className={`flex flex-col items-center gap-2 group transition-all duration-300 ${
                isWrong ? "animate-shake" : ""
              }`}
            >
              {/* 马卡龙圆饼主体 */}
              <button
                type="button"
                onClick={() => handleFeed(opt)}
                className={`relative size-20 sm:size-22 rounded-3xl bg-gradient-to-b ${opt.colorGradient} p-1 shadow-lg border-4 ${opt.borderColor} flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 group-hover:scale-105 group-hover:-translate-y-1 ${
                  isWrong ? "ring-4 ring-rose-400/50 scale-95" : ""
                } ${isPlaying ? "ring-4 ring-white animate-pulse" : ""}`}
              >
                {/* 糖霜反光高光 */}
                <div className="absolute top-1.5 left-2 w-5 h-2 rounded-full bg-white/40 blur-[0.5px]" />

                {/* 字母大符号 */}
                <span className="text-2xl sm:text-3xl font-black font-sans text-white drop-shadow-md">
                  {opt.item.letter}
                </span>

                {/* 点击试听小喇叭徽章 */}
                <div
                  onClick={(e) => handleAudition(e, opt)}
                  className="absolute -top-2 -right-2 size-6 rounded-full bg-white dark:bg-slate-900 shadow-md border border-border flex items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-110 active:scale-90 transition-transform cursor-pointer"
                  title="先听听声音"
                >
                  <Volume2Icon
                    className={`size-3.5 ${
                      isPlaying ? "text-amber-500 animate-spin" : ""
                    }`}
                  />
                </div>
              </button>

              {/* 投喂点击小提示 */}
              <button
                type="button"
                onClick={() => handleFeed(opt)}
                className="px-2.5 py-0.5 rounded-full bg-muted/80 hover:bg-amber-400 hover:text-slate-950 text-[11px] font-black text-muted-foreground transition-colors cursor-pointer shadow-2xs"
              >
                喂这个 ➔
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
