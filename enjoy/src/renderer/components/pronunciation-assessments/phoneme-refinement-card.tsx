import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FlameIcon,
  ChevronRightIcon,
  SparklesIcon,
  Volume2Icon,
  MicIcon,
  RotateCwIcon,
} from "lucide-react";
import { Button } from "@renderer/components/ui";
import { getPhonemeUserId, getPhonemeAuthHeaders } from "@renderer/lib/phoneme-cloud-sync";
import { PHONICS_ISLAND_39_ANCHORS, PhonicsAnchorItem } from "@renderer/lib/phoneme-anchors";
import { TMM_CURATED_EXERCISES, TmmCuratedExercise } from "@renderer/data/tmm-curated-exercises";
import { usePronunciationCoach } from "@renderer/context";
import dayjs from "dayjs";

const getApiBase = (): string => {
  if (typeof window === "undefined") return "https://app.sunnybridge.qzz.io";
  if (window.location.origin.includes("sunnybridge.qzz.io")) return "";
  return "https://app.sunnybridge.qzz.io";
};

// 常见辅音/元音与 12 词族的快速导航映射表
const PHONEME_FAMILY_MAP: Record<string, string> = {
  r: "am", j: "am", y: "am",
  c: "at", h: "at", b: "at", m: "at", t: "at",
  f: "an", v: "an", n: "an",
  p: "ap",
  d: "ad", s: "ad",
  w: "ag", g: "ag",
  l: "ip", z: "ip",
  k: "id",
  x: "ix",
  a: "at",
  i: "it",
};

export interface PhonemeRefinementSlotProps {
  className?: string;
  variant?: "home" | "level";
}

