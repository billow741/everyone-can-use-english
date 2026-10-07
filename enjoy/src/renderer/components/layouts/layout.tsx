import { Outlet } from "react-router-dom";
import {
  AppSettingsProviderContext,
  CopilotProviderContext,
} from "@renderer/context";
import { useContext, useState } from "react";
import { CopilotSession, TitleBar, Sidebar, MobileTabBar } from "@renderer/components";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@renderer/components/ui";

export const Layout = () => {
  const { initialized } = useContext(AppSettingsProviderContext);
  const { active, setActive } = useContext(CopilotProviderContext);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (initialized) {
    return (
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
            className="flex-1 h-full overflow-x-hidden overflow-y-auto w-full pb-14 md:pb-0"
          >
            <Outlet />
          </div>

          {/* Mobile Bottom Tab Bar */}
          <MobileTabBar />
        </div>
      </div>
    );
  } else {
    return (
      <div className="h-screen flex flex-col w-full">
        <div className="flex-1 h-full overflow-y-auto pb-14 md:pb-0">
          <Outlet />
        </div>
        <MobileTabBar />
      </div>
    );
  }
};
