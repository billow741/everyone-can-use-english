import React, { useContext, useState, useMemo, useEffect, useRef } from "react";
import { SunnyBridgeDailySentence } from "../sunnybridge-daily-sentence";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import {
  Calendar,
  Play,
  BookOpen,
  Headphones,
  Compass,
  MessageCircle,
  Radio,
  Scroll,
  BookMarked,
  Sparkles,
} from "lucide-react";
import { AppSettingsProviderContext } from "@renderer/context";
import { DesktopSidebar } from "./desktop-sidebar";
import { DesktopFooter } from "./desktop-footer";
import {
  getRecentListening,
  RecentListeningItem,
} from "@renderer/lib/desktop-data";
import {
  SECTION_METAS,
  useSectionStats,
} from "@renderer/lib/section-registry";
import { DailyFableCard } from "@renderer/components/levels/daily-fable-card";
import { useCardStagger } from "@renderer/lib/motion";
import {
  getDialogueProgress,
  subscribeDialogueProgress,
  getDialoguePack,
  DialoguePack,
  DialogueProgressMap,
} from "@renderer/lib/dialogue-service";
import {
  getPhonemeMasteryMap,
  subscribePhonemeMastery,
  ALL_39_PHONEMES,
} from "@renderer/lib/phoneme-data";

