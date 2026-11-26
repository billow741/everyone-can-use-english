import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  getDialoguePack,
  getDialogueProgress,
  subscribeDialogueProgress,
  DialoguePack,
  DialogueLesson,
  DialogueProgressMap,
  LessonProgress,
} from "@renderer/lib/dialogue-service";
import {
  getPhonemeMasteryMap,
  subscribePhonemeMastery,
  ALL_39_PHONEMES,
} from "@renderer/lib/phoneme-data";
import { mapDialogueLevel } from "@renderer/lib/level-registry";
import { useCardStagger } from "@renderer/lib/motion";

// 12 课静态基础清单（dialogue-pack-kids-ok.json 单一真实来源兜底，绝不编造）
const DEFAULT_LESSONS: DialogueLesson[] = [
  { lessonId: "dlg-D004-M01-003", dialogueId: "dlg-D004-M01-003", part: 1, parts: 1, level: "Level 1", unit: 1, scene: "The Family", sceneZh: "一家人", theme: "家庭", pool: "kids-ok", ageBand: "5-8", lines: [] },
  { lessonId: "dlg-D004-M01-004", dialogueId: "dlg-D004-M01-004", part: 1, parts: 1, level: "Level 1", unit: 1, scene: "A Party", sceneZh: "派对上", theme: "朋友", pool: "kids-ok", ageBand: "5-8", lines: [] },
  { lessonId: "dlg-D004-M01-005-1", dialogueId: "dlg-D004-M01-005", part: 1, parts: 2, level: "Level 1", unit: 1, scene: "Objects & Animals", sceneZh: "物品和动物", theme: "物品与动物", pool: "kids-ok", ageBand: "5-8", lines: [] },
  { lessonId: "dlg-D004-M01-005-2", dialogueId: "dlg-D004-M01-005", part: 2, parts: 2, level: "Level 1", unit: 1, scene: "Objects & Animals", sceneZh: "物品和动物", theme: "物品与动物", pool: "kids-ok", ageBand: "5-8", lines: [] },
  { lessonId: "dlg-D004-M11-002", dialogueId: "dlg-D004-M11-002", part: 1, parts: 1, level: "Level 1+", unit: 2, scene: "Going on Vacation", sceneZh: "去度假", theme: "旅行", pool: "kids-ok", ageBand: "5-8", lines: [] },
  { lessonId: "dlg-D004-M11-005", dialogueId: "dlg-D004-M11-005", part: 1, parts: 1, level: "Level 1+", unit: 2, scene: "Brunch with a Friend", sceneZh: "和朋友吃早午餐", theme: "食物", pool: "kids-ok", ageBand: "5-8", lines: [] },
  { lessonId: "dlg-D004-M02-002", dialogueId: "dlg-D004-M02-002", part: 1, parts: 1, level: "Level 2", unit: 3, scene: "Adjectives", sceneZh: "形容词", theme: "描述", pool: "kids-ok", ageBand: "5-8", lines: [] },
  { lessonId: "dlg-D004-M02-003", dialogueId: "dlg-D004-M02-003", part: 1, parts: 1, level: "Level 2", unit: 3, scene: "Numbers & Letters", sceneZh: "数字和字母", theme: "数字与字母", pool: "kids-ok", ageBand: "5-8", lines: [] },
  { lessonId: "dlg-D004-M02-004-1", dialogueId: "dlg-D004-M02-004", part: 1, parts: 2, level: "Level 2", unit: 3, scene: "Dates & Times", sceneZh: "日期和时间", theme: "时间", pool: "kids-ok", ageBand: "5-8", lines: [] },
  { lessonId: "dlg-D004-M02-004-2", dialogueId: "dlg-D004-M02-004", part: 2, parts: 2, level: "Level 2", unit: 3, scene: "Dates & Times", sceneZh: "日期和时间", theme: "时间", pool: "kids-ok", ageBand: "5-8", lines: [] },
  { lessonId: "dlg-D004-M12-003", dialogueId: "dlg-D004-M12-003", part: 1, parts: 1, level: "Level 2+", unit: 4, scene: "A City Tour", sceneZh: "城市游览", theme: "旅行", pool: "kids-ok", ageBand: "8-12", lines: [] },
  { lessonId: "dlg-D004-M03-005", dialogueId: "dlg-D004-M03-005", part: 1, parts: 1, level: "Level 3", unit: 5, scene: "At the Shore", sceneZh: "在海边", theme: "自然", pool: "kids-ok", ageBand: "5-8", lines: [] },
];

