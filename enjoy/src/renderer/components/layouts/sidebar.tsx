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
} from "@renderer/components/ui";
import {
  SettingsIcon,
  HomeIcon,
  BookOpenIcon,
  HeadphonesIcon,
  VideoIcon,
  NewspaperIcon,
  BookMarkedIcon,
  UserIcon,
  BotIcon,
  UsersRoundIcon,
  LucideIcon,
  NotebookPenIcon,
  SpeechIcon,
  GraduationCapIcon,
  MessagesSquareIcon,
  PanelLeftOpenIcon,
  PanelLeftCloseIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  CreditCardIcon,
  SparklesIcon,
} from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { t } from "i18next";
import { Preferences } from "@renderer/components";
import { AppSettingsProviderContext } from "@renderer/context";
import { useContext, useEffect } from "react";
import { NoticiationsChannel } from "@renderer/cables";
import { useState } from "react";

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
        className={`fixed top-0 left-0 h-full bg-muted border-r ${
          isCollapsed
            ? "w-[--sidebar-collapsed-width]"
            : "w-[--sidebar-expanded-width]"
        }`}
      >
        <ScrollArea className="w-full h-full pb-12 pt-3">
          <SunnyBridgeBrandHeader isCollapsed={isCollapsed} />
          <SidebarHeader isCollapsed={isCollapsed} />
          <div className="grid gap-2 mb-4">
            <SidebarItem
              href="/"
              label={t("sidebar.home")}
              tooltip={t("sidebar.home")}
              active={activeTab === "/"}
              Icon={HomeIcon}
              isCollapsed={isCollapsed}
            />

            <SidebarItem
              href="/conversations"
              label="敢敢 AI 陪练"
              tooltip="敢敢 AI 陪练"
              active={activeTab.startsWith("/conversations")}
              Icon={BotIcon}
              testid="sidebar-conversations"
              isCollapsed={isCollapsed}
            />

            <SidebarItem
              href="/pronunciation_assessments"
              label="语音精准纠音"
              tooltip="语音精准纠音"
              active={activeTab.startsWith("/pronunciation_assessments")}
              Icon={SpeechIcon}
              testid="sidebar-pronunciation-assessments"
              isCollapsed={isCollapsed}
            />

            <SidebarItem
              href="/stories"
              label="牛津精选绘本"
              tooltip="牛津精选绘本"
              active={activeTab.startsWith("/stories")}
              Icon={BookOpenIcon}
              isCollapsed={isCollapsed}
            />

            <SidebarItem
              href="/courses"
              label={t("sidebar.courses")}
              tooltip={t("sidebar.courses")}
              active={activeTab.startsWith("/courses")}
              Icon={GraduationCapIcon}
              isCollapsed={isCollapsed}
            />

            <SidebarItem
              href="/vocabulary"
              label={t("sidebar.vocabulary")}
              tooltip={t("sidebar.vocabulary")}
              active={activeTab.startsWith("/vocabulary")}
              Icon={BookMarkedIcon}
              isCollapsed={isCollapsed}
            />

            <Separator />

            <div className="px-1 non-draggable-region">
              <Button
                size="sm"
                variant={displayPreferences ? "default" : "ghost"}
                id="preferences-button"
                className={`w-full ${
                  isCollapsed ? "justify-center" : "justify-start"
                }`}
                data-tooltip-id="global-tooltip"
                data-tooltip-content={t("sidebar.preferences")}
                data-tooltip-place="right"
                onClick={() => setDisplayPreferences(true)}
              >
                <SettingsIcon className="size-4" />
                {!isCollapsed && (
                  <span className="ml-2"> {t("sidebar.preferences")} </span>
                )}
              </Button>
            </div>

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

            {!isCollapsed && (
              <div className="mx-2 mt-4 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/40 text-left non-draggable-region">
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src="/assets/qiaobao_sunny240.png"
                    alt="敢敢"
                    className="size-8 rounded-full object-cover border border-amber-300 shadow-xs"
                  />
                  <div>
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      敢敢专属伴学
                    </div>
                    <div className="text-[10px] text-amber-700/80 dark:text-amber-400">
                      SunnyBridge 课后巩固
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
                  每天跟读 15 分钟，让纯正英语发音成为自然习惯！
                </p>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow-xs"
                  onClick={() => EnjoyApp.shell.openExternal("https://www.sunnybridge.qzz.io/apply.html")}
                >
                  预约外教 · 课程咨询
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="w-full absolute bottom-0 pt-4 pb-2 px-1">
          <Button
            size="sm"
            variant="ghost"
            className={`w-full non-draggable-region ${
              isCollapsed ? "justify-center" : "justify-start"
            }`}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <PanelLeftOpenIcon className="size-4" />
            ) : (
              <PanelLeftCloseIcon className="size-4" />
            )}
            {!isCollapsed && (
              <span className="ml-2"> {t("sidebar.collapse")} </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const SidebarItem = (props: {
  href: string;
  label: string;
  tooltip: string;
  active: boolean;
  Icon: LucideIcon;
  testid?: string;
  isCollapsed: boolean;
}) => {
  const { href, label, tooltip, active, Icon, testid, isCollapsed } = props;

  return (
    <Link
      to={href}
      data-tooltip-id="global-tooltip"
      data-tooltip-content={tooltip}
      data-tooltip-place="right"
      data-testid={testid}
      className="block px-1 non-draggable-region"
    >
      <Button
        size="sm"
        variant={active ? "default" : "ghost"}
        className={`w-full ${isCollapsed ? "justify-center" : "justify-start"}`}
      >
        <Icon className="size-4" />
        {!isCollapsed && <span className="ml-2">{label}</span>}
      </Button>
    </Link>
  );
};

const SidebarHeader = (props: { isCollapsed: boolean }) => {
  const { isCollapsed } = props;
  const { user, logout, refreshAccount, setDisplayDepositDialog } = useContext(
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
    <div className="py-3 px-1 sticky top-0 bg-muted z-10 non-draggable-region">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full h-12 hover:bg-background ${
              isCollapsed ? "justify-center px-1" : "justify-start"
            }`}
          >
            <Avatar className="size-8">
              <AvatarImage src={user.avatarUrl} />
            </Avatar>
            {!isCollapsed && (
              <>
                <div className="ml-2 flex flex-col leading-none">
                  <span className="text-left text-sm font-medium line-clamp-1">
                    {user.name || (user.isGuest ? "体验学员" : `微信学员_${user.id?.slice(-4) || ""}`)}
                  </span>
                  <div className="text-left mt-1">
                    {user.isGuest ? (
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded font-medium">
                        游客体验中
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded font-medium">
                        微信正式学员
                      </span>
                    )}
                  </div>
                </div>
                <ChevronsUpDownIcon className="size-4 ml-auto" />
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
            onSelect={() => window.open("https://www.sunnybridge.qzz.io/apply.html", "_blank")}
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
      className={`px-3 py-2.5 mb-2 mx-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-500/20 non-draggable-region ${
        isCollapsed ? "flex justify-center p-2" : "flex items-center gap-2.5"
      }`}
    >
      <Link to="/" className="flex items-center gap-2 group transition-all w-full">
        <img
          src="/assets/sunnybridge-logo.webp"
          alt="SunnyBridge"
          className="size-8 rounded-lg object-contain bg-white shadow-sm p-0.5 group-hover:scale-105 transition-transform shrink-0"
        />
        {!isCollapsed && (
          <div className="flex flex-col text-left leading-tight overflow-hidden">
            <span className="font-bold text-xs tracking-tight text-foreground flex items-center gap-1 truncate">
              SunnyBridge
              <span className="text-[9px] px-1 py-0.2 bg-amber-500 text-white rounded font-medium">
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
