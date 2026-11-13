import React, { useContext, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
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
  Sparkles,
} from "lucide-react";
import { useWeeklyActiveDays } from "@renderer/lib/desktop-data";
import { AppSettingsProviderContext } from "@renderer/context";

export interface DesktopSidebarProps {
  activeTab?:
    | "home"
    | "listening"
    | "pronunciation"
    | "phonemes"
    | "world"
    | "dialogues"
    | "voa"
    | "fables"
    | "stories"
    | "vocabulary"
    | string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab: propActiveTab,
}) => {
  const { activeCount, days } = useWeeklyActiveDays();
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const location = useLocation();
  const pathname = location.pathname;


  const currentTab = useMemo(() => {
    if (propActiveTab) return propActiveTab;
    const cleanPath = pathname.replace(/\/+$/, "") || "/";
    if (cleanPath === "/") return "home";
    if (
      cleanPath.startsWith("/phonemes") ||
      cleanPath.startsWith("/families") ||
      cleanPath.startsWith("/phonics")
    ) {
      return "phonemes";
    }
    if (cleanPath.startsWith("/listening") && !cleanPath.includes("/world")) {
      return "listening";
    }
    if (cleanPath.startsWith("/world") || cleanPath.startsWith("/theater")) {
      return "world";
    }
    if (cleanPath.startsWith("/dialogues")) return "dialogues";
    if (cleanPath.startsWith("/voa")) return "voa";
    if (cleanPath.startsWith("/fables")) return "fables";
    if (cleanPath.startsWith("/stories")) return "stories";
    if (cleanPath.startsWith("/pronunciation_assessments")) return "pronunciation";
    if (cleanPath.startsWith("/vocabulary")) return "vocabulary";
    return "";
  }, [propActiveTab, pathname]);

  const handleOpenConsultation = () => {
    const url = "https://www.sunnybridge.qzz.io/apply.html";
    if (EnjoyApp?.shell?.openExternal) {
      EnjoyApp.shell.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <aside className="sb-sidebar">
      <Link to="/" className="sb-brand">
        SunnyBridge
      </Link>

      <Link
        to="/"
        className={`sb-nav-item ${currentTab === "home" ? "active" : ""}`}
      >
        <Home className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">首页</span>
      </Link>

      <div className="sb-nav-label">学习版块</div>
      <Link
        to="/phonemes"
        className={`sb-nav-item ${currentTab === "phonemes" ? "active" : ""}`}
      >
        <BookOpen className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">自然拼读</span>
        <span className="lv sb-lv-a0">A0</span>
      </Link>
      <Link
        to="/listening"
        className={`sb-nav-item ${currentTab === "listening" ? "active" : ""}`}
      >
        <Headphones className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">听故事</span>
        <span className="lv sb-lv-a1">A1–B1</span>
      </Link>
      <Link
        to="/world"
        className={`sb-nav-item ${currentTab === "world" ? "active" : ""}`}
      >
        <Compass className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">环球漫游</span>
        <span className="lv sb-lv-a2">A2–B1</span>
      </Link>
      <Link
        to="/dialogues"
        className={`sb-nav-item ${currentTab === "dialogues" ? "active" : ""}`}
      >
        <MessageCircle className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">情景对话</span>
        <span className="lv sb-lv-a1">A1–B1</span>
      </Link>
      <Link
        to="/voa"
        className={`sb-nav-item ${currentTab === "voa" ? "active" : ""}`}
      >
        <Radio className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">VOA听力</span>
        <span className="tag soon">筹备中</span>
      </Link>
      <Link
        to="/fables"
        className={`sb-nav-item ${currentTab === "fables" ? "active" : ""}`}
      >
        <Scroll className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">伊索寓言</span>
        <span className="tag soon">筹备中</span>
      </Link>
      <Link
        to="/stories"
        className={`sb-nav-item ${currentTab === "stories" ? "active" : ""}`}
      >
        <BookMarked className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">绘本</span>
        <span className="lv sb-lv-a2">Oxford</span>
      </Link>

      <div className="sb-nav-label">工具</div>
      <Link
        to="/pronunciation_assessments"
        className={`sb-nav-item ${currentTab === "pronunciation" ? "active" : ""}`}
      >
        <Mic className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">发音纠错</span>
      </Link>
      <Link
        to="/vocabulary"
        className={`sb-nav-item ${currentTab === "vocabulary" ? "active" : ""}`}
      >
        <Layers className="size-5 shrink-0 text-sun-orange" strokeWidth={2} />
        <span className="name">生词本</span>
      </Link>

      <div className="spacer" />

      {/* 预约外教试听 常驻转化入口 */}
      <button
        type="button"
        onClick={handleOpenConsultation}
        className="w-full mb-3.5 py-2.5 px-3 rounded-[14px] bg-sun-orange hover:bg-sun-orange-hover active:scale-[0.97] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs border-0"
        title="预约外教 · 课程咨询"
      >
        <Sparkles className="size-4 shrink-0 fill-white/20" />
        <span>预约外教试听</span>
      </button>

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