export const DesktopDialogues: React.FC = () => {
  const [pack, setPack] = useState<DialoguePack | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "a1" | "a2" | "b1">("all");
  const stackRef = useRef<HTMLDivElement>(null);
  useCardStagger(stackRef, ".grid .card", [selectedFilter, pack]);

  // 响应式真实学习进度（空星 = 未开始）
  const [progress, setProgress] = useState<DialogueProgressMap>(() =>
    getDialogueProgress()
  );

  // 响应式 39 音标掌握状态
  const [phonemeMastery, setPhonemeMastery] = useState<Record<string, boolean>>(() =>
    getPhonemeMasteryMap()
  );

  useEffect(() => {
    let mounted = true;
    getDialoguePack()
      .then((data) => {
        if (mounted && data?.lessons?.length) {
          setPack(data);
        }
      })
      .catch((err) => {
        console.warn("Failed to load dialogue pack:", err);
      });

    const unsubProgress = subscribeDialogueProgress((newProg) => {
      if (mounted) {
        setProgress(newProg);
      }
    });

    const unsubMastery = subscribePhonemeMastery((state) => {
      if (mounted && state?.masteryMap) {
        setPhonemeMastery(state.masteryMap);
      }
    });

    return () => {
      mounted = false;
      unsubProgress();
      unsubMastery();
    };
  }, []);

  // 1. 已掌握 39 音素真实进度
  const masteredCount = useMemo(() => {
    return ALL_39_PHONEMES.filter((p) => !!phonemeMastery[p.slug]).length;
  }, [phonemeMastery]);

  // 全部课表清单（12课）
  const allLessons = useMemo(() => {
    return pack?.lessons?.length ? pack.lessons : DEFAULT_LESSONS;
  }, [pack]);

  // 2. 统计已通关数与总星数（真实数据，无来源留空态）
  const { completedCount, totalStars } = useMemo(() => {
    let completed = 0;
    let stars = 0;
    for (const l of allLessons) {
      const prog = progress[l.lessonId];
      if (prog && prog.stars > 0) {
        completed += 1;
        stars += prog.stars;
      }
    }
    return { completedCount: completed, totalStars: stars };
  }, [allLessons, progress]);

  // 3. 课表按级别分组（A1 / A2 / B1）
  const groupedLessons = useMemo(() => {
    const a1: DialogueLesson[] = [];
    const a2: DialogueLesson[] = [];
    const b1: DialogueLesson[] = [];

    for (const l of allLessons) {
      const lvl = mapDialogueLevel(l.level);
      if (lvl === "a1") a1.push(l);
      else if (lvl === "a2") a2.push(l);
      else if (lvl === "b1") b1.push(l);
    }

    return { a1, a2, b1 };
  }, [allLessons]);

  const renderStars = (starCount: number) => {
    return [1, 2, 3].map((idx) => {
      const isFilled = idx <= starCount;
      return (
        <svg
          key={idx}
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill={isFilled ? "#F2A93B" : "none"}
          stroke={isFilled ? "#F2A93B" : "#D3E4DE"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" />
        </svg>
      );
    });
  };

  const getStatusText = (prog?: LessonProgress) => {
    if (!prog || prog.stars === 0) return "未开始";
    if (prog.stars === 3) return "已通关";
    return "已完成";
  };

  const renderLessonCard = (lesson: DialogueLesson, levelKey: "a1" | "a2" | "b1") => {
    const prog = progress[lesson.lessonId];
    const stars = prog?.stars || 0;
    const statusText = getStatusText(prog);
    const partLabel =
      lesson.parts && lesson.parts > 1
        ? lesson.part === 1
          ? "（上）"
          : "（下）"
        : "";

    return (
      <Link
        key={lesson.lessonId}
        to={`/dialogues/${lesson.lessonId}`}
        className="card lesson"
      >
        <div className="lesson-top">
          <span className="theme">{lesson.theme}主题</span>
          <span className={`pill pill-${levelKey}`}>
            <span className={`dot dot-${levelKey}`}></span>
            {levelKey.toUpperCase()}
          </span>
        </div>
        <h3>
          {lesson.sceneZh}
          {partLabel}
        </h3>
        <div className="lesson-meta">
          <span className="age">{lesson.ageBand || "5-8"} 岁</span>
          <span className="stars">{renderStars(stars)}</span>
        </div>
        <div className="status">{statusText}</div>
      </Link>
    );
  };

  return (
    <div className="sb-dialogues">
      <div ref={stackRef} className="stack">
        {/* 黄色横幅 */}
        <div className="banner">
          <div className="ava">
            <img src="/assets/gangan/gangan_avatar240.png" alt="敢敢" />
          </div>
          <div className="txt">
            <div className="title-row">
              <h1>情景对话课 · 少儿沉浸会话</h1>
              <span className="badge">五步闭环</span>
            </div>
            <p>
              情景导入 → 连贯听音 → 逐句精学 → 角色扮演 → 结算通关。与敢敢一起大声开口，生活日常英文轻松表达！
            </p>
          </div>
        </div>

        {/* 数据行 */}
        <div className="card stats">
          <div className="stat">
            <div className="k">已掌握</div>
            <div className="v tabular-nums">
              {masteredCount} <small>/ 39</small>
            </div>
          </div>
          <div className="stat">
            <div className="k">获得</div>
            <div className="v tabular-nums">
              {totalStars} <span className="star">☆</span>
            </div>
          </div>
          <div className="stat">
            <div className="k">已完成课数</div>
            <div className="v tabular-nums">
              {completedCount} <small>/ {allLessons.length}</small>
            </div>
          </div>
        </div>

        {/* 级别筛选 */}
        <div className="filters">
          <button
            type="button"
            aria-pressed={selectedFilter === "all"}
            className={selectedFilter === "all" ? "on" : ""}
            onClick={() => setSelectedFilter("all")}
          >
            全部（{allLessons.length}课）
          </button>
          <button
            type="button"
            aria-pressed={selectedFilter === "a1"}
            className={selectedFilter === "a1" ? "on" : ""}
            onClick={() => setSelectedFilter("a1")}
          >
            A1 初级（L1/1+ · {groupedLessons.a1.length}课）
          </button>
          <button
            type="button"
            aria-pressed={selectedFilter === "a2"}
            className={selectedFilter === "a2" ? "on" : ""}
            onClick={() => setSelectedFilter("a2")}
          >
            A2 中级（L2/2+ · {groupedLessons.a2.length}课）
          </button>
          <button
            type="button"
            aria-pressed={selectedFilter === "b1"}
            className={selectedFilter === "b1" ? "on" : ""}
            onClick={() => setSelectedFilter("b1")}
          >
            B1 高级（L3 · {groupedLessons.b1.length}课）
          </button>
        </div>

        {/* 诊断测卡（只测不锁，筹备中，文字保持正常对比度，不挂伪链接） */}
        {(selectedFilter === "all" || selectedFilter === "a1") && (
          <div className="diag">
            <div className="txt">
              <h2>第 1 课 · 级别诊断</h2>
              <div className="soon">A1 诊断测筹备中</div>
              <p>专属发音与朗读能力诊断，只测不锁</p>
            </div>
            <span className="diag-status">内容分批上线</span>
          </div>
        )}

        {/* A1 初级分组 */}
        {(selectedFilter === "all" || selectedFilter === "a1") && (
          <>
            <div className="group-head">
              <span className="dot dot-a1"></span>
              <h2>A1 初级</h2>
            </div>
            <div className="grid">
              {groupedLessons.a1.map((l) => renderLessonCard(l, "a1"))}
            </div>
          </>
        )}

        {/* A2 中级分组 */}
        {(selectedFilter === "all" || selectedFilter === "a2") && (
          <>
            <div className="group-head">
              <span className="dot dot-a2"></span>
              <h2>A2 中级</h2>
            </div>
            <div className="grid">
              {groupedLessons.a2.map((l) => renderLessonCard(l, "a2"))}
            </div>
          </>
        )}

        {/* B1 高级分组 */}
        {(selectedFilter === "all" || selectedFilter === "b1") && (
          <>
            <div className="group-head">
              <span className="dot dot-b1"></span>
              <h2>B1 高级</h2>
            </div>
            <div className="grid">
              {groupedLessons.b1.map((l) => renderLessonCard(l, "b1"))}
            </div>
          </>
        )}

        {/* 页脚 */}
        <footer className="footer">
          <div className="links">
            <b>SunnyBridge</b>
            <span>关于我们</span>
            <span>帮助中心</span>
            <span>隐私政策</span>
          </div>
          <span>© 2026 SunnyBridge · 让孩子敢开口、敢表达</span>
        </footer>
      </div>
    </div>
  );
};
