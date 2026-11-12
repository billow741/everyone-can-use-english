// 阳光桥少儿英语 · 版块入口卡陈列组件 (Level / Section Entry Cards)
// 复用于主页 (home.tsx) 与 体系课程页 (courses/index.tsx)
// 依据工单 G：IA 翻转为资源先行七版块（自然拼读/听故事/环球漫游/情景对话/VOA听力/伊索寓言/绘本）

import React from "react";
import { SectionEntryCards } from "@renderer/components/sections";

export interface LevelEntryCardsProps {
  className?: string;
  currentLevelOverride?: string;
}

export const LevelEntryCards: React.FC<LevelEntryCardsProps> = ({
  className = "",
}) => {
  return <SectionEntryCards className={className} />;
};
