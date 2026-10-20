import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
} from "@renderer/components/ui";
import { usePronunciationCoach } from "@renderer/context";
import { PronunciationAssessmentForm } from "./pronunciation-assessment-form";
import {
  MicIcon,
  BookOpenIcon,
  SparklesIcon,
  LayersIcon,
  BotIcon,
  BookMarkedIcon,
  FlameIcon,
} from "lucide-react";

export const GlobalPronunciationAssessmentModal: React.FC = () => {
  const {
    isOpen,
    options,
    closeAssessment,
    setLastAssessment,
  } = usePronunciationCoach();

  if (!isOpen || !options) return null;

  const getSourceBadge = () => {
    switch (options.source) {
      case "story":
        return {
          icon: <BookOpenIcon className="size-3.5 text-purple-600" />,
          label: "📖 牛津精选绘本馆 · 原地纠音",
          className: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-400/40",
        };
      case "phonics":
        return {
          icon: <LayersIcon className="size-3.5 text-amber-600" />,
          label: "🔨 拼读积木工坊 · 单词发音测验",
          className: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-400/40",
        };
      case "phonemes":
        return {
          icon: <SparklesIcon className="size-3.5 text-emerald-600" />,
          label: "🧩 39 自然拼读通关岛 · 音素打分",
          className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-400/40",
        };
      case "chat":
        return {
          icon: <BotIcon className="size-3.5 text-sky-600" />,
          label: "🤖 敢敢 AI 随身外教 · 地道影子跟读",
          className: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-400/40",
        };
      case "vocabulary":
        return {
          icon: <BookMarkedIcon className="size-3.5 text-orange-600" />,
          label: "🎒 魔法发音生词本 · 口语掌握核验",
          className: "bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-400/40",
        };
      case "home":
        return {
          icon: <FlameIcon className="size-3.5 text-amber-600" />,
          label: "🌟 今日精读金句 · 大声跟读打卡",
          className: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-400/40",
        };
      default:
        return {
          icon: <MicIcon className="size-3.5 text-amber-500" />,
          label: "🎯 AI 发音魔法纠错舱 · 毫秒级音素打分",
          className: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-400/40",
        };
    }
  };

  const badgeInfo = getSourceBadge();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeAssessment();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-4 sm:p-6 bg-background/98 backdrop-blur-md border-l-2 border-amber-400/40 shadow-2xl z-[80]"
        aria-describedby={undefined}
      >
        <SheetHeader className="mb-4 text-left border-b border-border/50 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-2xs ${badgeInfo.className}`}
            >
              {badgeInfo.icon}
              <span>{badgeInfo.label}</span>
            </span>
            {options.contextTitle && (
              <span className="text-xs text-muted-foreground font-semibold">
                {options.contextTitle}
              </span>
            )}
          </div>
          <SheetTitle className="flex items-center gap-2 text-lg sm:text-xl font-black mt-2 text-foreground">
            <MicIcon className="size-5 text-amber-500" />
            <span>AI 发音魔法纠错舱</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-400/30">
              音素级声学诊断
            </span>
          </SheetTitle>
        </SheetHeader>

        <PronunciationAssessmentForm
          key={options.referenceText}
          defaultReferenceText={options.referenceText}
          audioUrl={options.audioUrl}
          translation={options.translation}
          phonicsFocus={options.phonicsFocus}
          bookMeta={options.bookMeta}
          onCancel={closeAssessment}
          onSuccess={(created) => {
            setLastAssessment(created);
            if (options.onSuccess) {
              try {
                options.onSuccess(created);
              } catch (e) {
                console.warn("Pronunciation coach onSuccess callback error:", e);
              }
            }
          }}
        />
      </SheetContent>
    </Sheet>
  );
};
