import { useState, useEffect, useReducer, useContext, useRef } from "react";
import {
  Button,
  ScrollArea,
  Textarea,
  toast,
} from "@renderer/components/ui";
import { MessageComponent } from "@renderer/components";
import { SendIcon, BotIcon, LoaderIcon, ChevronLeftIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { t } from "i18next";
import {
  DbProviderContext,
  AppSettingsProviderContext,
  MediaShadowProvider,
} from "@renderer/context";
import { messagesReducer } from "@renderer/reducers";
import { v4 as uuidv4 } from "uuid";
import autosize from "autosize";
import { useConversation, useSpeech } from "@renderer/hooks";

export default () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [conversation, setConversation] = useState<ConversationType>();
  const { addDblistener, removeDbListener } = useContext(DbProviderContext);
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const [content, setContent] = useState<string>(
    searchParams.get("text") || ""
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [messages, dispatchMessages] = useReducer(messagesReducer, []);
  const [offset, setOffest] = useState(0);
  const [loading, setLoading] = useState<boolean>(false);
  const { chat } = useConversation();
  const { speak, stop } = useSpeech();
  const [autoTts, setAutoTts] = useState<boolean>(() => {
    return localStorage.getItem("sunnybridge_auto_tts") !== "false";
  });

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchConversation = async () => {
    const _conversation = await EnjoyApp.conversations.findOne({ id });
    setConversation(_conversation);
  };

  const fetchMessages = async () => {
    if (offset === -1) return;

    const limit = 10;
    setLoading(true);
    EnjoyApp.messages
      .findAll({
        where: {
          conversationId: conversation.id,
        },
        offset,
        limit,
      })
      .then((_messages) => {
        if (_messages.length === 0) {
          setOffest(-1);
          return;
        }

        if (_messages.length < limit) {
          setOffest(-1);
        } else {
          setOffest(offset + _messages.length);
        }

        if (offset === 0) {
          dispatchMessages({ type: "set", records: _messages });
        } else {
          dispatchMessages({ type: "append", records: _messages });
        }
        scrollToMessage(_messages[0]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleSubmit = async (text?: string, file?: string) => {
    if (submitting) {
      toast.warning(t("anotherRequestIsPending"));
    }
    text = text ? text : content;

    const message: MessageType = {
      id: uuidv4(),
      content: text,
      role: "user" as MessageRoleEnum,
      conversationId: id,
      status: "pending",
    };

    if (file) {
      message.speeches = [
        {
          id: uuidv4(),
          filePath: file,
          sourceId: message.id,
          sourceType: "Message",
        },
      ];
    }

    dispatchMessages({ type: "create", record: message });
    setSubmitting(true);

    scrollToMessage(message);

    const timeout = setTimeout(() => {
      message.status = "error";
      dispatchMessages({ type: "update", record: message });
      setSubmitting(false);
    }, 1000 * 60 * 5);

    chat(message, { conversation })
      .then((replies) => {
        if (autoTts && replies && replies.length > 0) {
          const latestReply = replies[replies.length - 1];
          if (latestReply?.content) {
            speak(latestReply.content);
          }
        }
      })
      .catch((err) => {
        message.status = "error";
        dispatchMessages({ type: "update", record: message });
        toast.error(err.message);
      })
      .finally(() => {
        setSubmitting(false);
        clearTimeout(timeout);
      });
    setContent("");
  };

  const onMessagesUpdate = (event: CustomEvent) => {
    const { model, action, record } = event.detail || {};
    if (model != "Message") return;
    if (record.conversationId !== id) return;

    if (action === "create") {
      if (record.role === "user") {
        dispatchMessages({ type: "update", record });
      } else {
        dispatchMessages({ type: "create", record });
      }

      scrollToMessage(record);
    } else if (action === "destroy") {
      dispatchMessages({ type: "destroy", record });
    }
  };

  const scrollToMessage = (message: MessageType) => {
    if (!message) return;

    setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      container
        .querySelector(`#message-${message.id} .avatar`)
        ?.scrollIntoView({
          behavior: "smooth",
        });

      inputRef.current.focus();
    }, 500);
  };

  const resizeTextarea = () => {
    if (!inputRef?.current) return;

    inputRef.current.style.height = "auto";
    inputRef.current.style.height = inputRef.current.scrollHeight + "px";
  };

  useEffect(() => {
    resizeTextarea();
  }, [content]);

  useEffect(() => {
    setOffest(0);
    setContent(searchParams.get("text") || "");
    dispatchMessages({ type: "set", records: [] });
    fetchConversation();
    addDblistener(onMessagesUpdate);

    return () => {
      removeDbListener(onMessagesUpdate);
    };
  }, [id]);

  useEffect(() => {
    if (!conversation) return;

    fetchMessages();
  }, [conversation]);

  useEffect(() => {
    if (!inputRef.current) return;

    autosize(inputRef.current);

    inputRef.current.addEventListener("keypress", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitRef.current?.click();
      }
    });

    inputRef.current.focus();

    return () => {
      inputRef.current?.removeEventListener("keypress", () => {});
      autosize.destroy(inputRef.current);
    };
  }, [id, inputRef.current]);

  if (!conversation) {
    return (
      <div className="w-full p-16 flex items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div
      data-testid="conversation-page"
      className="h-full px-2 sm:px-4 py-2 sm:py-4 lg:px-8 flex flex-col"
    >
      <div className="h-[calc(100dvh-6rem)] md:h-[calc(100vh-5rem)] relative w-full max-w-screen-md mx-auto flex flex-col">
        <div className="flex items-center justify-between py-2 sm:py-3 border-b border-border/40 relative gap-2">
          <Link
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-amber-600 transition-colors shrink-0"
            to="/conversations"
          >
            <ChevronLeftIcon className="size-4" />
            <span className="hidden sm:inline">返回话题广场</span>
            <span className="sm:hidden">返回</span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <img
              src="/assets/qiaobao_sunny240.png"
              alt="敢敢"
              className="size-6 sm:size-7 rounded-full object-cover border border-amber-400 shadow-xs shrink-0"
            />
            <span className="font-bold text-xs sm:text-sm text-foreground truncate max-w-[150px] sm:max-w-none">
              {conversation.name}
            </span>
          </div>

          <div className="flex items-center shrink-0">
            <button
              onClick={() => {
                const next = !autoTts;
                setAutoTts(next);
                localStorage.setItem("sunnybridge_auto_tts", String(next));
                if (!next) {
                  stop();
                  toast.success("敢敢语音朗读已静音 🔇");
                } else {
                  toast.success("敢敢语音朗读已开启 🔊");
                }
              }}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all shadow-2xs border ${
                autoTts
                  ? "bg-amber-100/90 text-amber-800 hover:bg-amber-200 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 border-border/50"
              }`}
              title={autoTts ? "点击静音" : "点击开启语音"}
            >
              {autoTts ? (
                <>
                  <Volume2Icon className="size-3.5 text-amber-600 animate-pulse" />
                  <span className="hidden sm:inline">语音朗读 </span>
                  <span>开启</span>
                </>
              ) : (
                <>
                  <VolumeXIcon className="size-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">语音朗读 </span>
                  <span>静音</span>
                </>
              )}
            </button>
          </div>
        </div>

        <MediaShadowProvider>
          <ScrollArea ref={containerRef} className="px-2 sm:px-4 flex-1">
            <div className="messages flex flex-col-reverse gap-4 sm:gap-6 my-4 sm:my-6 pb-20">
              <div className="w-full h-16 sm:h-24"></div>
              {messages.length === 0 && (
                <div className="text-center py-10 px-4">
                  <img
                    src="/assets/qiaobao_sunny240.png"
                    alt="敢敢"
                    className="size-14 sm:size-16 rounded-full object-cover border-2 border-amber-400 mx-auto shadow-md mb-3"
                  />
                  <h3 className="text-sm font-bold text-foreground mb-1">
                    敢敢已准备好和你对话啦！🦁
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-3">
                    在下方输入框打字，敢敢会用温和地道的英语回答你哦~
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <span>💡 试试说：Hello Gangan! Nice to meet you!</span>
                  </div>
                </div>
              )}
              {messages.map((message) => (
                <MessageComponent
                  key={message.id}
                  message={message}
                  configuration={{
                    type: conversation.type,
                    ...conversation.configuration,
                  }}
                  onResend={() => {
                    if (message.status === "error") {
                      dispatchMessages({ type: "destroy", record: message });
                    }

                    handleSubmit(message.content);
                  }}
                  onRemove={() => {
                    if (message.status === "error") {
                      dispatchMessages({ type: "destroy", record: message });
                    } else {
                      EnjoyApp.messages.destroy(message.id).catch((err) => {
                        toast.error(err.message);
                      });
                    }
                  }}
                />
              ))}
              {offset > -1 && (
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => fetchMessages()}
                    disabled={loading || offset === -1}
                    className="px-4 py-2"
                  >
                    {t("loadMore")}
                    {loading && (
                      <LoaderIcon className="h-4 w-4 animate-spin ml-2" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </MediaShadowProvider>

        <div className="bg-background/95 backdrop-blur-xs px-2 sm:px-4 py-2 absolute w-full bottom-0 left-0 z-30">
          <div className="focus-within:bg-background pr-2 sm:pr-4 py-1 sm:py-2 flex items-end space-x-2 sm:space-x-4 rounded-xl shadow-md border scrollbar bg-muted/20">
            <Textarea
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="和敢敢用英语聊聊吧 (输入英语或中文)..."
              data-testid="conversation-page-input"
              className="text-sm sm:text-base px-3 sm:px-4 py-1.5 shadow-none focus-visible:outline-0 focus-visible:ring-0 border-none min-h-[2.5rem] max-h-[40vh] scrollbar-thin !overflow-x-hidden resize-none"
            />
            <div className="h-10 sm:h-12 py-0.5 sm:py-1 shrink-0">
              <Button
                type="submit"
                ref={submitRef}
                disabled={submitting || !content.trim()}
                data-testid="conversation-page-submit"
                onClick={() => handleSubmit(content)}
                size="sm"
                className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-xs"
              >
                <SendIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                <span className="text-xs sm:text-sm">发送</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
