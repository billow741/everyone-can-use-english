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
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-3xl bg-[#FFFDF7] dark:bg-slate-900 border-2 border-amber-300 shadow-2xl">
        {/* 卡片顶部装饰性头图 */}
        <div className="relative bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 p-6 text-slate-950">
          <div className="absolute top-2 right-2 text-7xl opacity-15 pointer-events-none select-none">
            🦁
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/40 backdrop-blur-md text-xs font-black text-slate-950 border border-white/50">
              <SparklesIcon className="size-3.5 fill-slate-950" />
              <span>今日高光学情战报</span>
            </span>
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900/80">
              <CalendarIcon className="size-3.5" />
              <span>{todayStr}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3.5">
            <img
              src="/assets/qiaobao_sunny240.png"
              alt="学员头像"
              className="size-14 rounded-2xl object-cover border-2 border-white shadow-md bg-white p-0.5"
            />
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 flex items-center gap-2">
                <span>{studentName}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-950 text-amber-300">
                  小勇士
                </span>
              </h2>
              <p className="text-xs font-bold text-slate-900/90 mt-0.5">
                今日 8 分钟探险已达成 · 斩获卓越小明星 🌟
              </p>
            </div>
          </div>
        </div>

        {/* 战报主体数据 */}
        <div className="p-5 space-y-4 text-foreground">
          {/* 核心三项成长指标 */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-300/40 text-center space-y-0.5">
              <div className="flex items-center justify-center gap-1 text-orange-600 dark:text-orange-400">
                <FlameIcon className="size-4 fill-current" />
                <span className="text-lg font-black font-mono">3</span>
                <span className="text-xs font-bold">天</span>
              </div>
              <div className="text-[10px] font-bold text-muted-foreground">连续打卡</div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-300/40 text-center space-y-0.5">
              <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                <StarIcon className="size-4 fill-current" />
                <span className="text-lg font-black font-mono">120</span>
              </div>
              <div className="text-[10px] font-bold text-muted-foreground">探险能量星</div>
            </div>

            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-300/40 text-center space-y-0.5">
              <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400">
                <AwardIcon className="size-4" />
                <span className="text-lg font-black font-mono">{masteredCount}</span>
                <span className="text-xs font-bold text-muted-foreground">/39</span>
              </div>
              <div className="text-[10px] font-bold text-muted-foreground">音标掌握</div>
            </div>
          </div>

          {/* 今日练习高光记录 */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
            <div className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" />
                <span>🗣️ 今日金句跟读与声学评测</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                98分 卓越
              </span>
            </div>
            <p className="text-xs font-semibold text-foreground/90 italic pl-3.5 border-l-2 border-amber-400">
              “The sun is shining and the birds are singing.”
            </p>
          </div>

          {/* 敢敢老师鼓励寄语 */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300/40 flex items-start gap-3">
            <div className="size-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-base shrink-0 shadow-2xs">
              🦁
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="font-black text-amber-950 dark:text-amber-200">
                敢敢外教今日寄语：
              </div>
              <p className="text-muted-foreground leading-relaxed">
                发音饱满自然，爆破音清脆利落，口型非常标准！坚持每天 8 分钟，自信开口说地道英语！
              </p>
            </div>
          </div>

          {/* 底部功能按钮 */}
          <div className="pt-2 flex items-center gap-3">
            <Button
              onClick={handleCopy}
              className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
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
              className="h-11 px-3.5 rounded-2xl border-border hover:bg-muted text-xs font-bold gap-1.5 cursor-pointer shrink-0"
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
