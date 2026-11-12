import React from "react";
import { Link } from "react-router-dom";
import {
  Home,
  BookOpen,
  Headphones,
  Compass,
  MessageCircle,
  Radio,
  Scroll,
  BookMarked,
  Mic,
  Layers,
} from "lucide-react";
import { useWeeklyActiveDays } from "@renderer/lib/desktop-data";

export interface DesktopSidebarProps {
  activeTab: "home" | "listening" | "pronunciation";
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeTab }) => {
  const { activeCount, days } = useWeeklyActiveDays();

  return (
    <aside className="sb-sidebar">
      <Link to="/" className="sb-brand">
        SunnyBridge
      </Link>

      <Link
        to="/"
        className={`sb-nav-item ${activeTab === "home" ? "active" : ""}`}
      >
        <Home className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">首页</span>
      </Link>

      <div className="sb-nav-label">学习版块</div>
      <Link to="/phonemes" className="sb-nav-item">
        <BookOpen className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">自然拼读</span>
        <span className="lv sb-lv-a0">A0</span>
      </Link>
      <Link
        to="/listening"
        className={`sb-nav-item ${activeTab === "listening" ? "active" : ""}`}
      >
        <Headphones className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">听故事</span>
        <span className="lv sb-lv-a1">A1–B1</span>
      </Link>
      <Link to="/world" className="sb-nav-item">
        <Compass className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">环球漫游</span>
        <span className="lv sb-lv-a2">A2–B1</span>
      </Link>
      <Link to="/dialogues" className="sb-nav-item">
        <MessageCircle className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">情景对话</span>
        <span className="lv sb-lv-a1">A1–B1</span>
      </Link>
      <Link to="/voa" className="sb-nav-item">
        <Radio className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">VOA听力</span>
        <span className="tag soon">筹备中</span>
      </Link>
      <Link to="/fables" className="sb-nav-item">
        <Scroll className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">伊索寓言</span>
        <span className="tag soon">筹备中</span>
      </Link>
      <Link to="/stories" className="sb-nav-item">
        <BookMarked className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">绘本</span>
        <span className="lv sb-lv-a2">Oxford</span>
      </Link>

      <div className="sb-nav-label">工具</div>
      <Link
        to="/pronunciation_assessments"
        className={`sb-nav-item ${activeTab === "pronunciation" ? "active" : ""}`}
      >
        <Mic className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">发音纠错</span>
      </Link>
      <Link to="/vocabulary" className="sb-nav-item">
        <Layers className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">生词本</span>
      </Link>

      <div className="spacer" />
      <div className="sb-week-card">
        <h4>本周学习</h4>
        <p>已坚持 {activeCount} 天 · 保持节奏！</p>
        <div className="sb-week-dots">
          {days.map((act, i) => (
            <i key={i} className={act ? "" : "off"} />
          ))}
        </div>
      </div>
    </aside>
  );
};
