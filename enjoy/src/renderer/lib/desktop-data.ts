import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import { getPhonemeMasteryMap, subscribePhonemeMastery, ALL_39_PHONEMES } from "./phoneme-data";
import { getDialogueProgress, subscribeDialogueProgress } from "./dialogue-service";
import { getFinishedLocal } from "./listening-sync";
import { getUserCurriculumProgress } from "./curriculum-service";
import { getUserTheaterProgress } from "./theater-service";

/**
 * 真实计算用户累计星数（绝不硬编码）
 */
export function useUserStars(): number {
  const [phonemeMap, setPhonemeMap] = useState(() => getPhonemeMasteryMap());
  const [dialogueMap, setDialogueMap] = useState(() => getDialogueProgress());

  useEffect(() => {
    const unsubP = subscribePhonemeMastery((state) => {
      if (state?.masteryMap) setPhonemeMap(state.masteryMap);
    });
    const unsubD = subscribeDialogueProgress((prog) => {
      setDialogueMap(prog);
    });
    return () => {
      unsubP();
      unsubD();
    };
  }, []);

  return useMemo(() => {
    // 1. 39 音标掌握 (每个音素点亮积 1 星)
    const phonemeStars = ALL_39_PHONEMES.filter((p) => !!phonemeMap[p.slug]).length;

    // 2. 对话课通关星
    const dialogueStars = Object.values(dialogueMap).reduce(
      (acc, cur) => acc + (cur?.stars || 0),
      0
    );

    // 3. 听故事已听完章节 (每章 3 星)
    const finishedMap = getFinishedLocal();
    let listeningCount = 0;
    for (const b of Object.values(finishedMap)) {
      if (b && typeof b === "object") {
        listeningCount += Object.values(b).filter(Boolean).length;
      }
    }
    const listeningStars = listeningCount * 3;

    // 4. 体系课与微剧场星
    const curriculumProg = getUserCurriculumProgress();
    const curriculumStars = Object.values(curriculumProg?.unitStars || {}).reduce(
      (acc, s) => acc + (s || 0),
      0
    );
    const theaterStars = getUserTheaterProgress()?.totalStars || 0;

    return phonemeStars + dialogueStars + listeningStars + curriculumStars + theaterStars;
  }, [phonemeMap, dialogueMap]);
}

/**
 * 真实计算本周 7 天学习足迹（周一至周日）
 */
export function useWeeklyActiveDays(): {
  activeCount: number;
  days: boolean[];
} {
  return useMemo(() => {
    const now = dayjs();
    // Monday of current week
    const currentDay = now.day(); // 0 is Sunday, 1 is Monday...
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = now.add(mondayOffset, "day").startOf("day");

    // Collect dates that had activity from localStorage
    const activeDates = new Set<string>();

    // 1. learning events
    try {
      const rawEvents = localStorage.getItem("sunnybridge_learning_events_v1");
      if (rawEvents) {
        const events = JSON.parse(rawEvents);
        if (Array.isArray(events)) {
          for (const ev of events) {
            if (ev?.ts) {
              activeDates.add(dayjs(ev.ts).format("YYYY-MM-DD"));
            }
          }
        }
      }
    } catch {}

    // 2. check today's tasks
    const todayStr = now.format("YYYY-MM-DD");
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.includes(todayStr)) {
        activeDates.add(todayStr);
        break;
      }
    }

    // 3. build 7 days array (Mon to Sun)
    const days: boolean[] = [];
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = monday.add(i, "day");
      const dStr = d.format("YYYY-MM-DD");
      // Day is active if recorded or if it is today and user has opened the app
      const isPastOrToday = d.isBefore(now, "day") || d.isSame(now, "day");
      const isActive = activeDates.has(dStr) || (d.isSame(now, "day"));
      const dayActive = isPastOrToday && isActive;
      days.push(dayActive);
      if (dayActive) count++;
    }

    return { activeCount: count, days };
  }, []);
}

export interface RecentListeningItem {
  book: string;
  chapter: string;
  title: string;
  level?: string;
  sentenceCount: number;
  duration: number;
  currentTime: number;
  progressPercent: number;
}

const BOOK_LISTEN_TIMES_KEY = "sunnybridge_listening_book_times_v1";

/**
 * 获取每本书最近一次收听时间戳（用于书架按最近收听排序）
 */
export function getBookListeningTimes(): Record<string, number> {
  const times: Record<string, number> = {};
  try {
    const rawMap = localStorage.getItem(BOOK_LISTEN_TIMES_KEY);
    if (rawMap) {
      const parsed = JSON.parse(rawMap);
      if (parsed && typeof parsed === "object") {
        for (const [book, ts] of Object.entries(parsed)) {
          if (typeof ts === "number" && Number.isFinite(ts) && ts > 0) {
            times[book] = ts;
          }
        }
      }
    }
  } catch {}
  try {
    const rawRecent = localStorage.getItem("sunnybridge_listening_recent");
    if (rawRecent) {
      const recent = JSON.parse(rawRecent);
      if (recent?.book && recent?.chapter && recent?.duration > 0) {
        const ts =
          typeof recent.updatedAt === "number" && Number.isFinite(recent.updatedAt) && recent.updatedAt > 0
            ? recent.updatedAt
            : Date.now();
        times[recent.book] = Math.max(times[recent.book] || 0, ts);
      }
    }
  } catch {}
  return times;
}

/**
 * 获取真实最近收听进度
 */
export function getRecentListening(): RecentListeningItem | null {
  try {
    const raw = localStorage.getItem("sunnybridge_listening_recent");
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.book && data?.chapter && data?.duration > 0) {
        const pct = Math.min(100, Math.max(1, Math.round((data.currentTime / data.duration) * 100)));
        return {
          book: data.book,
          chapter: data.chapter,
          title: data.title || "The Tale of Peter Rabbit",
          level: data.level || "a1",
          sentenceCount: data.sentenceCount || 57,
          duration: data.duration,
          currentTime: data.currentTime || 0,
          progressPercent: pct,
        };
      }
    }
  } catch {}
  return null;
}

export function saveRecentListening(item: {
  book: string;
  chapter: string;
  title: string;
  level?: string;
  sentenceCount: number;
  duration: number;
  currentTime: number;
}) {
  const now = Date.now();
  try {
    localStorage.setItem("sunnybridge_listening_recent", JSON.stringify({
      ...item,
      updatedAt: now,
    }));
  } catch {}
  try {
    const rawMap = localStorage.getItem(BOOK_LISTEN_TIMES_KEY);
    const parsed = rawMap ? JSON.parse(rawMap) : {};
    const times = parsed && typeof parsed === "object" ? parsed : {};
    times[item.book] = now;
    localStorage.setItem(BOOK_LISTEN_TIMES_KEY, JSON.stringify(times));
  } catch {}
}
