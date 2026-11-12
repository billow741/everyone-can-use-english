import { Outlet } from "react-router-dom";
import {
  AppSettingsProviderContext,
  CopilotProviderContext,
  PronunciationCoachProvider,
} from "@renderer/context";
import { useContext, useState } from "react";
import {
  Sidebar,
  MobileTabBar,
  PlatformHeader,
  GlobalPronunciationAssessmentModal,
} from "@renderer/components";

export const Layout = () => {
  const { initialized } = useContext(AppSettingsProviderContext);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <PronunciationCoachProvider>
      {/* F5: 无障碍跳过链接 (Skip Link) */}
      <a
        href="#main-panel-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:font-bold focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        跳至主要内容
      </a>
      {initialized ? (
        <div className="h-screen flex flex-col w-full overflow-hidden">
          <div className="flex-1 h-full flex overflow-hidden relative">
            {/* Desktop Sidebar */}
            <div className="hidden md:block shrink-0">
              <Sidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
              />
            </div>

            {/* Main Content Area */}
            <div
              id="main-panel-content"
              className="flex-1 h-full overflow-x-hidden overflow-y-auto w-full pb-14 md:pb-0 relative"
            >
              <PlatformHeader />
              <Outlet />
            </div>

            {/* Mobile Bottom Tab Bar */}
            <MobileTabBar />
          </div>
        </div>
      ) : (
        <div className="h-screen flex flex-col w-full">
          <div className="flex-1 h-full overflow-y-auto pb-14 md:pb-0">
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
