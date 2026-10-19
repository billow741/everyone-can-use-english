import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  SparklesIcon,
  AwardIcon,
  StarIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Volume2Icon,
  CompassIcon,
  LayersIcon,
  BookOpenIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FlameIcon,
  HelpCircleIcon,
  InfoIcon,
  PlayIcon,
  RocketIcon,
} from "lucide-react";
import {
  Badge,
  Button,
  Progress,
  Separator,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@renderer/components/ui";
import {
  PHONICS_ISLAND_39_ANCHORS,
  PHONICS_ISLAND_ZONES,
  PHONICS_ISLAND_BADGES,
  PhonicsIslandZone,
  PhonicsAnchorItem,
  IslandBadge,
  getAnchorBlocks,
} from "@renderer/lib/phoneme-anchors";
import {
  getPhonemeMasteryMap,
  togglePhonemeMastery,
  subscribePhonemeMastery,
  fetchPhonemesCloudProgress,
} from "@renderer/lib/phoneme-data";
import {
  PHONEME_COACHING_GUIDES,
  playStandardTts,
} from "@renderer/lib/phonetics-coach";
import {
  getDecodableWordsForIpaSlug,
  PhonicsWord,
} from "@renderer/lib/open-phonics-service";
import { PhonemeCertificateModal } from "@renderer/components/pronunciation-assessments/phoneme-certificate-modal";
import { PhonicsWordBlendingModal } from "@renderer/components/phonics/phonics-word-blending-modal";
import { ParentalGateModal } from "@renderer/components/phonics/parental-gate-modal";

export default function PhonemesParentDashboard() {
  const navigate = useNavigate();

  // 家长验证门状态
  const [isGateOpen, setIsGateOpen] = useState(() => {
    try {
      return sessionStorage.getItem("sunnybridge_parent_auth") !== "true";
    } catch {
      return false;
    }
  });

  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() => getPhonemeMasteryMap());
  const [selectedZone, setSelectedZone] = useState<PhonicsIslandZone>("all");
  const [activePhonemeId, setActivePhonemeId] = useState<string>("m");
  const [decodableWords, setDecodableWords] = useState<PhonicsWord[]>([]);
  const [activeBlendingWord, setActiveBlendingWord] = useState<PhonicsWord | null>(null);
  const [isGrandCertificateOpen, setIsGrandCertificateOpen] = useState(false);

  // 订阅掌握度与云端同步
  useEffect(() => {
    const unsub = subscribePhonemeMastery((state) => {
      setMasteryMap(state.masteryMap);
    });
    fetchPhonemesCloudProgress().then((state) => {
      setMasteryMap(state.masteryMap);
    });
    return () => unsub();
  }, []);

  const activeAnchor = useMemo(() => {
    return (
      PHONICS_ISLAND_39_ANCHORS.find((a) => a.id === activePhonemeId) ||
      PHONICS_ISLAND_39_ANCHORS[0]
    );
  }, [activePhonemeId]);

  // 当选中的音素变化时，加载其在 1236 拼读词库中的可解码单词
  useEffect(() => {
    let mounted = true;
    if (activeAnchor) {
      getDecodableWordsForIpaSlug(activeAnchor.ipaSlug, 16).then((words) => {
        if (mounted) setDecodableWords(words);
      });
    }
    return () => {
      mounted = false;
    };
  }, [activeAnchor.id, activeAnchor.ipaSlug]);

  // 掌握进度统计
  const masteredCount = useMemo(() => {
    return PHONICS_ISLAND_39_ANCHORS.filter(
      (p) => masteryMap[p.id] || (p.ipaSlug && masteryMap[p.ipaSlug])
    ).length;
  }, [masteryMap]);

  const masteryPercentage = Math.round((masteredCount / PHONICS_ISLAND_39_ANCHORS.length) * 100);

  // 已攻克音素列表与待攻克列表
  const masteredList = useMemo(() => {
    return PHONICS_ISLAND_39_ANCHORS.filter(
      (a) => masteryMap[a.id] || (a.ipaSlug && masteryMap[a.ipaSlug])
    );
  }, [masteryMap]);

  const pendingList = useMemo(() => {
    return PHONICS_ISLAND_39_ANCHORS.filter(
      (a) => !masteryMap[a.id] && (!a.ipaSlug || !masteryMap[a.ipaSlug])
    );
  }, [masteryMap]);

  // 当前选中音素的专业辅导建议
  const coachingGuide = useMemo(() => {
    const clean = activeAnchor.ipaSymbol.replace(/[\/\[\]]/g, "");
    return (
      PHONEME_COACHING_GUIDES[clean] ||
      PHONEME_COACHING_GUIDES[activeAnchor.ipaSlug] ||
      PHONEME_COACHING_GUIDES[activeAnchor.id]
    );
  }, [activeAnchor]);

  return (
    <div className="min-h-full px-4 py-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* 顶部面包屑与返回儿童模式 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 border border-border p-3.5 rounded-2xl">
        <Breadcrumb>
          <BreadcrumbList className="text-xs font-semibold">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/phonemes" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <ArrowLeftIcon className="size-3.5" />
                  <span>39 自然拼读通关岛</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-black text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <ShieldCheckIcon className="size-3.5" />
                <span>家长专属学情看板</span>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Link to="/phonemes">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs font-black gap-1.5 border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
          >
            <span>🦁 返回儿童通关岛</span>
          </Button>
        </Link>
      </div>

      {/* 头部 Hero：家长专属学情总控台 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600/15 via-indigo-600/10 to-amber-500/10 border-2 border-purple-400/40 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-800 dark:text-purple-200 border border-purple-400/30">
              <ShieldCheckIcon className="size-3.5 text-purple-600 dark:text-purple-300" />
              <span>家长发音锦囊 & 学习数据透视</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              39 自然拼读 · 家长学术看板与词库联动
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
              全面掌控孩子 39 音素的掌握深度、中国孩子易错难点剖析，以及某音素攻克后在 1,236 分级词库中的实战拓展情况。
            </p>
          </div>

          {/* 4 大核心指标卡片横排 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-card/90 border border-border text-center">
              <div className="text-[11px] font-bold text-muted-foreground">通关总进度</div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                {masteryPercentage}%
              </div>
              <div className="text-[10px] text-muted-foreground">{masteredCount}/39 颗星</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-card/90 border border-border text-center">
              <div className="text-[11px] font-bold text-muted-foreground">已点亮勋章</div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                {PHONICS_ISLAND_BADGES.filter((b) => {
                  const zItems = b.zone === "all" ? PHONICS_ISLAND_39_ANCHORS : PHONICS_ISLAND_39_ANCHORS.filter((a) => a.zone === b.zone);
                  return zItems.filter((a) => masteryMap[a.id] || (a.ipaSlug && masteryMap[a.ipaSlug])).length >= b.requiredCount;
                }).length} / 5
              </div>
              <div className="text-[10px] text-muted-foreground">全岛荣誉</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-card/90 border border-border text-center">
              <div className="text-[11px] font-bold text-muted-foreground">待巩固音素</div>
              <div className="text-xl font-black text-rose-500 font-mono mt-0.5">
                {pendingList.length}
              </div>
              <div className="text-[10px] text-muted-foreground">重点突破</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-card/90 border border-border text-center">
              <div className="text-[11px] font-bold text-muted-foreground">可解码词汇</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {Math.min(1236, masteredCount * 32)}+
              </div>
              <div className="text-[10px] text-muted-foreground">1,236 词储备</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 大岛区深入分析雷达网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PHONICS_ISLAND_ZONES.filter((z) => z.key !== "all").map((zone) => {
          const zoneItems = PHONICS_ISLAND_39_ANCHORS.filter((a) => a.zone === zone.key);
          const zoneMastered = zoneItems.filter(
            (a) => masteryMap[a.id] || (a.ipaSlug && masteryMap[a.ipaSlug])
          ).length;
          const pct = Math.round((zoneMastered / zone.count) * 100);

          return (
            <div
              key={zone.key}
              onClick={() => setSelectedZone(selectedZone === zone.key ? "all" : zone.key)}
              className={`p-4 rounded-3xl border-2 transition-all cursor-pointer ${
                selectedZone === zone.key
                  ? "border-purple-500 bg-purple-500/10 shadow-md"
                  : "bg-card hover:bg-muted/40 border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{zone.icon}</span>
                <span className="text-xs font-black font-mono text-purple-600 dark:text-purple-400">
                  {zoneMastered} / {zone.count}
                </span>
              </div>
              <h3 className="text-sm font-black text-foreground">{zone.name}</h3>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {zone.description}
              </p>
              <Progress value={pct} className="h-2 rounded-full mt-3" />
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold mt-1.5">
                <span>掌握度 {pct}%</span>
                <span>{zoneMastered === zone.count ? "已圆满 🌟" : `待攻克 ${zone.count - zoneMastered}`}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 核心工作台：左侧音素列表与攻克榜单 ➔ 右侧专业学术剖析与 1236 词库联动 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧 5 列：39 音素选择器（区分已掌握与待攻克） */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-3xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                <span>39 核心音素学术全景</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {selectedZone === "all" ? "全部 39 音" : `过滤: ${selectedZone}`}
                </Badge>
              </h3>
              <span className="text-[11px] text-muted-foreground">点击音素查看解析</span>
            </div>

            {/* 音素按钮网格 */}
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {PHONICS_ISLAND_39_ANCHORS.filter(
                (a) => selectedZone === "all" || a.zone === selectedZone
              ).map((item) => {
                const isMastered =
                  !!masteryMap[item.id] ||
                  (item.ipaSlug && !!masteryMap[item.ipaSlug]);
                const isSelected = activePhonemeId === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePhonemeId(item.id)}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-purple-600 text-white border-purple-500 shadow-md scale-105 font-black"
                        : isMastered
                        ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/20"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground border-border"
                    }`}
                  >
                    <span className="text-sm font-black font-sans">{item.letter}</span>
                    <span className="text-[9px] font-mono opacity-80">[{item.ipaSymbol}]</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 待攻克重点关注音素清单 */}
          <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-300/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
                <AlertCircleIcon className="size-4 text-amber-600" />
                <span>待攻克 / 重点关注清单 ({pendingList.length})</span>
              </div>
              <span className="text-[10px] text-muted-foreground">建议亲子练习</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {pendingList.slice(0, 10).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePhonemeId(item.id)}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 text-xs font-black text-slate-800 dark:text-slate-200 hover:scale-105 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <span>{item.letter}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">[{item.ipaSymbol}]</span>
                </button>
              ))}
              {pendingList.length === 0 && (
                <div className="text-xs text-emerald-600 font-black py-2">
                  🎉 哇！孩子已攻克全部 39 个发音音素！
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧 7 列：专业学术发音剖析 + 与 1236 拼读词库联动 */}
        <div className="lg:col-span-7 space-y-5">
          {/* 当前选中音素的专业剖析卡片 */}
          <div className="p-5 sm:p-6 rounded-3xl bg-card border-2 border-border shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex flex-col items-center justify-center font-black shadow-md">
                  <span className="text-2xl font-mono">{activeAnchor.letter}</span>
                  <span className="text-[10px] opacity-80">[{activeAnchor.ipaSymbol}]</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-foreground">
                      {activeAnchor.anchorWord} · {activeAnchor.anchorZh}
                    </h2>
                    <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-400/30 text-[10px]">
                      {activeAnchor.academicName}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                    声带状态: {activeAnchor.voiced ? "浊辅音/元音 (声带振动)" : "清辅音 (声带安静，纯气流)"}
                  </p>
                </div>
              </div>

              {/* 前往 3D 解剖工坊入口 */}
              <Link to={`/phonemes/${activeAnchor.ipaSlug}`}>
                <Button
                  size="sm"
                  className="h-9 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs gap-1 shadow-xs shrink-0 cursor-pointer"
                >
                  <span>3D 口腔舌位</span>
                  <ExternalLinkIcon className="size-3.5" />
                </Button>
              </Link>
            </div>

            <Separator />

            {/* 专业发音指导锦囊 */}
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-black text-foreground shrink-0">👅 口腔口型:</span>
                <span className="text-muted-foreground font-medium">
                  {coachingGuide?.mouthShape || "自然张开发音部位，注意唇齿配合"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-black text-foreground shrink-0">💡 辅导要点:</span>
                <span className="text-muted-foreground font-medium">
                  {coachingGuide?.tip || activeAnchor.mnemonic}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-black text-rose-500 shrink-0">⚠️ 易错陷阱:</span>
                <span className="text-rose-600/90 dark:text-rose-400 font-medium">
                  {coachingGuide?.mistake || "注意声带是否误振动或发成汉语拼音相似音"}
                </span>
              </div>
            </div>
          </div>

          {/* 🔗 与 1236 拼读练习词库联动推荐专区 */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border-2 border-sky-400/40 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black text-base shadow-2xs">
                  🧩
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                    <span>1,236 词库实战联动 · 对应练习词推荐</span>
                    <Badge className="bg-sky-500 text-white text-[9px] font-black">
                      Letters & Sounds 规范
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    攻克字母 <strong>{activeAnchor.letter}</strong> 后，孩子可在以下可解码词中进行拼读连读特训：
                  </p>
                </div>
              </div>

              <Link to="/phonics">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-xl text-xs font-black border-sky-400 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 shrink-0"
                >
                  <span>全量 1,236 词库 ➔</span>
                </Button>
              </Link>
            </div>

            {/* 联动单词积木卡片列表 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {decodableWords.slice(0, 9).map((w) => (
                <div
                  key={w.word}
                  className="p-3 rounded-2xl bg-card border border-border hover:border-sky-400 hover:shadow-md transition-all flex flex-col justify-between group select-none"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground font-bold">
                      第 {w.phase} 阶
                    </span>
                    <button
                      type="button"
                      onClick={() => playStandardTts(w.word)}
                      title="点击发音"
                      className="size-6 rounded-full bg-muted/60 hover:bg-sky-500/20 text-muted-foreground hover:text-sky-600 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Volume2Icon className="size-3" />
                    </button>
                  </div>

                  {/* 单词大写与音素拆解 */}
                  <div className="text-center my-1">
                    <div className="text-lg font-black font-mono text-foreground group-hover:text-sky-600 transition-colors">
                      {w.word}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {w.sounds.join(" - ")}
                    </div>
                  </div>

                  {/* 火箭滑读按钮 */}
                  <button
                    type="button"
                    onClick={() => setActiveBlendingWord(w)}
                    className="w-full mt-2 py-1 rounded-xl bg-sky-500/10 hover:bg-sky-500 text-sky-700 hover:text-white text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <RocketIcon className="size-3" />
                    <span>火箭滑读</span>
                  </button>
                </div>
              ))}

              {decodableWords.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground font-semibold">
                  正在加载关联的 1,236 练习词库数据...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 家长验证门弹窗 */}
      <ParentalGateModal
        isOpen={isGateOpen}
        onClose={() => navigate("/phonemes")}
        onSuccess={() => setIsGateOpen(false)}
      />

      {/* 荣誉证书弹窗 */}
      <PhonemeCertificateModal
        isOpen={isGrandCertificateOpen}
        onClose={() => setIsGrandCertificateOpen(false)}
        masteryMap={masteryMap}
        mode="grand"
      />

      {/* 火箭滑读弹窗 */}
      <PhonicsWordBlendingModal
        word={activeBlendingWord}
        open={Boolean(activeBlendingWord)}
        onOpenChange={(open) => {
          if (!open) setActiveBlendingWord(null);
        }}
      />
    </div>
  );
}
