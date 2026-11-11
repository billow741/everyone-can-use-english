import {
  Button,
  Dialog,
  DialogContent,
  ScrollArea,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DialogTitle,
  Avatar,
  AvatarImage,
  DropdownMenuSeparator,
  Badge,
} from "@renderer/components/ui";
import {
  SettingsIcon,
  HomeIcon,
  BookOpenIcon,
  BookMarkedIcon,
  UserIcon,
  LucideIcon,
  GraduationCapIcon,
  PanelLeftOpenIcon,
  PanelLeftCloseIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  SparklesIcon,
  MicIcon,
  AwardIcon,
  LayersIcon,
  HeartHandshakeIcon,
} from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { t } from "i18next";
import { Preferences } from "@renderer/components";
import { AppSettingsProviderContext } from "@renderer/context";
import { useContext, useEffect, useState, useMemo } from "react";
import { NoticiationsChannel } from "@renderer/cables";
import { useVocabBadge } from "@renderer/lib/vocab-count";
import {
  useLevelRegistry,
  calculateLevelProgress,
  determineCurrentLevel,
  LevelKey,
  LevelProgressInfo,
} from "@renderer/lib/level-registry";

interface NavigationItem {
  href?: string;
  onClick?: () => void;
  label: string;
  sublabel?: string;
  tooltip: string;
  Icon: LucideIcon;
  badge?: string;
  badgeVariant?: "amber" | "purple" | "emerald" | "default";
  testid?: string;
  active: boolean;
  isCurrentLevel?: boolean;
}

interface NavigationDomain {
  id: string;
  title: string;
  shortCode: string;
  items: NavigationItem[];
}

