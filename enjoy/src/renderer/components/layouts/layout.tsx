import { Outlet, useLocation } from "react-router-dom";
import {
  AppSettingsProviderContext,
  CopilotProviderContext,
  PronunciationCoachProvider,
} from "@renderer/context";
import { useContext } from "react";
import {
  MobileTabBar,
  PlatformHeader,
  GlobalPronunciationAssessmentModal,
  DesktopSidebar,
} from "@renderer/components";
import { useIsDesktop } from "@renderer/hooks";
import { OutletTransition } from "@renderer/lib/motion";

export const Layout = () => {
  const { initialized } = useContext(AppSettingsProviderContext);
  const location = useLocation();
  const isDesktop = useIsDesktop();

  const pathname = location.pathname;
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  const segments = cleanPath.split("/").filter(Boolean);

  // 4 个自带完整 DesktopSidebar 与 sb-main 的桌面专有页面组件：
  // 1. 首页 (/) -> DesktopHome
  // 2. 听故事书架 (/listening) -> DesktopBookshelf
  // 3. 听故事播放页 (/listening/:book/:chapter) -> DesktopPlayer
  // 4. 发音纠错主页 (/pronunciation_assessments) -> DesktopPronunciation
  const isSelfContainedDesktopPage =
    cleanPath === "/" ||
    cleanPath === "/listening" ||
    (cleanPath.startsWith("/listening/") && segments.length === 3) ||
    cleanPath === "/pronunciation_assessments";

  return (
    <PronunciationCoachProvider>
      {/* F5: 无障碍跳过链接 (Skip Link) */}
      <a
        href="#main-panel-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:font-bold focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        跳至主要内容
      </a>
      {isDesktop ? (
        !initialized || cleanPath === "/landing" ? (
          <div id="main-panel-content" className="h-screen w-full overflow-y-auto bg-warm-paper">
            <Outlet />
          </div>
        ) : isSelfContainedDesktopPage ? (
          <div id="main-panel-content" className="h-screen w-full overflow-y-auto bg-warm-paper">
            <OutletTransition pathname={cleanPath}>
              <Outlet />
            </OutletTransition>
          </div>
        ) : (
          <div id="main-panel-content" className="desktop-shell h-screen w-full overflow-y-auto bg-warm-paper">
            <DesktopSidebar />
            <main className="sb-main">
              <OutletTransition pathname={cleanPath}>
                <Outlet />
              </OutletTransition>
            </main>
          </div>
        )
      ) : initialized ? (
        <div className="h-screen flex flex-col w-full overflow-hidden">
          <div className="flex-1 h-full flex overflow-hidden relative">
            {/* Main Content Area */}
            <div
              id="main-panel-content"
              className="flex-1 h-full overflow-x-hidden overflow-y-auto w-full pb-14 min-[1280px]:pb-0 relative"
            >
              <PlatformHeader />
              <OutletTransition pathname={cleanPath}>
                <Outlet />
              </OutletTransition>
            </div>
          </div>

          {/* Mobile Bottom Tab Bar */}
          <MobileTabBar />
        </div>
      ) : (
        <div className="h-screen flex flex-col w-full">
          <div className="flex-1 h-full overflow-y-auto pb-14 min-[1280px]:pb-0">
            <Outlet />
          </div>
          <MobileTabBar />
        </div>
      )}

      {/* 全局随处可唤起的声音魔法纠错舱 */}
      <GlobalPronunciationAssessmentModal />
    </PronunciationCoachProvider>
  );
};
