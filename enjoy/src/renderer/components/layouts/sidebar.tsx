import {
  Button,
  Dialog,
  DialogContent,
  ScrollArea,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Separator,
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
  BotIcon,
  LucideIcon,
  SpeechIcon,
  GraduationCapIcon,
  PanelLeftOpenIcon,
  PanelLeftCloseIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  SparklesIcon,
  ClapperboardIcon,
  GlobeIcon,
  CompassIcon,
} from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { t } from "i18next";
import { Preferences } from "@renderer/components";
import { AppSettingsProviderContext } from "@renderer/context";
import { useContext, useEffect, useState } from "react";
import { NoticiationsChannel } from "@renderer/cables";

interface NavigationItem {
  href?: string;
  onClick?: () => void;
  label: string;
  tooltip: string;
  Icon: LucideIcon;
  badge?: string;
  badgeVariant?: "amber" | "purple" | "emerald" | "default";
  testid?: string;
  active: boolean;
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
  const { EnjoyApp, cable, displayPreferences, setDisplayPreferences } =
    useContext(AppSettingsProviderContext);

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

  // 少儿 4 大核心领域导航定义
  const domains: NavigationDomain[] = [
    {
      id: "hub",
      title: "🎯 学习主场",
      shortCode: "HUB",
      items: [
        {
          href: "/",
          label: "学习主控台",
          tooltip: "[🎯 学习主场] 学习主控台 · 今日打卡与推荐",
          Icon: HomeIcon,
          badge: "今日",
          badgeVariant: "amber",
          active: activeTab === "/",
        },
        {
          href: "/courses",
          label: "分级体系课",
          tooltip: "[🎯 学习主场] 分级体系课 · 阶梯课程与精讲",
          Icon: GraduationCapIcon,
          active: activeTab.startsWith("/courses"),
        },
      ],
    },
    {
      id: "phonics",
      title: "🧩 拼读基石",
      shortCode: "PHONICS",
      items: [
        {
          href: "/phonemes",
          label: "39 音标工坊",
          tooltip: "[🧩 拼读基石] 39 音标工坊 · 3D舌位动效与连音特训",
          Icon: SparklesIcon,
          badge: "39音",
          badgeVariant: "amber",
          testid: "sidebar-phonemes",
          active: activeTab.startsWith("/phonemes"),
        },
        {
          href: "/pronunciation_assessments",
          label: "语音精准纠音",
          tooltip: "[🧩 拼读基石] 语音精准纠音 · 多维声学评测中心",
          Icon: SpeechIcon,
          badge: "评测",
          badgeVariant: "default",
          testid: "sidebar-pronunciation-assessments",
          active: activeTab.startsWith("/pronunciation_assessments"),
        },
      ],
    },
    {
      id: "context",
      title: "📖 沉浸语境",
      shortCode: "CONTEXT",
      items: [
        {
          href: "/stories",
          label: "牛津精选绘本",
          tooltip: "[📖 沉浸语境] 牛津精选绘本 · ORT经典分级点读精听",
          Icon: BookOpenIcon,
          badge: "ORT",
          badgeVariant: "purple",
          active: activeTab.startsWith("/stories"),
        },
        {
          href: "/theater",
          label: "敢敢情景剧场",
          tooltip: "[📖 沉浸语境] 敢敢情景剧场 · 实景短剧同台飙戏",
          Icon: ClapperboardIcon,
          badge: "短剧",
          badgeVariant: "default",
          active: activeTab.startsWith("/theater"),
        },
        {
          href: "/world",
          label: "环球文化漫游",
          tooltip: "[📖 沉浸语境] 环球文化漫游 · 79站名胜微百科与护照",
          Icon: GlobeIcon,
          badge: "79站",
          badgeVariant: "default",
          active: activeTab.startsWith("/world"),
        },
        {
          href: "/conversations",
          label: "敢敢 AI 陪练",
          tooltip: "[📖 沉浸语境] 敢敢 AI 陪练 · 双语智能外教对话",
          Icon: BotIcon,
          badge: "AI",
          badgeVariant: "emerald",
          testid: "sidebar-conversations",
          active: activeTab.startsWith("/conversations"),
        },
      ],
    },
    {
      id: "growth",
      title: "🎒 我的成长",
      shortCode: "GROWTH",
      items: [
        {
          href: "/vocabulary",
          label: "智能拼读生词",
          tooltip: "[🎒 我的成长] 智能拼读生词本 · 词族与拼读归纳",
          Icon: BookMarkedIcon,
          active: activeTab.startsWith("/vocabulary"),
        },
        {
          href: "/profile",
          label: "学情成长中心",
          tooltip: "[🎒 我的成长] 学情档案 · 通关成就与学习报告",
          Icon: UserIcon,
          active: activeTab.startsWith("/profile"),
        },
        {
          onClick: () => setDisplayPreferences(true),
          label: "系统偏好设置",
          tooltip: "[🎒 我的成长] 偏好设置 · 语音引擎与显示",
          Icon: SettingsIcon,
          active: displayPreferences,
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
        className={`fixed top-0 left-0 h-full bg-muted border-r flex flex-col ${
          isCollapsed
            ? "w-[--sidebar-collapsed-width]"
            : "w-[--sidebar-expanded-width]"
        }`}
      >
        <ScrollArea className="w-full flex-1 pb-16 pt-3 px-1.5">
          <SunnyBridgeBrandHeader isCollapsed={isCollapsed} />
          <SidebarHeader isCollapsed={isCollapsed} />

          {/* 少儿 4 大核心域导航 */}
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

                {/* 领域内子菜单项 */}
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
                      badge={item.badge}
                      badgeVariant={item.badgeVariant}
                      testid={item.testid}
                      isCollapsed={isCollapsed}
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

            {/* 敢敢专属伴学顾问卡片 */}
            {!isCollapsed && (
              <div className="mx-1 mt-4 p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-500/25 text-left non-draggable-region shadow-2xs">
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src="/assets/qiaobao_sunny240.png"
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
                  每天跟读 15 分钟，让纯正英语发音成为自然习惯！
                </p>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold rounded-xl shadow-xs cursor-pointer"
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

        {/* 底部侧边栏折叠按钮 */}
        <div className="w-full shrink-0 border-t bg-muted/90 backdrop-blur-sm p-1.5">
          <Button
            size="sm"
            variant="ghost"
            className={`w-full h-9 rounded-xl non-draggable-region cursor-pointer ${
              isCollapsed ? "justify-center px-0" : "justify-start px-2.5"
            }`}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "展开侧边导航" : "折叠侧边导航"}
          >
            {isCollapsed ? (
              <PanelLeftOpenIcon className="size-4" />
            ) : (
              <PanelLeftCloseIcon className="size-4" />
            )}
            {!isCollapsed && (
              <span className="ml-2 text-xs font-medium">
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
  tooltip: string;
  active: boolean;
  Icon: LucideIcon;
  badge?: string;
  badgeVariant?: "amber" | "purple" | "emerald" | "default";
  testid?: string;
  isCollapsed: boolean;
}) => {
  const {
    href,
    onClick,
    label,
    tooltip,
    active,
    Icon,
    badge,
    badgeVariant = "default",
    testid,
    isCollapsed,
  } = props;

  const badgeClass =
    badgeVariant === "amber"
      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/30"
      : badgeVariant === "purple"
      ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400/30"
      : badgeVariant === "emerald"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30"
      : "bg-muted text-muted-foreground border-border";

  const content = (
    <div
      className={`group relative flex items-center h-9 w-full rounded-xl transition-all cursor-pointer ${
        isCollapsed ? "justify-center px-0" : "justify-start px-2.5"
      } ${
        active
          ? "bg-amber-500/15 text-amber-900 dark:text-amber-100 font-bold border border-amber-500/30 shadow-2xs"
          : "text-muted-foreground hover:text-foreground hover:bg-background/80 font-medium"
      }`}
    >
      {/* 激活状态左侧竖条指示器 */}
      {active && !isCollapsed && (
        <span className="absolute left-1 top-2 bottom-2 w-1 bg-amber-500 rounded-full" />
      )}

      <Icon
        className={`size-4 shrink-0 transition-colors ${
          active
            ? "text-amber-600 dark:text-amber-400"
            : "text-muted-foreground group-hover:text-foreground"
        }`}
      />

      {!isCollapsed && (
        <>
          <span className="ml-2.5 text-xs truncate flex-1 text-left">
            {label}
          </span>
          {badge && (
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border shrink-0 ${badgeClass}`}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        to={href}
        data-tooltip-id="global-tooltip"
        data-tooltip-content={tooltip}
        data-tooltip-place="right"
        data-testid={testid}
        className="block non-draggable-region"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-tooltip-id="global-tooltip"
      data-tooltip-content={tooltip}
      data-tooltip-place="right"
      data-testid={testid}
      className="block w-full non-draggable-region text-left"
    >
      {content}
    </button>
  );
};

const SidebarHeader = (props: { isCollapsed: boolean }) => {
  const { isCollapsed } = props;
  const { user, logout, refreshAccount } = useContext(
    AppSettingsProviderContext
  );
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      refreshAccount?.();
    }
  }, [open]);

  if (!user) {
    return null;
  }

  return (
    <div className="py-2 px-1 sticky top-0 bg-muted z-10 non-draggable-region">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full h-11 hover:bg-background rounded-xl ${
              isCollapsed ? "justify-center px-0" : "justify-start px-2"
            }`}
          >
            <Avatar className="size-7 shrink-0">
              <AvatarImage src={user.avatarUrl} />
            </Avatar>
            {!isCollapsed && (
              <>
                <div className="ml-2 flex flex-col leading-none overflow-hidden">
                  <span className="text-left text-xs font-bold line-clamp-1 truncate">
                    {user.name ||
                      (user.isGuest
                        ? "体验学员"
                        : `微信学员_${user.id?.slice(-4) || ""}`)}
                  </span>
                  <div className="text-left mt-1">
                    {user.isGuest ? (
                      <span className="text-[9px] text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1 py-0.2 rounded font-medium">
                        游客体验中
                      </span>
                    ) : (
                      <span className="text-[9px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1 py-0.2 rounded font-medium">
                        微信正式学员
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
          className="w-[--radix-dropdown-menu-trigger-width]"
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
          {user.isGuest && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => navigate("/landing")}
                className="cursor-pointer text-emerald-600 dark:text-emerald-400 font-bold"
              >
                <span>微信一键登录 (存数据)</span>
                <SparklesIcon className="size-4 ml-auto" />
              </DropdownMenuItem>
            </>
          )}
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
      className={`px-2.5 py-2 mb-2 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-500/20 non-draggable-region ${
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
          className="size-7 rounded-lg object-contain bg-white shadow-xs p-0.5 group-hover:scale-105 transition-transform shrink-0"
        />
        {!isCollapsed && (
          <div className="flex flex-col text-left leading-tight overflow-hidden">
            <span className="font-black text-xs tracking-tight text-foreground flex items-center gap-1 truncate">
              SunnyBridge
              <span className="text-[9px] px-1 py-0.2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded font-black">
                少儿英语
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
              <span>🌟 敢敢智能伴学</span>
            </span>
          </div>
        )}
      </Link>
    </div>
  );
};