export const Sidebar = (props: {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}) => {
  const { isCollapsed, setIsCollapsed } = props;
  const location = useLocation();
  const activeTab = location.pathname;
  const vocabBadge = useVocabBadge();
  const { EnjoyApp, cable, displayPreferences, setDisplayPreferences } =
    useContext(AppSettingsProviderContext);

  const { resources } = useLevelRegistry();
  const currentLevel = useMemo(() => {
    const map: Record<LevelKey, LevelProgressInfo> = {
      a0: calculateLevelProgress("a0", resources),
      a1: calculateLevelProgress("a1", resources),
      a2: calculateLevelProgress("a2", resources),
      b1: calculateLevelProgress("b1", resources),
    };
    return determineCurrentLevel(map);
  }, [resources]);

  useEffect(() => {
    if (!cable) return;

    const channel = new NoticiationsChannel(cable);
    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [cable]);

  // Save the sidebar state to cache
  useEffect(() => {
    EnjoyApp.cacheObjects.set("sidebarOpen", isCollapsed);
  }, [isCollapsed]);

  // Restore the sidebar state from cache
  useEffect(() => {
    EnjoyApp.cacheObjects.get("sidebarOpen").then((value) => {
      if (value !== undefined) {
        setIsCollapsed(!!value);
      }
    });
  }, []);

  useEffect(() => {
    if (displayPreferences) {
      EnjoyApp.view.hide();
    } else {
      EnjoyApp.view.show();
    }
  }, [displayPreferences]);

  // 依据工单 C 规范收编桌面侧边栏：
  // 主页 ｜ 自然拼读(a0) ｜ 初级(a1) ｜ 中级(a2) ｜ 高级(b1) ｜ 生词本 ｜ 家长看板
  // 四级项链 /levels/:level 并带当前级进度点；家长看板沿用音素家长看板入口 (/phonemes)
  const domains: NavigationDomain[] = [
    {
      id: "main",
      title: "学习主场",
      shortCode: "NAV",
      items: [
        {
          href: "/",
          label: "主页",
          tooltip: "[主页] 阳光桥少儿英语 · 学习主场",
          Icon: HomeIcon,
          active: activeTab === "/",
        },
      ],
    },
    {
      id: "levels",
      title: "四级进阶",
      shortCode: "LEVELS",
      items: [
        {
          href: "/levels/a0",
          label: "自然拼读",
          sublabel: "Pre-A1",
          tooltip: "[A0 自然拼读 Pre-A1] 39 音素与词族乐园",
          Icon: SparklesIcon,
          badge: currentLevel === "a0" ? "在学" : undefined,
          badgeVariant: "amber",
          active: activeTab === "/levels/a0",
          isCurrentLevel: currentLevel === "a0",
          testid: "sidebar-level-a0",
        },
        {
          href: "/levels/a1",
          label: "初级",
          tooltip: "[A1 初级] 短故事独立跟读完，词尾不吞音",
          Icon: BookOpenIcon,
          badge: currentLevel === "a1" ? "在学" : undefined,
          badgeVariant: "amber",
          active: activeTab === "/levels/a1",
          isCurrentLevel: currentLevel === "a1",
          testid: "sidebar-level-a1",
        },
        {
          href: "/levels/a2",
          label: "中级",
          tooltip: "[A2 中级] 完整故事能复述，-ed/-s 读法过关",
          Icon: LayersIcon,
          badge: currentLevel === "a2" ? "在学" : undefined,
          badgeVariant: "amber",
          active: activeTab === "/levels/a2",
          isCurrentLevel: currentLevel === "a2",
          testid: "sidebar-level-a2",
        },
        {
          href: "/levels/b1",
          label: "高级",
          tooltip: "[B1 高级] 长篇朗读流利，能说出自己的看法",
          Icon: GraduationCapIcon,
          badge: currentLevel === "b1" ? "在学" : undefined,
          badgeVariant: "amber",
          active: activeTab === "/levels/b1",
          isCurrentLevel: currentLevel === "b1",
          testid: "sidebar-level-b1",
        },
      ],
    },
    {
      id: "speaking",
      title: "开口工具",
      shortCode: "SPEAK",
      items: [
        {
          href: "/pronunciation_assessments",
          label: "发音纠错舱",
          tooltip: "[发音纠错舱] 自由测一测 · 专项练完复测",
          Icon: MicIcon,
          active: activeTab.startsWith("/pronunciation_assessments"),
          testid: "sidebar-pronunciation-assessments",
        },
      ],
    },
    {
      id: "mine",
      title: "我的",
      shortCode: "MINE",
      items: [
        {
          href: "/vocabulary",
          label: "生词本",
          tooltip: "[生词本] 对话课生词与听力收藏词展示层聚合",
          Icon: BookMarkedIcon,
          badge:
            vocabBadge.count > 0
              ? vocabBadge.mode === "due"
                ? `待复习 ${vocabBadge.count}`
                : `${vocabBadge.count} 词`
              : undefined,
          badgeVariant: "purple",
          active: activeTab.startsWith("/vocabulary"),
          testid: "sidebar-vocabulary",
        },
        {
          href: "/profile",
          label: "我的成就",
          tooltip: "[我的成就] 个人中心、学情战报与成就奖章",
          Icon: AwardIcon,
          active: activeTab.startsWith("/profile"),
          testid: "sidebar-profile",
        },
        {
          href: "/phonemes/parent",
          label: "家长看板",
          tooltip: "[家长看板] 音素掌握小结与家庭辅导提示",
          Icon: HeartHandshakeIcon,
          badge: "看板",
          badgeVariant: "emerald",
          active: activeTab === "/phonemes/parent" || activeTab.startsWith("/phonemes/parent"),
          testid: "sidebar-parent-dashboard",
        },
      ],
    },
  ];

  return (
    <div
      className={`h-full pt-2 transition-all relative ${
        isCollapsed
          ? "w-[--sidebar-collapsed-width]"
          : "w-[--sidebar-expanded-width]"
      }`}
      data-testid="sidebar"
    >
      <div
        className={`fixed top-0 left-0 h-full bg-[#FFF9EF] dark:bg-slate-900 border-r border-[#F0DFC0] dark:border-slate-800 flex flex-col shadow-xs ${
          isCollapsed
            ? "w-[--sidebar-collapsed-width]"
            : "w-[--sidebar-expanded-width]"
        }`}
      >
        <ScrollArea className="w-full flex-1 pb-16 pt-3 px-1.5">
          <SunnyBridgeBrandHeader isCollapsed={isCollapsed} />
          <SidebarHeader isCollapsed={isCollapsed} />

          {/* 收编后的一体化导航 */}
          <div className="space-y-3 mt-1 pb-4">
            {domains.map((domain, dIdx) => (
              <div key={domain.id} className="space-y-1">
                {/* 领域分组标题 / 分隔线 */}
                {isCollapsed ? (
                  dIdx > 0 && <div className="my-2 mx-1 h-px bg-border/60" />
                ) : (
                  <div className="px-2 pt-2 pb-1 flex items-center justify-between select-none">
                    <span className="text-[11px] font-black tracking-wider text-muted-foreground/90">
                      {domain.title}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground/50 tracking-tighter">
                      {domain.shortCode}
                    </span>
                  </div>
                )}

                {/* 导航子项 */}
                <div className="space-y-0.5">
                  {domain.items.map((item) => (
                    <SidebarItem
                      key={item.label}
                      href={item.href}
                      onClick={item.onClick}
                      label={item.label}
                      tooltip={item.tooltip}
                      active={item.active}
                      Icon={item.Icon}
                      sublabel={item.sublabel}
                      badge={item.badge}
                      badgeVariant={item.badgeVariant}
                      testid={item.testid}
                      isCollapsed={isCollapsed}
                      isCurrentLevel={item.isCurrentLevel}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* 偏好设置弹窗 */}
            <Dialog
              open={displayPreferences}
              onOpenChange={setDisplayPreferences}
            >
              <DialogContent
                aria-describedby={undefined}
                container={document.body}
                className="max-w-screen-md xl:max-w-screen-lg h-5/6 p-0"
              >
                <DialogTitle className="hidden">
                  {t("sidebar.preferences")}
                </DialogTitle>
                <Preferences />
              </DialogContent>
            </Dialog>

            {/* 底部敢敢辅导横幅 */}
            {!isCollapsed && (
              <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-300/40 text-left select-none">
                <div className="flex items-center gap-2 mb-1.5">
                  <img
                    src="/assets/gangan/gangan_avatar240.png"
                    alt="敢敢"
                    className="size-8 rounded-full object-cover border border-amber-300 shadow-xs"
                  />
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
                      敢敢专属伴学
                    </div>
                    <div className="text-[10px] text-amber-700/80 dark:text-amber-400 truncate">
                      SunnyBridge 课后巩固
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
                  级别先行，循序渐进，每天 15 分钟练好纯正英语发音！
                </p>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-[#F5820B] hover:bg-[#e07507] text-white font-bold rounded-lg shadow-none cursor-pointer"
                  onClick={() =>
                    EnjoyApp.shell.openExternal(
                      "https://www.sunnybridge.qzz.io/apply.html"
                    )
                  }
                >
                  预约外教 · 课程咨询
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 底部固定区：系统偏好设置与折叠按钮 */}
        <div className="w-full shrink-0 border-t bg-[#FFF9EF]/95 dark:bg-slate-900/95 backdrop-blur-sm p-1.5 space-y-1">
          <Button
            size="sm"
            variant="ghost"
            data-testid="sidebar-preferences-button"
            className={`w-full h-9 rounded-xl non-draggable-region cursor-pointer ${
              isCollapsed ? "justify-center px-0" : "justify-start px-2.5"
            } ${
              displayPreferences
                ? "bg-amber-400/25 text-amber-950 dark:text-amber-100 font-black shadow-xs border border-amber-400/40"
                : "text-foreground hover:bg-amber-100/50 dark:hover:bg-slate-800 font-bold"
            }`}
            onClick={() => setDisplayPreferences(true)}
            title="[系统偏好设置] 语音与显示设置"
          >
            <SettingsIcon className="size-4.5 text-muted-foreground shrink-0" />
            {!isCollapsed && (
              <span className="ml-2.5 text-xs tracking-tight truncate flex-1 text-left">
                {t("sidebar.preferences")}
              </span>
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className={`w-full h-8 rounded-xl non-draggable-region cursor-pointer text-muted-foreground hover:text-foreground ${
              isCollapsed ? "justify-center px-0" : "justify-start px-2.5"
            }`}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "展开侧边导航" : "折叠侧边导航"}
          >
            {isCollapsed ? (
              <PanelLeftOpenIcon className="size-3.5" />
            ) : (
              <PanelLeftCloseIcon className="size-3.5" />
            )}
            {!isCollapsed && (
              <span className="ml-2 text-[11px] font-medium">
                {t("sidebar.collapse")}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const SidebarItem = (props: {
  href?: string;
  onClick?: () => void;
  label: string;
  sublabel?: string;
  tooltip: string;
  active: boolean;
  Icon: LucideIcon;
  badge?: string;
  badgeVariant?: "amber" | "purple" | "emerald" | "default";
  testid?: string;
  isCollapsed: boolean;
  isCurrentLevel?: boolean;
}) => {
  const {
    href,
    onClick,
    label,
    sublabel,
    tooltip,
    active,
    Icon,
    badge,
    badgeVariant = "default",
    testid,
    isCollapsed,
    isCurrentLevel,
  } = props;

  const content = (
    <Button
      variant="ghost"
      size={isCollapsed ? "icon" : "default"}
      data-testid={testid}
      onClick={onClick}
      className={`relative w-full rounded-lg transition-all duration-200 select-none group ${
        isCollapsed
          ? "h-10 w-10 mx-auto flex items-center justify-center p-0"
          : "h-10 justify-start px-3 py-2"
      } ${
        active
          ? "bg-amber-400/25 text-amber-950 dark:text-amber-100 font-black shadow-xs border border-amber-400/40"
          : "text-foreground hover:bg-amber-100/50 dark:hover:bg-slate-800 font-bold"
      }`}
      title={tooltip}
    >
      <div className="relative flex items-center justify-center shrink-0">
        <Icon
          className={`size-4.5 transition-transform group-hover:scale-110 ${
            active
              ? "text-amber-700 dark:text-amber-300 stroke-[2.5]"
              : "text-muted-foreground group-hover:text-foreground"
          }`}
        />
        {/* 当前级高亮指示点（四级项链） */}
        {isCurrentLevel && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 shadow-xs" />
          </span>
        )}
      </div>

      {!isCollapsed && (
        <span className="ml-2.5 text-xs tracking-tight truncate flex-1 text-left flex items-center gap-1.5">
          <span>{label}</span>
          {sublabel && (
            <span className="text-[10px] font-mono font-medium text-muted-foreground/80 bg-muted/60 px-1 py-0.2 rounded">
              {sublabel}
            </span>
          )}
        </span>
      )}

      {!isCollapsed && badge && (
        <span
          className={`ml-auto text-[10px] font-black h-4.5 px-2 py-0.5 rounded-full border ${
            badgeVariant === "amber"
              ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200"
              : badgeVariant === "purple"
              ? "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200"
              : badgeVariant === "emerald"
              ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200"
              : "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          {badge}
        </span>
      )}
    </Button>
  );

  if (href) {
    return (
      <Link to={href} className="block w-full">
        {content}
      </Link>
    );
  }

  return content;
};

const SidebarHeader = (props: { isCollapsed: boolean }) => {
  const { isCollapsed } = props;
  const { user, logout } = useContext(AppSettingsProviderContext);
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="p-1 mb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full h-11 hover:bg-amber-100/60 dark:hover:bg-slate-800 rounded-2xl border border-amber-200/40 dark:border-slate-800 ${
              isCollapsed ? "justify-center px-0" : "justify-start px-2"
            }`}
          >
            <Avatar className="size-7 shrink-0 border-2 border-amber-400 shadow-2xs">
              <AvatarImage src={user.avatarUrl} />
            </Avatar>
            {!isCollapsed && (
              <>
                <div className="ml-2 flex flex-col leading-none overflow-hidden text-left">
                  <span className="text-xs font-black line-clamp-1 truncate text-foreground">
                    {user.name ||
                      (user.isGuest
                        ? "小探险家"
                        : `微信学员_${user.id?.slice(-4) || ""}`)}
                  </span>
                  <div className="text-left mt-1">
                    {user.isGuest ? (
                      <span className="text-[9px] text-amber-800 dark:text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded-full font-bold">
                        体验探索中
                      </span>
                    ) : (
                      <span className="text-[9px] text-emerald-800 dark:text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded-full font-bold">
                        阳光正式学员
                      </span>
                    )}
                  </div>
                </div>
                <ChevronsUpDownIcon className="size-3.5 ml-auto text-muted-foreground" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] rounded-2xl"
          align="start"
          side="bottom"
        >
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => navigate("/profile")}
          >
            <span>{t("sidebar.profile")}</span>
            <UserIcon className="size-4 ml-auto" />
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              window.open("https://www.sunnybridge.qzz.io/apply.html", "_blank")
            }
            className="cursor-pointer text-amber-600 dark:text-amber-400 font-medium"
          >
            <span className="flex-1 truncate">预约外教 · 课程咨询</span>
            <SparklesIcon className="size-4 ml-auto" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={logout} className="cursor-pointer">
            <span>{t("logout")}</span>
            <LogOutIcon className="size-4 ml-auto" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const SunnyBridgeBrandHeader = (props: { isCollapsed: boolean }) => {
  const { isCollapsed } = props;
  return (
    <div
      className={`px-2.5 py-2 mb-2 rounded-[14px] bg-white dark:bg-slate-900 border border-[#F0DFC0] non-draggable-region shadow-none ${
        isCollapsed ? "flex justify-center p-1.5" : "flex items-center gap-2"
      }`}
    >
      <Link
        to="/"
        className="flex items-center gap-2 group transition-all w-full"
      >
        <img
          src="/assets/sunnybridge-logo.webp"
          alt="SunnyBridge"
          className="size-8 rounded-xl object-contain bg-white shadow-xs p-0.5 group-hover:scale-105 transition-transform shrink-0 border border-amber-300"
        />
        {!isCollapsed && (
          <div className="flex flex-col text-left leading-tight overflow-hidden">
            <span className="font-black text-xs tracking-tight text-foreground flex items-center gap-1 truncate">
              SunnyBridge
              <span className="text-[9px] px-1.5 py-0.2 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 rounded-full font-black">
                少儿英语
              </span>
            </span>
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold truncate mt-0.5 flex items-center gap-1">
              <span>🌟 快乐伴学乐园</span>
            </span>
          </div>
        )}
      </Link>
    </div>
  );
};