export const DesktopHome: React.FC = () => {
  const { user } = useContext(AppSettingsProviderContext);
  const sectionStats = useSectionStats();
  const sectionGridRef = useRef<HTMLDivElement>(null);
  useCardStagger(sectionGridRef, ".sb-cell", []);

  // 响应式订阅 39 音标掌握状态（真实音素进度，绝不编造数字）
  const [phonemeMastery, setPhonemeMastery] = useState<Record<string, boolean>>(() =>
    getPhonemeMasteryMap()
  );

  useEffect(() => {
    const unsub = subscribePhonemeMastery((state) => {
      if (state?.masteryMap) {
        setPhonemeMastery(state.masteryMap);
      }
    });
    return () => unsub();
  }, []);

  // 今日日期
  const todayStr = useMemo(() => {
    const d = dayjs();
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    return `${d.format("M月D日")} ${weekdays[d.day()]}`;
  }, []);

  // 问候语
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "早上好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  }, []);

  // 对话课与拼读进度（真实继续学习来源）
  const [dialogueProgress, setDialogueProgress] = useState<DialogueProgressMap>(() =>
    getDialogueProgress()
  );
  const [dialoguePack, setDialoguePack] = useState<DialoguePack | null>(null);

  useEffect(() => {
    const unsub = subscribeDialogueProgress((prog) => setDialogueProgress(prog));
    let mounted = true;
    getDialoguePack()
      .then((data) => {
        if (mounted) setDialoguePack(data);
      })
      .catch(() => {});
    return () => {
      unsub();
      mounted = false;
    };
  }, []);

  // 最近收听
  const recentListening = useMemo<RecentListeningItem | null>(() => {
    return getRecentListening();
  }, []);

  // 计算“继续学习”项（优先未完成的对话课，其次最近收听，再次拼读）
  const continueLearningItem = useMemo(() => {
    // 1. 进行中的对话课
    if (dialoguePack?.lessons) {
      for (const lesson of dialoguePack.lessons) {
        const prog = dialogueProgress[lesson.lessonId];
        if (prog && prog.stars === 0 && Object.keys(prog.bestScores || {}).length > 0) {
          const practiced = Object.keys(prog.bestScores || {}).length;
          const total = lesson.lines.length;
          const pct = Math.min(100, Math.round((practiced / total) * 100));
          return {
            type: "dialogue",
            title: `情景对话：《${lesson.sceneZh}》`,
            level: "a1",
            levelText: "A1",
            progressPct: pct,
            progressText: `${practiced}/${total} 句`,
            link: `/dialogues/${lesson.lessonId}`,
          };
        }
      }
    }

    // 2. 最近收听（按真实章节级别展示，不写死 A1）
    if (recentListening && recentListening.progressPercent < 100) {
      const rawLevel = (recentListening.level || "a1").toLowerCase();
      const levelText = rawLevel.toUpperCase();
      return {
        type: "listening",
        title: recentListening.title,
        level: rawLevel,
        levelText,
        progressPct: recentListening.progressPercent,
        progressText: `${recentListening.progressPercent}%`,
        link: `/listening/${recentListening.book}/${recentListening.chapter}`,
      };
    }

    // 3. 39 音标未全部掌握时
    const mastery = phonemeMastery;
    const masteredCount = ALL_39_PHONEMES.filter((p) => !!mastery[p.slug]).length;
    if (masteredCount < 39) {
      const nextP = ALL_39_PHONEMES.find((p) => !mastery[p.slug]);
      const pct = Math.round((masteredCount / 39) * 100);
      return {
        type: "phonics",
        title: `自然拼读：音素 /${nextP?.slug || "s"}/`,
        level: "a0",
        levelText: "A0",
        progressPct: pct,
        progressText: `${masteredCount}/39`,
        link: "/phonemes",
      };
    }

    return null;
  }, [dialoguePack, dialogueProgress, recentListening, phonemeMastery]);

  return (
    <div className="desktop-shell">
      <DesktopSidebar activeTab="home" />

      <main className="sb-main">
        {/* 顶栏 */}
        <div className="sb-topbar">
          <div className="left">
            <span className="sb-date">
              <Calendar className="size-4 text-warm-muted" />
              <span>{todayStr}</span>
            </span>
          </div>
          <div className="right" />
        </div>

        {/* 内容区 */}
        <div className="sb-content">
          {/* 中栏 */}
          <div className="sb-col-mid">
            <div className="sb-stack">
              {/* 问候卡 */}
              <div className="sb-card sb-greet">
                <div className="txt">
                  <h1>{greeting}，{user?.name || (user?.isGuest ? "小探险家" : "阳光学员")}！</h1>
                  <p>今天的英语冒险在等你。按级别步步通关，每天进步一点点！</p>
                </div>
                <div className="sb-avatar">
                  <img src="/assets/gangan/gangan_avatar240.png" alt="敢敢" />
                </div>
              </div>

              {/* 金句棚 (G-HOME-03)：每日魔法金句跟读棚 */}
              <div id="daily-sentence-studio">
                <SunnyBridgeDailySentence />
              </div>

              {/* 学习版块 */}
              <div>
                <div className="sb-section-head">
                  <h2>学习版块</h2>
                  <Link to="/courses">查看全部版块 ›</Link>
                </div>
                <div ref={sectionGridRef} className="sb-grid-3">
                  {/* 1. 自然拼读 */}
                  <Link
                    to={SECTION_METAS.phonics.route}
                    className="sb-card sb-cell"
                    data-testid="section-card-phonics"
                  >
                    <div className="sb-cell-header">
                      <BookOpen className="size-7 text-sun-orange shrink-0" strokeWidth={2} />
                      <div className="sb-cell-badges">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${SECTION_METAS.phonics.badgeBg}`}
                        >
                          {SECTION_METAS.phonics.badge}
                        </span>
                      </div>
                    </div>
                    <h3>{SECTION_METAS.phonics.name}</h3>
                    <p className="sb-cell-dimension">{SECTION_METAS.phonics.dimension}</p>
                    <div className="sb-cell-level">{SECTION_METAS.phonics.levelStructure}</div>
                    <div className="sb-cell-stat">
                      {sectionStats.phonics?.label || SECTION_METAS.phonics.summary}
                    </div>
                  </Link>

                  {/* 2. 听故事 */}
                  <Link
                    to={SECTION_METAS.listening.route}
                    className="sb-card sb-cell"
                    data-testid="section-card-listening"
                  >
                    <div className="sb-cell-header">
                      <Headphones className="size-7 text-sun-orange shrink-0" strokeWidth={2} />
                      <div className="sb-cell-badges">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${SECTION_METAS.listening.badgeBg}`}
                        >
                          {SECTION_METAS.listening.badge}
                        </span>
                      </div>
                    </div>
                    <h3>{SECTION_METAS.listening.name}</h3>
                    <p className="sb-cell-dimension">{SECTION_METAS.listening.dimension}</p>
                    <div className="sb-cell-level">{SECTION_METAS.listening.levelStructure}</div>
                    <div className="sb-cell-stat">
                      {sectionStats.listening?.label || SECTION_METAS.listening.summary}
                    </div>
                  </Link>

                  {/* 3. 环球漫游 */}
                  <Link
                    to={SECTION_METAS.world.route}
                    className="sb-card sb-cell"
                    data-testid="section-card-world"
                  >
                    <div className="sb-cell-header">
                      <Compass className="size-7 text-sun-orange shrink-0" strokeWidth={2} />
                      <div className="sb-cell-badges">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${SECTION_METAS.world.badgeBg}`}
                        >
                          {SECTION_METAS.world.badge}
                        </span>
                      </div>
                    </div>
                    <h3>{SECTION_METAS.world.name}</h3>
                    <p className="sb-cell-dimension">{SECTION_METAS.world.dimension}</p>
                    <div className="sb-cell-level">{SECTION_METAS.world.levelStructure}</div>
                    <div className="sb-cell-stat">
                      {sectionStats.world?.label || SECTION_METAS.world.summary}
                    </div>
                  </Link>

                  {/* 4. 情景对话 */}
                  <Link
                    to={SECTION_METAS.dialogues.route}
                    className="sb-card sb-cell"
                    data-testid="section-card-dialogues"
                  >
                    <div className="sb-cell-header">
                      <MessageCircle className="size-7 text-sun-orange shrink-0" strokeWidth={2} />
                      <div className="sb-cell-badges">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${SECTION_METAS.dialogues.badgeBg}`}
                        >
                          {SECTION_METAS.dialogues.badge}
                        </span>
                      </div>
                    </div>
                    <h3>{SECTION_METAS.dialogues.name}</h3>
                    <p className="sb-cell-dimension">{SECTION_METAS.dialogues.dimension}</p>
                    <div className="sb-cell-level">{SECTION_METAS.dialogues.levelStructure}</div>
                    <div className="sb-cell-stat">
                      {sectionStats.dialogues?.label || SECTION_METAS.dialogues.summary}
                    </div>
                  </Link>

                  {/* 5. VOA听力（已上线，可点） */}
                  <Link
                    to={SECTION_METAS.voa.route}
                    className="sb-card sb-cell"
                    data-testid="section-card-voa"
                  >
                    <div className="sb-cell-header">
                      <Radio className="size-7 text-sun-orange shrink-0" strokeWidth={2} />
                      <div className="sb-cell-badges">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${SECTION_METAS.voa.badgeBg}`}
                        >
                          {SECTION_METAS.voa.badge}
                        </span>
                      </div>
                    </div>
                    <h3>{SECTION_METAS.voa.name}</h3>
                    <p className="sb-cell-dimension">{SECTION_METAS.voa.dimension}</p>
                    <div className="sb-cell-level">{SECTION_METAS.voa.levelStructure}</div>
                    <div className="sb-cell-stat">
                      {sectionStats.voa?.label || SECTION_METAS.voa.summary}
                    </div>
                  </Link>

                  {/* 6. 伊索寓言 */}
                  <Link
                    to={SECTION_METAS.fables.route}
                    className="sb-card sb-cell"
                    data-testid="section-card-fables"
                  >
                    <div className="sb-cell-header">
                      <Scroll className="size-7 text-sun-orange shrink-0" strokeWidth={2} />
                      <div className="sb-cell-badges">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${SECTION_METAS.fables.badgeBg}`}
                        >
                          {SECTION_METAS.fables.badge}
                        </span>
                      </div>
                    </div>
                    <h3>{SECTION_METAS.fables.name}</h3>
                    <p className="sb-cell-dimension">{SECTION_METAS.fables.dimension}</p>
                    <div className="sb-cell-level">{SECTION_METAS.fables.levelStructure}</div>
                    <div className="sb-cell-stat">
                      {sectionStats.fables?.label || SECTION_METAS.fables.summary}
                    </div>
                  </Link>

                  {/* 7. 绘本（通栏宽卡） */}
                  <Link
                    to={SECTION_METAS.stories.route}
                    className="sb-card sb-cell wide"
                    data-testid="section-card-stories"
                  >
                    <div className="sb-cell-wide-inner">
                      <BookMarked className="size-7 text-sun-orange shrink-0 mt-0.5" strokeWidth={2} />
                      <div className="body flex-1 min-w-0">
                        <div className="sb-cell-header">
                          <h3 className="m-0">{SECTION_METAS.stories.name}</h3>
                          <div className="sb-cell-badges">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${SECTION_METAS.stories.badgeBg}`}
                            >
                              {SECTION_METAS.stories.badge}
                            </span>
                          </div>
                        </div>
                        <p className="sb-cell-dimension">{SECTION_METAS.stories.dimension}</p>
                        <div className="sb-cell-level">{SECTION_METAS.stories.levelStructure}</div>
                        <div className="sb-cell-stat">
                          {sectionStats.stories?.label || SECTION_METAS.stories.summary}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 右栏 */}
          <div className="sb-col-right">
            <div className="sb-stack">
              {/* 进行中的课程 / 继续学习 */}
              {continueLearningItem ? (
                <div className="sb-card sb-course">
                  <div className="top">
                    <span className="sb-eyebrow">进行中的课程</span>
                    <span className="sb-level-pill">
                      <span className={`sb-dot sb-dot-${continueLearningItem.level}`} />
                      {continueLearningItem.levelText}
                    </span>
                  </div>
                  <h3>{continueLearningItem.title}</h3>
                  <div className="sb-progress-row">
                    <span>课程进度</span>
                    <b>{continueLearningItem.progressPct}%</b>
                  </div>
                  <div className="sb-bar">
                    <i style={{ width: `${continueLearningItem.progressPct}%` }} />
                  </div>
                  <Link to={continueLearningItem.link} className="sb-btn-primary">
                    <span>继续学习</span>
                    <Play className="size-4 fill-white" />
                  </Link>
                </div>
              ) : (
                <div className="sb-card sb-course">
                  <div className="top">
                    <span className="sb-eyebrow">进行中的课程</span>
                  </div>
                  <h3 className="text-base text-warm-muted mt-2">
                    暂无进行中的课程，去版块挑选一门课开始吧！
                  </h3>
                  <Link to="/phonemes" className="sb-btn-primary mt-4">
                    <span>开始新学习</span>
                    <Play className="size-4 fill-white" />
                  </Link>
                </div>
              )}

              {/* 每日寓言 */}
              <DailyFableCard />
            </div>
          </div>
        </div>

        {/* 页脚 */}
        <DesktopFooter />
      </main>
    </div>
  );
};
