import React, { useState, useContext, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
  toast,
} from "@renderer/components/ui";
import { AppSettingsProviderContext } from "@renderer/context";
import {
  getPhonemeMasteryMap,
  ALL_39_PHONEMES,
} from "@renderer/lib/phoneme-data";
import {
  SparklesIcon,
  StarIcon,
  FlameIcon,
  AwardIcon,
  CopyIcon,
  CheckIcon,
  Share2Icon,
  CalendarIcon,
  CameraIcon,
  QuoteIcon,
} from "lucide-react";
import dayjs from "dayjs";

export const DailyReportDialog = (props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { open, onOpenChange } = props;
  const { user } = useContext(AppSettingsProviderContext);
  const [copied, setCopied] = useState(false);

  const studentName =
    user?.name || (user?.isGuest ? "小探险家" : `微信学员_${user?.id?.slice(-4) || ""}`);

  const masteryMap = getPhonemeMasteryMap();
  const masteredCount = useMemo(() => {
    return ALL_39_PHONEMES.filter((p) => !!masteryMap[p.slug]).length;
  }, [masteryMap]);

  const todayStr = dayjs().format("YYYY年MM月DD日");
  const weekdayStr = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][dayjs().day()];

  const reportText = `🎉【阳光桥少儿英语 · 今日学情战报】
👦 小勇士：${studentName}
📅 日期：${todayStr} ${weekdayStr}
🔥 连续打卡：3 天
⭐ 累计能量星：120 颗
🧩 39 音标掌握：${masteredCount} / 39
🗣️ 今日魔法金句："The sun is shining and the birds are singing."
🏆 AI 发音评分：98分 · 🌟 卓越小明星
🦁 敢敢外教评语：发音饱满自然，爆破音清脆利落，口型非常标准！
✨ 每天 8 分钟英语沉浸，自信开口说地道英语！`;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    toast.success("战报文案已复制到剪贴板，可直接发送到微信群或朋友圈！");
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePromptScreenshot = () => {
    toast.info("💡 提示：使用快捷键 Win + Shift + S 即可框选本战报卡片，快速发朋友圈！", {
      duration: 5000,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-[20px] bg-white dark:bg-slate-900 border border-[#2C4A63]/30 shadow-2xl">
        {/* 卡片顶部标题栏：家长信任锚深蓝 #2C4A63 */}
        <div className="relative bg-[#2C4A63] p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-xs font-medium text-white border border-white/20">
              <SparklesIcon className="size-3.5 fill-white" />
              <span>今日高光学情战报</span>
            </span>
            <div className="flex items-center gap-1 text-[11px] font-medium text-white/80">
              <CalendarIcon className="size-3.5" />
              <span>{todayStr}</span>
            </div>
          </div>

          <div className="mt-3.5 flex items-center gap-3">
            <img
              src="/assets/qiaobao_sunny240.png"
              alt="学员头像"
              className="size-12 rounded-full object-cover border-2 border-white/80 bg-white p-0.5 shadow-sm"
            />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>{studentName}</span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-white/20 text-white">
                  小勇士
                </span>
              </h2>
              <p className="text-xs text-white/80 font-normal mt-0.5">
                今日 8 分钟探险已达成 · 斩获卓越小明星
              </p>
            </div>
          </div>
        </div>

        {/* 战报主体数据 */}
        <div className="p-5 space-y-4 text-foreground">
          {/* 核心三项成长指标：加密一档，表头用信任锚深蓝 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-[#2C4A63]/5 border border-[#2C4A63]/20 text-center space-y-0.5">
              <div className="flex items-center justify-center gap-1 text-[#F5820B]">
                <FlameIcon className="size-3.5 fill-current" />
                <span className="text-base font-bold font-mono">3</span>
                <span className="text-xs font-normal">天</span>
              </div>
              <div className="text-[10px] font-bold text-[#2C4A63]">连续打卡</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#2C4A63]/5 border border-[#2C4A63]/20 text-center space-y-0.5">
              <div className="flex items-center justify-center gap-1 text-[#E8930C]">
                <StarIcon className="size-3.5 fill-current" />
                <span className="text-base font-bold font-mono">120</span>
              </div>
              <div className="text-[10px] font-bold text-[#2C4A63]">探险能量星</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#2C4A63]/5 border border-[#2C4A63]/20 text-center space-y-0.5">
              <div className="flex items-center justify-center gap-1 text-[#7C6BD9]">
                <AwardIcon className="size-3.5" />
                <span className="text-base font-bold font-mono">{masteredCount}</span>
                <span className="text-xs font-normal text-[#8A7A68]">/39</span>
              </div>
              <div className="text-[10px] font-bold text-[#2C4A63]">音标掌握</div>
            </div>
          </div>

          {/* 今日练习高光记录 */}
          <div className="p-3.5 rounded-lg bg-[#FFF9EF] border border-[#F0DFC0] space-y-2">
            <div className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" />
                <span>今日金句跟读与声学评测</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                98分 卓越
              </span>
            </div>
            <p className="text-xs font-serif text-sm text-[#2E211A] italic pl-3.5 border-l-2 border-[#F5820B]">
              “The sun is shining and the birds are singing.”
            </p>
          </div>

          {/* 敢敢外教落款：仅圆形头像 */}
          <div className="p-3 rounded-lg bg-white border border-[#F0DFC0] flex items-start gap-3">
            <img
              src="/assets/qiaobao_sunny240.png"
              alt="敢敢"
              className="size-8 rounded-full object-cover border border-[#F0DFC0] shrink-0"
            />
            <div className="space-y-0.5 text-xs">
              <div className="font-bold text-[#2C4A63]">
                敢敢外教今日寄语：
              </div>
              <p className="text-[#8A7A68] leading-relaxed">
                发音饱满自然，爆破音清脆利落，口型非常标准！坚持每天 8 分钟，自信开口说地道英语！
              </p>
            </div>
          </div>

          {/* 底部功能按钮 */}
          <div className="pt-2 flex items-center gap-3">
            <Button
              onClick={handleCopy}
              className="flex-1 h-10 rounded-lg bg-[#F5820B] hover:bg-[#e07507] text-white font-bold text-xs gap-1.5 shadow-none border-none cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckIcon className="size-4 text-white" />
                  <span>已复制战报！</span>
                </>
              ) : (
                <>
                  <CopyIcon className="size-4" />
                  <span>复制文字 (发微信群/朋友圈)</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handlePromptScreenshot}
              className="h-10 px-3.5 rounded-lg border border-[#F0DFC0] bg-white hover:bg-[#FFF9EF] text-xs font-medium text-[#2E211A] gap-1.5 cursor-pointer shrink-0 shadow-none"
              title="提示截屏发图"
            >
              <CameraIcon className="size-4 text-muted-foreground" />
              <span>截屏打卡</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
