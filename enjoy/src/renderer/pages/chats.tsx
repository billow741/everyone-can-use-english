import { ChatSession, ChatAgents, ChatList } from "@renderer/components";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  toast,
} from "@renderer/components/ui";
import { useState, useContext, useEffect } from "react";
import {
  AISettingsProviderContext,
  AppSettingsProviderContext,
  CopilotProviderContext,
} from "@renderer/context";
import { useChat, useChatAgent } from "@renderer/hooks";
import { DEFAULT_GPT_CONFIG } from "@/constants";
import { ChatAgentTypeEnum } from "@/types/enums";

export default function Chats() {
  const [currentChat, setCurrentChat] = useState<ChatType | null>(null);
  const [currentChatAgent, setCurrentChatAgent] =
    useState<ChatAgentType | null>(null);
  const { currentChat: copilotCurrentChat, setOccupiedChat } = useContext(
    CopilotProviderContext
  );
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const { sttEngine, currentGptEngine, ttsConfig } = useContext(
    AISettingsProviderContext
  );
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(false);

  const { chats } = useChat(currentChatAgent?.id);
  const { chatAgents, fetchChatAgents } = useChatAgent();

  // Do not open the same chat in copilot and main window
  const handleSelectChat = (chat: ChatType) => {
    if (chat && copilotCurrentChat?.id === chat.id) return;
    setCurrentChat(chat);
  };

  const handleStartChat = async (topic?: string) => {
    if (chats && chats.length > 0 && !topic) {
      handleSelectChat(chats[0]);
      return;
    }

    const agent = currentChatAgent || chatAgents?.[0];
    if (!agent) {
      if (chats && chats.length > 0) {
        handleSelectChat(chats[0]);
      }
      return;
    }

    const config =
      agent.type === ChatAgentTypeEnum.TTS
        ? {
            tts: {
              engine: ttsConfig?.engine,
              model: ttsConfig?.model,
              voice: ttsConfig?.voice,
              language: ttsConfig?.language,
              ...agent.config?.tts,
            },
          }
        : {
            gpt: {
              ...DEFAULT_GPT_CONFIG,
              engine: currentGptEngine?.name,
              model: currentGptEngine?.models?.default,
            },
            tts: {
              engine: ttsConfig?.engine,
              model: ttsConfig?.model,
              voice: ttsConfig?.voice,
              language: ttsConfig?.language,
            },
          };

    try {
      const newChat = await EnjoyApp.chats.create({
        name: topic || "🦁 敢敢伙伴",
        config: {
          sttEngine: sttEngine,
        },
        members: [
          {
            userId: agent.id,
            userType: "ChatAgent",
            config,
          },
        ],
      });
      if (newChat) {
        handleSelectChat(newChat);
      }
    } catch (err: any) {
      if (chats && chats.length > 0) {
        handleSelectChat(chats[0]);
      } else {
        toast.error(err?.message || "启动聊天失败");
      }
    }
  };

  // set occupied chat when current chat changes
  useEffect(() => {
    if (currentChat) {
      setOccupiedChat(currentChat);
    }

    return () => {
      setOccupiedChat(null);
    };
  }, [currentChat]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-content">
      {!sidePanelCollapsed && (
        <>
          <ResizablePanel
            order={1}
            id="chat-side-panel"
            className="bg-muted/30"
            collapsible={true}
            defaultSize={20}
            minSize={15}
            maxSize={50}
            onCollapse={() => setSidePanelCollapsed(true)}
          >
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={50} minSize={30}>
                <ChatAgents
                  chatAgents={chatAgents}
                  fetchChatAgents={fetchChatAgents}
                  currentChatAgent={currentChatAgent}
                  setCurrentChatAgent={setCurrentChatAgent}
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel minSize={30}>
                <ChatList
                  chats={chats}
                  chatAgent={currentChatAgent}
                  currentChat={currentChat}
                  setCurrentChat={handleSelectChat}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle />
        </>
      )}
      <ResizablePanel id="chat-session-panel" order={2} minSize={50}>
        <ChatSession
          chatId={currentChat?.id}
          sidePanelCollapsed={sidePanelCollapsed}
          toggleSidePanel={() => setSidePanelCollapsed(!sidePanelCollapsed)}
          onStartChat={handleStartChat}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
