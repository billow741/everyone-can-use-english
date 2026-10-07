import { EllipsisIcon, MessageCircleIcon, SpeechIcon } from "lucide-react";
import dayjs from "@renderer/lib/dayjs";
import { useContext } from "react";
import { AppSettingsProviderContext } from "@renderer/context";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  toast,
} from "@renderer/components/ui";
import { t } from "i18next";

export const ConversationCard = (props: { conversation: ConversationType }) => {
  const { conversation } = props;
  const { EnjoyApp, learningLanguage } = useContext(AppSettingsProviderContext);

  const handleDelete = () => {
    EnjoyApp.conversations.destroy(conversation.id).then(() => {
      toast.success(t("conversationDeleted"));
    });
  };

  const handleMigrate = () => {
    EnjoyApp.conversations
      .migrate(conversation.id)
      .then(() => {
        toast.success(t("conversationMigrated"));
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  return (
    <div
      className="bg-card hover:bg-muted/50 border border-border/80 rounded-2xl w-full mb-3 px-4 py-3 cursor-pointer flex items-center shadow-xs hover:shadow-md transition-all group"
    >
      <div className="mr-3 shrink-0">
        <img
          src="/assets/qiaobao_sunny240.png"
          alt="敢敢"
          className="size-10 rounded-full object-cover border-2 border-amber-400 shadow-xs"
        />
      </div>
      <div className="flex-1 flex items-center justify-between space-x-4">
        <div>
          <div className="line-clamp-1 text-sm font-bold text-foreground group-hover:text-amber-600 transition-colors">
            {conversation.name}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span className="inline-block size-1.5 rounded-full bg-emerald-500"></span>
            <span>SunnyBridge 敢敢英文伴学</span>
            <span>·</span>
            <span>{dayjs(conversation.updatedAt || conversation.createdAt).format("MM/DD HH:mm")}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
            继续练习 💬
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <EllipsisIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  handleMigrate();
                }}
              >
                <span>{t("migrateToChat")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete();
                }}
              >
                <span className="text-destructive">{t("delete")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
