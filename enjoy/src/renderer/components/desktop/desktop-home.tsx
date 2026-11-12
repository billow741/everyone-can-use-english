import React, { useContext, useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Star,
  Calendar,
  Volume2,
  Play,
  ChevronRight,
  BookOpen,
  Headphones,
  Compass,
  MessageCircle,
  Radio,
  Scroll,
  BookMarked,
  Mic,
  Clock,
  Sparkles,
} from "lucide-react";
import { AppSettingsProviderContext } from "@renderer/context";
import { DesktopSidebar } from "./desktop-sidebar";
import { DesktopFooter } from "./desktop-footer";
import { useUserStars, getRecentListening, RecentListeningItem } from "@renderer/lib/desktop-data";
import { useDailySentence } from "@renderer/lib/daily-sentence";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import {
  getDialogueProgress,
  subscribeDialogueProgress,
  getDialoguePack,
  DialoguePack,
  DialogueProgressMap,
} from "@renderer/lib/dialogue-service";
import { getPhonemeMasteryMap, ALL_39_PHONEMES } from "@renderer/lib/phoneme-data";

export const DesktopHome: React.FC = () => {
  const { user } = useContext(AppSettingsProviderContext);
  const navigate = useNavigate();
  const stars = useUserStars();
  const { sentence: currentSentence } = useDailySentence();
  const [isPlayingTts, setIsPlayingTts] = useState(false);

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

    // 2. 最近收听
    if (recentListening && recentListening.progressPercent < 100) {
      return {
        type: "listening",
        title: recentListening.title,
        level: "a1",
        levelText: "A1",
        progressPct: recentListening.progressPercent,
        progressText: `${recentListening.progressPercent}%`,
        link: `/listening/${recentListening.book}/${recentListening.chapter}`,
      };
    }

    // 3. 39 音标未全部掌握时
    const mastery = getPhonemeMasteryMap();
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
  }, [dialoguePack, dialogueProgress, recentListening]);

  // 今日任务真实状态
  const todayAssessmentsCount = useMemo(() => {
    try {
      const raw = localStorage.getItem("sb_daily_assessments_" + dayjs().format("YYYY-MM-DD"));
      if (raw) return parseInt(raw, 10) || 0;
    } catch {}
    return 0;
  }, []);

  const handlePlayQuoteAudio = async () => {
    if (!currentSentence?.text || isPlayingTts) return;
    setIsPlayingTts(true);
    try {
      await playStandardTts(currentSentence.text, {
        rate: "-10%",
        onEnd: () => setIsPlayingTts(false),
      });
    } catch {
      setIsPlayingTts(false);
    }
  };

  return (
    <div className="desktop-shell">
      <DesktopSidebar activeTab="home" />

      <main className="sb-main">
        {/* 顶栏 */}
        <div className="sb-topbar">
          <div className="left">
            <div className="sb-stars">
              <Star className="size-4 fill-sun-orange text-sun-orange" />
              <span>{stars}</span>
            </div>
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
                  <button
                    className="sb-btn-task"
                    onClick={() => navigate("/pronunciation_assessments")}
                  >
                    开始每日任务
                  </button>
                </div>
                <div className="sb-avatar">
                  <img src="/assets/gangan/gangan_avatar240.png" alt="敢敢" />
                </div>
              </div>

              {/* 学习版块 */}
              <div>
                <div className="sb-section-head">
                  <h2>学习版块</h2>
                  <Link to="/courses">查看全部版块 ›</Link>
                </div>
                <div className="sb-grid-3">
                  <Link to="/phonemes" className="sb-card sb-cell">
                    <BookOpen className="size-7 text-sun-orange" strokeWidth={2} />
                    <h3>自然拼读</h3>
                    <p>掌握字母与发音。</p>
                    <div className="lv sb-lv-a0">
                      <span className="sb-dot sb-dot-a0" />
                      A0
                    </div>
                  </Link>

                  <Link to="/listening" className="sb-card sb-cell">
                    <Headphones className="size-7 text-sun-orange" strokeWidth={2} />
                    <h3>听故事</h3>
                    <p>沉浸式听力。</p>
                    <div className="lv">
                      <span className="sb-dot sb-dot-a1" />
                      <span className="sb-dot sb-dot-b1" />
                      <span className="sb-lv-a1">A1–B1</span>
                    </div>
                  </Link>

                  <Link to="/world" className="sb-card sb-cell">
                    <Compass className="size-7 text-sun-orange" strokeWidth={2} />
                    <h3>环球漫游</h3>
                    <p>文化与世界知识。</p>
                    <div className="lv">
                      <span className="sb-dot sb-dot-a2" />
                      <span className="sb-dot sb-dot-b1" />
                      <span className="sb-lv-a2">A2–B1</span>
                    </div>
                  </Link>

                  <Link to="/dialogues" className="sb-card sb-cell">
                    <MessageCircle className="size-7 text-sun-orange" strokeWidth={2} />
                    <h3>情景对话</h3>
                    <p>自然对话准备。</p>
                    <div className="lv">
                      <span className="sb-dot sb-dot-a1" />
                      <span className="sb-dot sb-dot-b1" />
                      <span className="sb-lv-a1">A1–B1</span>
                    </div>
                  </Link>

                  <div className="sb-card sb-cell soon">
                    <Radio className="size-7 text-sun-orange" strokeWidth={2} />
                    <h3>VOA听力</h3>
                    <p>慢速英语听力。</p>
                    <div className="lv">筹备中</div>
                  </div>

                  <div className="sb-card sb-cell soon">
                    <Scroll className="size-7 text-sun-orange" strokeWidth={2} />
                    <h3>伊索寓言</h3>
                    <p>英语故事里的智慧。</p>
                    <div className="lv">筹备中</div>
                  </div>

                  <Link to="/stories" className="sb-card sb-cell wide">
                    <BookMarked className="size-7 text-sun-orange" strokeWidth={2} />
                    <div className="body">
                      <h3>绘本</h3>
                      <p>视觉阅读与理解练习。</p>
                      <div className="lv">Oxford Levels 1–20 · Home / School</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* 金句卡 */}
              {currentSentence ? (
                <div className="sb-card sb-quote">
                  <div className="txt">
                    <div className="en">“{currentSentence.text}”</div>
                    <div className="zh">{currentSentence.translation}</div>
                    <div className="attr">
                      {currentSentence.source
                        ? `— ${currentSentence.source}`
                        : "— 每日精读金句"}
                    </div>
                  </div>
                  <button
                    className="sb-speaker"
                    onClick={handlePlayQuoteAudio}
                    title="听范读"
                  >
                    <Volume2
                      className={`size-6 text-sun-orange ${
                        isPlayingTts ? "animate-pulse" : ""
                      }`}
                    />
                  </button>
                </div>
              ) : null}
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

              {/* 今日任务 */}
              <div className="sb-missions">
                <h2>今日任务</h2>
                <div className="sb-card sb-mission-list">
                  <Link to="/pronunciation_assessments" className="sb-mission-row">
                    <div className="sb-mission-ic">
                      <Mic className="size-5 text-sun-orange" />
                    </div>
                    <div className="txt">
                      <h3>发音检测</h3>
                      <p>
                        {todayAssessmentsCount > 0
                          ? `今天已完成 ${todayAssessmentsCount} 次练习`
                          : "今天练习 3 个词"}
                      </p>
                    </div>
                    <ChevronRight className="size-5 text-sand-border" />
                  </Link>

                  <Link to="/listening" className="sb-mission-row">
                    <div className="sb-mission-ic">
                      <Clock className="size-5 text-sun-orange" />
                    </div>
                    <div className="txt">
                      <h3>每日阅读</h3>
                      <p>5 分钟听故事沉浸</p>
                    </div>
                    <ChevronRight className="size-5 text-sand-border" />
                  </Link>
                </div>
              </div>

              {/* 每日寓言（筹备中占位，与工单 G 口径一致） */}
              <div className="sb-fable-placeholder">
                <div className="top">
                  <span className="kicker">每日阅读</span>
                  <span className="tag">筹备中</span>
                </div>
                <h3>伊索经典双语微剧场</h3>
                <p>精选原版伊索寓言、逐句跟读与童趣动画正在音频化生产，即将常驻上线！</p>
              </div>
            </div>
          </div>
        </div>

        {/* 页脚 */}
        <DesktopFooter />
      </main>
    </div>
  );
};