export const PhonemeRefinementSlot: React.FC<PhonemeRefinementSlotProps> = ({
  className = "",
  variant = "home",
}) => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { openAssessment } = usePronunciationCoach();

  useEffect(() => {
    let mounted = true;
    try {
      const uid = getPhonemeUserId();
      const apiBase = getApiBase();
      const headers = getPhonemeAuthHeaders(uid);

      fetch(`${apiBase}/api/v1/pronunciation/phoneme-stats?user_id=${encodeURIComponent(uid)}`, {
        headers,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (mounted && data?.phonemes && Array.isArray(data.phonemes)) {
            setStats(data.phonemes);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setLoading(false);
        });
    } catch {
      if (mounted) setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, []);

  // 档案反哺规则 1 (回炉) + 规则 3 (沉默) + 规则 4 (复测):
  // 必须样本达标（attempts >= 5）且错误率居高（error_rate > 0.5）才进入回炉位；
  // 样本 < 5 的音素绝不结论、绝不进入回炉位（静默等待新样本）
  const refinementPhoneme = useMemo(() => {
    if (!stats || stats.length === 0) return null;
    const candidates = stats.filter(
      (s: any) => s && typeof s.attempts === "number" && s.attempts >= 5 && s.error_rate > 0.5
    );
    if (candidates.length === 0) return null;
    // 错误率最高优先，同错误率按尝试次数多者优先
    candidates.sort((a, b) => b.error_rate - a.error_rate || b.attempts - a.attempts);
    return candidates[0];
  }, [stats]);

  // 匹配 39 音素锚点信息
  const anchorInfo = useMemo<PhonicsAnchorItem | null>(() => {
    if (!refinementPhoneme) return null;
    const raw = String(refinementPhoneme.phoneme).replace(/[\/\[\]]/g, "").toLowerCase().trim();
    return (
      PHONICS_ISLAND_39_ANCHORS.find(
        (a) =>
          a.ipaSymbol.replace(/[\/\[\]]/g, "").toLowerCase().trim() === raw ||
          a.id.toLowerCase() === raw ||
          a.ipaSlug.toLowerCase() === raw
      ) || null
    );
  }, [refinementPhoneme]);

  // 匹配一句含该音素的精练句 (从真实外教金句库精选)
  const practiceSentence = useMemo<TmmCuratedExercise>(() => {
    if (!refinementPhoneme) return TMM_CURATED_EXERCISES[0];
    const raw = String(refinementPhoneme.phoneme).replace(/[\/\[\]]/g, "").toLowerCase().trim();
    const matched = TMM_CURATED_EXERCISES.find(
      (e) =>
        e.phonicsFocus.toLowerCase().includes(raw) ||
        (e.targetPhoneme && e.targetPhoneme.toLowerCase().includes(raw)) ||
        e.text.toLowerCase().includes(anchorInfo?.letter?.toLowerCase() || raw)
    );
    return matched || TMM_CURATED_EXERCISES[0];
  }, [refinementPhoneme, anchorInfo]);

  // 规则 3：样本不足（<5 次）或无失分音素时完全静默，不渲染任何侵入 UI
  if (loading || !refinementPhoneme) {
    return null;
  }

  const rawSymbol = String(refinementPhoneme.phoneme).replace(/[\/\[\]]/g, "");
  const letter = anchorInfo?.letter || rawSymbol.toUpperCase();
  const errorRatePercent = Math.round(refinementPhoneme.error_rate * 100);
  const attempts = refinementPhoneme.attempts;
  const familyId = PHONEME_FAMILY_MAP[rawSymbol.toLowerCase()] || "am";

  const handleStartSentencePractice = () => {
    openAssessment({
      referenceText: practiceSentence.text,
      translation: practiceSentence.translation,
      audioUrl: practiceSentence.audioUrl,
      phonicsFocus: practiceSentence.phonicsFocus,
      source: "quote",
      contextTitle: `🎯 回炉精练句 · [/${rawSymbol}/]`,
      archiveContext: {
        source: "quote",
        contextRef: `refinement#${rawSymbol}#${dayjs().format("YYYY-MM-DD")}`,
      },
    });
  };

  return (
    <div
      className={`rounded-2xl border-2 border-rose-300/80 bg-gradient-to-r from-rose-50/90 via-orange-50/70 to-amber-50/90 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900 p-4 sm:p-5 shadow-sm transition-all ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* 左侧：回炉诊断依据与音素名头 */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="size-11 sm:size-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
            🎯
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                <FlameIcon className="size-4 text-rose-500 fill-rose-500" />
                <span>发音回炉专位 · 重点音素攻坚</span>
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-400/40">
                失分率 {errorRatePercent}% · 已测 {attempts} 次
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                系统被动复测中，达标自动点亮移出
              </span>
            </div>

            <p className="text-xs text-rose-900/80 dark:text-slate-300 font-medium leading-relaxed">
              系统听出孩子在音标{" "}
              <strong className="font-mono text-rose-700 dark:text-rose-300 font-black">
                [/{rawSymbol}/]
              </strong>{" "}
              （{anchorInfo?.anchorWord || letter}）上容易混淆失分，推荐通过卡片口型、词族与精练句三步专项回炉攻克！
            </p>
          </div>
        </div>

        {/* 右侧：三处直达动作区 */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* 直达 1：3D 音素卡 */}
          <Link
            to={`/phonemes/${anchorInfo?.ipaSlug || rawSymbol}`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-800 dark:text-rose-300 text-xs font-black border border-rose-200 dark:border-rose-900/50 shadow-2xs transition-all hover:border-rose-400"
          >
            <span>🎴 3D 音素卡</span>
            <ChevronRightIcon className="size-3.5" />
          </Link>

          {/* 直达 2：对应词族 */}
          <Link
            to={`/families`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 text-amber-800 dark:text-amber-300 text-xs font-black border border-amber-200 dark:border-amber-900/50 shadow-2xs transition-all hover:border-amber-400"
          >
            <span>🧩 对应词族</span>
            <ChevronRightIcon className="size-3.5" />
          </Link>

          {/* 直达 3：含该音素的精练句（大声跟读） */}
          <Button
            size="sm"
            onClick={handleStartSentencePractice}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-black text-xs gap-1.5 shadow-sm shadow-rose-500/25 cursor-pointer"
          >
            <MicIcon className="size-3.5" />
            <span>练一句精练句</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PhonemeRefinementSlot;
