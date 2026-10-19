import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getOpenPhonicsCatalog,
  PHONICS_PHASES_META,
  PhonicsPhaseMeta,
  PhonicsSound,
  PhonicsWord,
  getPhonicsWords,
  getSoundsByPhase,
  playPhonicsSound,
} from "@renderer/lib/open-phonics-service";
import {
  LoaderSpin,
} from "@renderer/components";
import {
  Button,
  Input,
  Badge,
} from "@renderer/components/ui";
import { PhonicsWordBlendingModal } from "@renderer/components/phonics/phonics-word-blending-modal";
import {
  SparklesIcon,
  SearchIcon,
  Volume2Icon,
  MicIcon,
  LayersIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  BookOpenIcon,
  FlameIcon,
  StarIcon,
  CheckCircle2Icon,
} from "lucide-react";

export default function PhonicsIndex() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<number>(1);
  const [selectedSound, setSelectedSound] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [words, setWords] = useState<PhonicsWord[]>([]);
  const [phaseSounds, setPhaseSounds] = useState<PhonicsSound[]>([]);
  const [activeModalWord, setActiveModalWord] = useState<PhonicsWord | null>(null);

  // 初始化加载与阶段切换
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      getPhonicsWords({ phaseId: selectedPhase }),
      getSoundsByPhase(selectedPhase),
    ]).then(([phaseWords, sounds]) => {
      if (!mounted) return;
      setWords(phaseWords);
      setPhaseSounds(sounds);
      setSelectedSound("all");
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [selectedPhase]);

  // 根据音素和搜索词筛选
  const filteredWords = useMemo(() => {
    let list = words;

    if (selectedSound !== "all") {
      const sym = selectedSound.toLowerCase();
      list = list.filter((w) =>
        w.sounds.some((s) => s.toLowerCase() === sym)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.sounds.some((s) => s.toLowerCase().includes(q)) ||
          (w.note && w.note.toLowerCase().includes(q))
      );
    }

    return list;
  }, [words, selectedSound, searchQuery]);

  const currentPhaseMeta =
    PHONICS_PHASES_META.find((p) => p.id === selectedPhase) ||
    PHONICS_PHASES_META[0];

  return (
    <div className="min-h-full max-w-6xl mx-auto px-4 py-6 space-y-7 pb-20">
      {/* 1. 顶部 Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 p-6 sm:p-8 text-slate-950 shadow-xl shadow-amber-500/15 border-2 border-amber-300">
        <div className="absolute -right-6 -bottom-6 text-9xl opacity-15 select-none pointer-events-none">
          🧩
        </div>

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/35 backdrop-blur-md text-xs font-black text-slate-950 border border-white/50">
            <SparklesIcon className="size-3.5 fill-slate-950" />
            <span>SunnyBridge 阳光桥 · 合成自然拼读分级阶梯</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-950">
            自然拼读 7 阶通关阶梯 · 1,236 可解码词库
          </h1>

          <p className="text-xs sm:text-sm font-bold text-slate-900/90 leading-relaxed">
            告别死记硬背！循序掌握 97 个拼读规则与字母组合，亲手拆解拼读积木，见词能读、听音能写，轻松奠定少儿自主阅读基石！
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-black">
            <div className="flex items-center gap-1.5 bg-white/70 px-3 py-1.5 rounded-xl border border-white shadow-2xs">
              <span>🌱 7 大进阶阶段</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/70 px-3 py-1.5 rounded-xl border border-white shadow-2xs">
              <span>📚 150 循序课时</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/70 px-3 py-1.5 rounded-xl border border-white shadow-2xs">
              <span>🧩 97 个拼读规则</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/70 px-3 py-1.5 rounded-xl border border-white shadow-2xs">
              <span>📖 1,236 个分级解码词</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 7 阶段选择器 Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {PHONICS_PHASES_META.map((phase) => {
          const active = selectedPhase === phase.id;
          return (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(phase.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all shrink-0 cursor-pointer ${
                active
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]"
                  : "bg-card text-foreground hover:bg-muted border border-border"
              }`}
            >
              <span>{phase.emoji}</span>
              <span>Phase {phase.id}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                {phase.lessonRange} 课
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. 当前阶段说明横幅 */}
      <div className={`p-5 rounded-3xl bg-gradient-to-r ${currentPhaseMeta.color} border-2 ${currentPhaseMeta.accentBorder} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm`}>
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">{currentPhaseMeta.emoji}</span>
            <h2 className="text-lg sm:text-xl font-black text-foreground">
              {currentPhaseMeta.titleZh}
            </h2>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${currentPhaseMeta.badgeBg}`}>
              {currentPhaseMeta.ageBadge}
            </span>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              {currentPhaseMeta.subtitle}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-foreground/80 font-medium leading-relaxed">
            {currentPhaseMeta.descriptionZh}
          </p>
        </div>

        <div className="shrink-0 text-xs font-black px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-900 border border-border text-foreground">
          本阶共 {words.length} 个解码词
        </div>
      </div>

      {/* 4. 音素筛选 Chips 与 搜索框 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* 音素筛选按钮 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
          <button
            type="button"
            onClick={() => setSelectedSound("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              selectedSound === "all"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            全部音素 ({words.length})
          </button>

          {phaseSounds.map((snd) => {
            const count = words.filter((w) =>
              w.sounds.some((s) => s.toLowerCase() === snd.symbol.toLowerCase())
            ).length;
            const active = selectedSound === snd.symbol;
            return (
              <button
                key={snd.symbol}
                type="button"
                onClick={() => setSelectedSound(snd.symbol)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  active
                    ? "bg-amber-500 text-slate-950 shadow-xs scale-105"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title={`音素 /${snd.symbol}/ (${snd.pronounced})`}
              >
                <span>{snd.symbol}</span>
                <span className="text-[10px] opacity-70 font-sans">({count})</span>
              </button>
            );
          })}
        </div>

        {/* 搜索框 */}
        <div className="relative w-full sm:w-60 shrink-0">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索单词或音素..."
            className="pl-9 h-9 rounded-xl bg-card text-xs font-bold"
          />
        </div>
      </div>

      {/* 5. 分级可解码词汇卡片网格 */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <LoaderSpin />
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-muted/20 border border-dashed border-border p-6 space-y-2">
          <p className="text-sm font-bold text-foreground">没有找到匹配的拼读词</p>
          <p className="text-xs text-muted-foreground">试试点击“全部音素”或清空搜索词</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {filteredWords.map((item, idx) => (
            <div
              key={`${item.word}-${idx}`}
              className="group relative flex flex-col justify-between p-4 rounded-2xl bg-card hover:bg-card/90 border border-border/80 hover:border-amber-400 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              <div>
                {/* 顶部 lesson 与播放按钮 */}
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-muted/60 font-mono">
                    L{item.lesson}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playPhonicsSound(item.word, 0.9);
                    }}
                    className="size-7 rounded-lg hover:bg-amber-500/15 text-muted-foreground hover:text-amber-600 flex items-center justify-center transition-colors cursor-pointer"
                    title="试听发音"
                  >
                    <Volume2Icon className="size-3.5" />
                  </button>
                </div>

                {/* 核心单词大字 */}
                <div
                  onClick={() => setActiveModalWord(item)}
                  className="cursor-pointer"
                >
                  <h3 className="font-mono text-lg font-black text-foreground group-hover:text-amber-600 transition-colors tracking-wide">
                    {item.word}
                  </h3>
                  {item.note && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium line-clamp-1 mt-0.5">
                      {item.note}
                    </span>
                  )}
                </div>

                {/* 拼读积木音素切分 */}
                <div className="flex items-center gap-1 flex-wrap mt-2.5">
                  {item.sounds.map((s, sIdx) => (
                    <span
                      key={`${s}-${sIdx}`}
                      onClick={() => playPhonicsSound(s, 0.85)}
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-300/40 hover:bg-amber-500/25 cursor-pointer"
                      title={`音素 /${s}/`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* 卡片底部操作：拼读拆解 与 纠音 */}
              <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveModalWord(item)}
                  className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <LayersIcon className="size-3" />
                  <span>拼读滑读</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/pronunciation_assessments?text=${encodeURIComponent(
                        item.word
                      )}&source=phonics`
                    )
                  }
                  className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
                  title="前往录音打分"
                >
                  <MicIcon className="size-3 text-orange-500" />
                  <span>纠音</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. 底部联动横幅：直通 39 国际音标工坊 */}
      <div className="mt-8 p-5 rounded-3xl bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-orange-500/10 border-2 border-purple-300/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center font-black text-xl shadow-sm shrink-0">
            💎
          </div>
          <div>
            <h4 className="text-sm font-black text-foreground">
              想深入探索发音机理？查看 3D 发音魔法镜与舌位解剖图
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              39 国际音标宝藏库提供 3D 矢状面口型、声带振动感应与最小对立体（Minimal Pairs）精细特训！
            </p>
          </div>
        </div>

        <Link to="/phonemes">
          <Button
            size="sm"
            className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs gap-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            <span>进入 39 音标宝藏库</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </Link>
      </div>

      {/* 🧩 拼读积木动态滑读弹窗 */}
      <PhonicsWordBlendingModal
        word={activeModalWord}
        open={Boolean(activeModalWord)}
        onOpenChange={(open) => {
          if (!open) setActiveModalWord(null);
        }}
      />
    </div>
  );
}
