import { Button, ScrollArea, Separator } from "@renderer/components/ui";
import {
  About,
  ThemeSettings,
  LanguageSettings,
  VocabularySettings,
} from "@renderer/components";
import { useState } from "react";
import { Tooltip } from "react-tooltip";

export const Preferences = () => {
  const TABS = [
    {
      value: "basic",
      label: "常规与外观",
      component: () => (
        <div className="pr-1 space-y-2">
          <div className="font-bold text-base mb-4 text-foreground">常规与界面外观</div>
          <LanguageSettings />
          <Separator />
          <div className="py-2">
            <ThemeSettings />
          </div>
        </div>
      ),
    },
    {
      value: "vocabulary",
      label: "生词本偏好",
      component: () => (
        <div className="pr-1 space-y-2">
          <div className="font-bold text-base mb-4 text-foreground">生词本与复习设置</div>
          <VocabularySettings />
        </div>
      ),
    },
    {
      value: "about",
      label: "关于 SunnyBridge",
      component: () => (
        <div className="pr-1">
          <div className="font-bold text-base mb-4 text-foreground">关于 SunnyBridge 阳光桥少儿英语</div>
          <About />
        </div>
      ),
    },
  ];

  const [activeTab, setActiveTab] = useState<string>("basic");

  return (
    <>
      <div className="grid grid-cols-5 overflow-hidden h-full">
        <ScrollArea className="h-full col-span-1 bg-muted/50 p-4 border-r border-border/50">
          <div className="py-2 text-xs font-bold text-muted-foreground mb-3 px-2 tracking-wider uppercase">
            系统偏好设置
          </div>

          {TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={activeTab === tab.value ? "default" : "ghost"}
              size="sm"
              className={`w-full justify-start mb-1.5 text-xs font-medium rounded-xl transition-all ${
                activeTab === tab.value ? "bg-amber-500 hover:bg-amber-600 text-white font-bold" : "hover:bg-muted"
              }`}
              onClick={() => setActiveTab(tab.value)}
            >
              <span>{tab.label}</span>
            </Button>
          ))}
        </ScrollArea>
        <ScrollArea className="h-full col-span-4 py-6 px-8 md:px-10">
          {TABS.find((tab) => tab.value === activeTab)?.component()}
        </ScrollArea>
      </div>
      <Tooltip id="preferences-tooltip" />
    </>
  );
};
