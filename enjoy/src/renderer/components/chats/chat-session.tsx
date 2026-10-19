import { ScrollArea } from "@renderer/components/ui";
import { t } from "i18next";
import { ChatSessionProvider } from "@renderer/context";
import { ChatHeader, ChatInput, ChatMessages } from "@renderer/components";
import { Mic, PanelLeftOpen } from "lucide-react";

export const ChatSession = (props: {
  chatId: string;
  sidePanelCollapsed: boolean;
  toggleSidePanel: () => void;
  onStartChat?: (topic?: string) => void;
}) => {
  const { chatId, sidePanelCollapsed, toggleSidePanel, onStartChat } = props;

  if (!chatId) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[500px] h-full p-6 bg-gradient-to-b from-amber-50/60 via-sky-50/40 to-white dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 overflow-y-auto">
        {sidePanelCollapsed && (
          <button
            onClick={toggleSidePanel}
            className="absolute top-4 left-4 p-2 rounded-xl bg-white/90 dark:bg-stone-800/90 border border-amber-200/60 text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition"
          >
            <PanelLeftOpen className="w-4 h-4 text-amber-500" />
            <span className="font-medium">聊天列表</span>
          </button>
        )}

        {/* Child Companion Welcome Banner */}
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-6 my-auto py-8 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Animated Friendly Gangan Avatar */}
          <div className="relative group cursor-pointer" onClick={() => onStartChat?.()}>
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 rounded-full blur-md opacity-40 group-hover:opacity-75 transition duration-500 animate-pulse" />
            <img
              src="/assets/qiaobao_sunny240.png"
              alt="敢敢"
              className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-stone-800 shadow-xl object-cover hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-2 rounded-full shadow-md text-lg">
              🦁
            </div>
          </div>

          {/* Warm Child Heading */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              嗨！我是敢敢 🦁
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground font-medium px-4">
              今天想跟我聊什么？点下面的小卡片，或者直接跟我说话吧！
            </p>
          </div>

          {/* 3 Quick-Start Companion Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
            <button
              onClick={() => onStartChat?.("🦁 陪我玩动物猜谜")}
              className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border-2 border-amber-200/80 dark:border-amber-800/40 shadow-sm hover:shadow-md hover:border-amber-400 hover:-translate-y-0.5 active:scale-95 transition-all flex flex-col items-start gap-1.5 text-left group cursor-pointer"
            >
              <div className="text-2xl p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 group-hover:scale-110 transition-transform">
                🦒
              </div>
              <div>
                <div className="font-bold text-foreground text-xs sm:text-sm">玩动物猜谜</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Who am I? 猜动物</div>
              </div>
            </button>

            <button
              onClick={() => onStartChat?.("🎵 唱一首英文儿歌")}
              className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border-2 border-sky-200/80 dark:border-sky-800/40 shadow-sm hover:shadow-md hover:border-sky-400 hover:-translate-y-0.5 active:scale-95 transition-all flex flex-col items-start gap-1.5 text-left group cursor-pointer"
            >
              <div className="text-2xl p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 group-hover:scale-110 transition-transform">
                🎵
              </div>
              <div>
                <div className="font-bold text-foreground text-xs sm:text-sm">唱英文儿歌</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Let's Sing!</div>
              </div>
            </button>

            <button
              onClick={() => onStartChat?.("🗣️ 敢敢听我读单词")}
              className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border-2 border-emerald-200/80 dark:border-emerald-800/40 shadow-sm hover:shadow-md hover:border-emerald-400 hover:-translate-y-0.5 active:scale-95 transition-all flex flex-col items-start gap-1.5 text-left group cursor-pointer"
            >
              <div className="text-2xl p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 group-hover:scale-110 transition-transform">
                🗣️
              </div>
              <div>
                <div className="font-bold text-foreground text-xs sm:text-sm">听我读单词</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Read With Me!</div>
              </div>
            </button>
          </div>

          {/* Big Green Microphone Start Button (>= 48px target) */}
          <div className="pt-2 w-full flex flex-col items-center gap-2">
            <button
              onClick={() => onStartChat?.()}
              className="w-full sm:w-auto px-8 py-3.5 min-h-[50px] rounded-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-base sm:text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Mic className="w-5 h-5 animate-bounce" />
              <span>🎙️ 开始跟敢敢说话</span>
            </button>
            <p className="text-xs text-muted-foreground">
              随时可以说英语或中文，敢敢都会认真听哦
            </p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-content relative">
      <ChatSessionProvider chatId={chatId}>
        <ChatHeader
          sidePanelCollapsed={sidePanelCollapsed}
          toggleSidePanel={toggleSidePanel}
        />
        <div className="w-full max-w-screen-md mx-auto">
          <ChatMessages />
          <div className="h-96" />
          <div className="absolute w-full max-w-screen-md bottom-0 min-h-16 pb-3 flex items-center">
            <ChatInput />
          </div>
        </div>
      </ChatSessionProvider>
    </ScrollArea>
  );
};

