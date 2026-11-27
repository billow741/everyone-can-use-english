import React, { useContext, useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
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
  Award,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useVocabBadge } from "@renderer/lib/vocab-count";
import { useWeeklyActiveDays } from "@renderer/lib/desktop-data";
import { AppSettingsProviderContext } from "@renderer/context";
import { animateSlidingIndicator } from "@renderer/lib/motion";

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
    | "profile"
    | string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab: propActiveTab,
}) => {
  const { activeCount, days } = useWeeklyActiveDays();
  const { EnjoyApp, user } = useContext(AppSettingsProviderContext);
  const location = useLocation();
  const pathname = location.pathname;
  const vocabBadge = useVocabBadge();
  const sidebarRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  // 侧栏折叠状态：优先从 localStorage 同步读取避免初次渲染抖动
  // 遵循旧侧栏规范：EnjoyApp.cacheObjects 键 "sidebarOpen"，值 isCollapsed 布尔
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("sidebarOpen");
        if (stored !== null) {
          return stored === "true";
        }
      } catch {}
    }
    return false;
  });

  // 恢复 Electron EnjoyApp 缓存中的侧栏折叠状态
  // 在 Web/浏览器环境下 mockApp 的 get("sidebarOpen") 会返回 null，此时保持 localStorage 初始值
  useEffect(() => {
    if (EnjoyApp?.cacheObjects?.get) {
      EnjoyApp.cacheObjects
        .get("sidebarOpen")
        .then((value: any) => {
          if (value !== undefined && value !== null) {
            setIsCollapsed(!!value);
          }
        })
        .catch(() => {});
    }
  }, [EnjoyApp]);

  // 监听多实例或跨组件联动
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail && typeof e.detail.isCollapsed === "boolean") {
        setIsCollapsed(e.detail.isCollapsed);
      }
    };
    window.addEventListener("sb-sidebar-toggle", handler);
    return () => {
      window.removeEventListener("sb-sidebar-toggle", handler);
    };
  }, []);

  // 同步根元素 class，使正文区 .sb-main 宽度自适应
  useEffect(() => {
    if (isCollapsed) {
      document.documentElement.classList.add("sb-sidebar-collapsed");
    } else {
      document.documentElement.classList.remove("sb-sidebar-collapsed");
    }
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (EnjoyApp?.cacheObjects?.set) {
        try {
          EnjoyApp.cacheObjects.set("sidebarOpen", next);
        } catch {}
      }
      try {
        localStorage.setItem("sidebarOpen", String(next));
      } catch {}
      window.dispatchEvent(
        new CustomEvent("sb-sidebar-toggle", {
          detail: { isCollapsed: next },
        })
      );
      return next;
    });
  };


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
    if (cleanPath.startsWith("/listening") && !cleanPath.includes("/world") && !cleanPath.includes("/voa")) {
      return "listening";
    }
    if (cleanPath.startsWith("/world") || cleanPath.startsWith("/theater")) {
      return "world";
    }
    if (cleanPath.startsWith("/dialogues")) return "dialogues";
    if (cleanPath.startsWith("/voa") || (cleanPath.startsWith("/listening") && cleanPath.includes("/voa"))) return "voa";
    if (cleanPath.startsWith("/fables")) return "fables";
    if (cleanPath.startsWith("/stories")) return "stories";
    if (cleanPath.startsWith("/pronunciation_assessments")) return "pronunciation";
    if (cleanPath.startsWith("/vocabulary")) return "vocabulary";
    if (cleanPath.startsWith("/profile")) return "profile";
    return "";
  }, [propActiveTab, pathname]);

  // 当前项指示滑动跟随 (Motion Prompt #057 / #060)
  useLayoutEffect(() => {
    if (!sidebarRef.current || !indicatorRef.current) return;
    const activeEl = sidebarRef.current.querySelector<HTMLElement>(".sb-nav-item.active");
    animateSlidingIndicator(indicatorRef.current, activeEl);
  }, [currentTab, isCollapsed]);

  const handleOpenConsultation = () => {
    const url = "https://www.sunnybridge.qzz.io/apply.html";
    if (EnjoyApp?.shell?.openExternal) {
      EnjoyApp.shell.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <aside ref={sidebarRef} className={`sb-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* 当前选中指示滑动滑块 (Motion Prompt #057 / #060) */}
      <div
        ref={indicatorRef}
        className="sb-nav-indicator pointer-events-none"
        aria-hidden="true"
        style={{
          position: "absolute",
          borderRadius: 12,
          backgroundColor: "#E7F2EF",
          zIndex: 1,
          opacity: 0,
        }}
      />

      <div className={`sb-sidebar-head ${isCollapsed ? "collapsed" : ""}`}>
        {!isCollapsed && (
          <Link to="/" className="sb-brand">
            <img src="/assets/logo-horizontal-teal.png" alt="SunnyBridge" />
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapse}
          className="sb-collapse-btn"
          title={isCollapsed ? "展开侧栏" : "折叠侧栏"}
          aria-label={isCollapsed ? "展开侧栏" : "折叠侧栏"}
          data-testid="sidebar-collapse-btn"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="size-4 shrink-0 text-[#4E6B69]" />
          ) : (
            <PanelLeftClose className="size-4 shrink-0 text-[#4E6B69]" />
          )}
        </button>
      </div>

      <Link
        to="/"
        className={`sb-nav-item ${currentTab === "home" ? "active" : ""}`}
        title="首页"
      >
        <Home className="size-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="name">首页</span>
      </Link>

      <div className="sb-nav-label">学习版块</div>
      <Link
        to="/phonics/alphabet-song"
        className={`sb-nav-item ${currentTab === "phonemes" ? "active" : ""}`}
        title="自然拼读"
      >
        <BookOpen className="size-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="name">自然拼读</span>
        <span className="lv sb-lv-a0">A0</span>
      </Link>
      <Link
        to="/listening"
        className={`sb-nav-item ${currentTab === "listening" ? "active" : ""}`}
        title="听故事"
      >
        <Headphones className="size-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="name">听故事</span>
        <span className="lv sb-lv-a1">A1–B1</span>
      </Link>
      <Link
        to="/world"
        className={`sb-nav-item ${currentTab === "world" ? "active" : ""}`}
        title="环球漫游"
      >
        <Compass className="size-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="name">环球漫游</span>
        <span className="lv sb-lv-a2">A2–B1</span>
      </Link>
      <Link
        to="/dialogues"
        className={`sb-nav-item ${currentTab === "dialogues" ? "active" : ""}`}
        title="情景对话"
      >
        <MessageCircle className="size-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="name">情景对话</span>
        <span className="lv sb-lv-a1">A1–B1</span>
      </Link>
      <Link
        to="/voa"
        className={`sb-nav-item ${currentTab === "voa" ? "active" : ""}`}
        title="VOA听力"
      >
        <Radio className="size-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="name">VOA听力</span>
        <span className="lv sb-lv-a1">96 课</span>
      </Link>
      <Link
        to="/fables"
        className={`sb-nav-item ${currentTab === "fables" ? "active" : ""}`}
        title="伊索寓言"
      >
        <Scroll className="size-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="name">伊索寓言</span>
        <span className="lv sb-lv-a1">143 则</span>
      </Link>
      <Link
        to="/stories"
        className={`sb-nav-item ${currentTab === "stories" ? "active" : ""}`}
        title="绘本"
      >
        <BookMarked className="size-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="name">绘本</span>
        <span className="lv sb-lv-a2">Oxford</span>
      </Link>

      <div className="sb-nav-label">工具</div>
      <Link
        to="/pronunciation_assessments"
        className={`sb-nav-item ${currentTab === "pronunciation" ? "active" : ""}`}
        title="发音纠错"
      >
        <Mic className="size-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="name">发音纠错</span>
      </Link>
      <Link
        to="/vocabulary"
        className={`sb-nav-item ${currentTab === "vocabulary" ? "active" : ""}`}
        title="生词本"
      >
        <Layers className="size-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="name">生词本</span>
        {vocabBadge.count > 0 && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-[#E7F2EF] text-[#0A5E5D] border-[#0F7B7A]/25">
            {vocabBadge.mode === "due"
              ? `待复习 ${vocabBadge.count}`
              : `${vocabBadge.count} 词`}
          </span>
        )}
      </Link>

      <div className="sb-nav-label">我的</div>
      <Link
        to="/profile"
        className={`sb-nav-item ${currentTab === "profile" ? "active" : ""}`}
        title="我的成就"
      >
        <Award className="size-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="name">我的成就</span>
      </Link>

      <div className="spacer" />

      {!isCollapsed && (
        <>
          {/* 底部敢敢辅导横幅 / 推广卡 */}
          <div className="mt-1.5 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 text-left select-none">
            <div className="flex items-baseline justify-between gap-2 mb-0.5">
              <div className="text-xs font-bold text-[#0A5E5D]">
                敢敢专属伴学
              </div>
              <div className="text-[10px] text-ink-muted">
                SunnyBridge 课后巩固
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              按资源选内容，每天 15 分钟练好纯正英语发音！
            </p>
          </div>

          {/* 预约外教试听 常驻转化入口 */}
          <button
            type="button"
            onClick={handleOpenConsultation}
            className="w-full mt-2 mb-2 py-2 px-3 rounded-[14px] bg-[#F2A93B] hover:bg-[#E0992E] active:scale-[0.97] text-[#123B3C] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs border-0"
            title="预约外教 · 课程咨询"
          >
            <Sparkles className="size-3.5 shrink-0 fill-[#123B3C]/20" />
            <span>预约外教试听</span>
          </button>

          <div className="sb-week-card">
            <h3>本周学习</h3>
            <p>已坚持 <span className="tabular-nums">{activeCount}</span> 天 · 保持节奏！</p>
            <div className="sb-week-dots">
              {days.map((act, i) => (
                <i key={i} className={act ? "" : "off"} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* 底部账号区：绑定真实用户名与首字，无名时兜底「学员」 */}
      {(() => {
        const displayName = user?.name?.trim() || "学员";
        const displayInitial = Array.from(displayName)[0]?.toUpperCase() || "学";
        return (
          <div className="sb-account account" title={displayName}>
            <span className="ava">{displayInitial}</span>
            {!isCollapsed && <span className="who truncate">{displayName}</span>}
          </div>
        );
      })()}
    </aside>
  );
};
