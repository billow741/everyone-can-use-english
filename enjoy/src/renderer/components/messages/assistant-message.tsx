import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetClose,
  toast,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  SheetTitle,
} from "@renderer/components/ui";
import {
  SpeechPlayer,
  AudioPlayer,
  ConversationShortcuts,
  MarkdownWrapper,
} from "@renderer/components";
import { useState, useEffect, useContext } from "react";
import {
  LoaderIcon,
  CopyIcon,
  CheckIcon,
  SpeechIcon,
  MicIcon,
  ChevronDownIcon,
  ForwardIcon,
  AlertCircleIcon,
  MoreVerticalIcon,
  DownloadIcon,
  Volume2Icon,
} from "lucide-react";
import { useCopyToClipboard } from "@uidotdev/usehooks";
import { t } from "i18next";
import { AppSettingsProviderContext } from "@renderer/context";
import { useSpeech, useAiCommand } from "@renderer/hooks";
import { formatDateTime } from "@renderer/lib/utils";

export const AssistantMessageComponent = (props: {
  message: MessageType;
  configuration: { [key: string]: any };
  onRemove: () => void;
}) => {
  const { message, configuration, onRemove } = props;
  const [_, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState<boolean>(false);
  const [speech, setSpeech] = useState<Partial<SpeechType>>(
    message.speeches?.[0]
  );
  const [speeching, setSpeeching] = useState<boolean>(false);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState<boolean>(false);
  const [resourcing, setResourcing] = useState<boolean>(false);
  const [shadowing, setShadowing] = useState<boolean>(false);
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const { tts, speak, stop } = useSpeech();
  const { summarizeTopic } = useAiCommand();

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  useEffect(() => {
    const handleSpeechChange = (e: any) => {
      const { text, rawText, playing } = e.detail || {};
      if (!playing) {
        setIsPlayingSpeech(false);
        return;
      }
      if (
        (text && message.content && (message.content.includes(text.slice(0, 15)) || text.includes(message.content.slice(0, 15)))) ||
        (rawText && rawText === message.content)
      ) {
        setIsPlayingSpeech(true);
      } else {
        setIsPlayingSpeech(false);
      }
    };

    window.addEventListener("sunnybridge-speech-change", handleSpeechChange);
    return () => {
      window.removeEventListener("sunnybridge-speech-change", handleSpeechChange);
    };
  }, [message.content]);

  useEffect(() => {
    if (speech) return;
    if (configuration?.type !== "tts") return;

    findOrCreateSpeech();
  }, [message]);

  const findOrCreateSpeech = async () => {
    const msg = await EnjoyApp.messages.findOne({ id: message.id });
    if (msg && msg.speeches.length > 0) {
      setSpeech(msg.speeches[0]);
    } else {
      createSpeech();
    }
  };

  const handleSpeak = () => {
    if (isPlayingSpeech) {
      stop();
      setIsPlayingSpeech(false);
      return;
    }

    const spoken = speak(message.content, (playing) => {
      setIsPlayingSpeech(playing);
    });

    if (!spoken) {
      createSpeech();
    }
  };

  const createSpeech = () => {
    if (speeching) return;

    setSpeeching(true);

    tts({
      sourceType: "Message",
      sourceId: message.id,
      text: message.content,
      configuration: configuration.tts,
    })
      .then((speech) => {
        setSpeech(speech);
      })
      .catch((err) => {
        toast.error(err.message);
      })
      .finally(() => {
        setSpeeching(false);
      });
  };

  const startShadow = async () => {
    if (resourcing) return;

    const audio = await EnjoyApp.audios.findOne({
      md5: speech.md5,
    });

    if (!audio) {
      setResourcing(true);
      let title =
        speech.text.length > 20
          ? speech.text.substring(0, 17).trim() + "..."
          : speech.text;

      try {
        title = await summarizeTopic(speech.text);
      } catch (e) {
        console.warn(e);
      }

      await EnjoyApp.audios.create(speech.filePath, {
        name: title,
        originalText: speech.text,
      });
      setResourcing(false);
    }

    setShadowing(true);
  };

  const handleDownload = async () => {
    if (!speech) return;

    EnjoyApp.dialog
      .showSaveDialog({
        title: t("download"),
        defaultPath: speech.filename,
        filters: [
          {
            name: "Audio",
            extensions: [speech.filename.split(".").pop()],
          },
        ],
      })
      .then((savePath) => {
        if (!savePath) return;

        toast.promise(EnjoyApp.download.start(speech.src, savePath as string), {
          loading: t("downloadingFile", { file: speech.filename }),
          success: () => t("downloadedSuccessfully"),
          error: t("downloadFailed"),
          position: "bottom-right",
        });
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  return (
    <div id={`message-${message.id}`} className="ai-message">
      <div className="flex items-center space-x-2 mb-2">
        <Avatar className="w-8 h-8 border border-amber-400/40 shadow-xs avatar">
          <AvatarImage src="/assets/qiaobao_sunny240.png" alt="敢敢" />
          <AvatarFallback className="bg-amber-500/20 text-amber-700 font-bold text-xs">
            敢敢
          </AvatarFallback>
        </Avatar>
        <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
          敢敢 AI 伴学助教
        </div>
      </div>
      <div className="flex flex-col gap-2 px-4 py-2 bg-background border rounded-lg shadow-sm w-full mb-2">
        {configuration.type === "tts" &&
          (speeching ? (
            <div className="text-muted-foreground text-sm py-2">
              <span>{t("creatingSpeech")}</span>
            </div>
          ) : (
            !speech && (
              <div className="text-muted-foreground text-sm py-2 flex items-center">
                <AlertCircleIcon className="w-4 h-4 mr-2 text-yellow-600" />
                <span>{t("speechNotCreatedYet")}</span>
              </div>
            )
          ))}

        {configuration.type === "gpt" && (
          <MarkdownWrapper
            className="message-content select-text prose dark:prose-invert max-w-full"
            data-source-type="Message"
            data-source-id={message.id}
          >
            {message.content}
          </MarkdownWrapper>
        )}

        {Boolean(speech) && <SpeechPlayer speech={speech} />}

        <DropdownMenu>
          <div className="flex items-center justify-start space-x-4">
            {!speech &&
              (speeching ? (
                <LoaderIcon
                  data-tooltip-id="global-tooltip"
                  data-tooltip-content={t("creatingSpeech")}
                  className="w-4 h-4 animate-spin"
                />
              ) : isPlayingSpeech ? (
                <span
                  onClick={handleSpeak}
                  data-tooltip-id="global-tooltip"
                  data-tooltip-content="点击停止朗读"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 cursor-pointer animate-pulse font-medium select-none shadow-xs border border-amber-300 dark:border-amber-700"
                >
                  <Volume2Icon className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                  <span>敢敢正在朗读... (点击停止)</span>
                </span>
              ) : (
                <SpeechIcon
                  data-tooltip-id="global-tooltip"
                  data-tooltip-content="敢敢伴读朗读 (Text to Speech)"
                  data-testid="message-create-speech"
                  onClick={handleSpeak}
                  className="w-4 h-4 cursor-pointer hover:text-amber-600 transition-colors"
                />
              ))}

            {configuration.type === "gpt" && (
              <>
                {copied ? (
                  <CheckIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <CopyIcon
                    data-tooltip-id="global-tooltip"
                    data-tooltip-content={t("copyText")}
                    className="w-4 h-4 cursor-pointer"
                    onClick={() => {
                      copyToClipboard(message.content);
                      setCopied(true);
                      setTimeout(() => {
                        setCopied(false);
                      }, 3000);
                    }}
                  />
                )}
                <ConversationShortcuts
                  prompt={message.content}
                  excludedIds={[message.conversationId]}
                  trigger={
                    <ForwardIcon
                      data-tooltip-id="global-tooltip"
                      data-tooltip-content={t("forward")}
                      className="w-4 h-4 cursor-pointer"
                    />
                  }
                />
              </>
            )}

            {Boolean(speech) &&
              (resourcing ? (
                <LoaderIcon
                  data-tooltip-id="global-tooltip"
                  data-tooltip-content={t("addingResource")}
                  className="w-4 h-4 animate-spin"
                />
              ) : (
                <MicIcon
                  data-tooltip-id="global-tooltip"
                  data-tooltip-content={t("shadowingExercise")}
                  data-testid="message-start-shadow"
                  onClick={startShadow}
                  className="w-4 h-4 cursor-pointer"
                />
              ))}
            {Boolean(speech) && (
              <DownloadIcon
                data-tooltip-id="global-tooltip"
                data-tooltip-content={t("download")}
                data-testid="message-download-speech"
                onClick={handleDownload}
                className="w-4 h-4 cursor-pointer"
              />
            )}

            <DropdownMenuTrigger>
              <MoreVerticalIcon className="w-4 h-4" />
            </DropdownMenuTrigger>
          </div>

          <DropdownMenuContent>
            <DropdownMenuItem className="cursor-pointer" onClick={onRemove}>
              <span className="mr-auto text-destructive capitalize">
                {t("delete")}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex justify-start text-xs text-muted-foreground timestamp">
        {formatDateTime(message.createdAt)}
      </div>

      <Sheet
        modal={false}
        open={shadowing}
        onOpenChange={(value) => setShadowing(value)}
      >
        <SheetContent
          container="main-panel-content"
          aria-describedby={undefined}
          side="bottom"
          className="h-content p-0 flex flex-col gap-0"
          displayClose={false}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <SheetHeader className="flex items-center justify-center space-y-0 py-1">
            <SheetTitle className="sr-only">{t("shadow")}</SheetTitle>
            <SheetClose>
              <ChevronDownIcon />
            </SheetClose>
          </SheetHeader>

          {Boolean(speech) && shadowing && <AudioPlayer md5={speech.md5} />}
        </SheetContent>
      </Sheet>
    </div>
  );
};
