import { Button, Separator } from "@renderer/components/ui";
import { SparklesIcon, ExternalLinkIcon } from "lucide-react";

export const About = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-yellow-500/15 border border-amber-300/40">
        <img
          src="/assets/qiaobao_sunny240.png"
          alt="敢敢"
          className="size-16 rounded-2xl object-cover border-2 border-amber-300 shadow-sm bg-white p-1"
        />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-foreground">SunnyBridge Enjoy</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
              v1.0.0 在线版
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            阳光桥少儿英语 · AI 智能伴学助手。1对1 专属固定外教，沉浸式互动伴学。
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-sm text-foreground">官方主站</div>
            <div className="text-xs text-muted-foreground">了解外教团队、课程体系与教学成果</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={() => window.open("https://www.sunnybridge.qzz.io", "_blank")}
          >
            <span>访问官网</span>
            <ExternalLinkIcon className="size-3.5" />
          </Button>
        </div>

        <Separator />

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-sm text-foreground">1对1 外教专属试听</div>
            <div className="text-xs text-muted-foreground">50 分钟沉浸互动，专业外教水平评测</div>
          </div>
          <Button
            size="sm"
            className="text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1 shadow-xs"
            onClick={() => window.open("https://www.sunnybridge.qzz.io/apply.html", "_blank")}
          >
            <SparklesIcon className="size-3.5" />
            <span>预约试听</span>
          </Button>
        </div>

        <Separator />

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-sm text-foreground">课程顾问咨询</div>
            <div className="text-xs text-muted-foreground">获取专属少儿定制分级学习计划</div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted text-foreground">
            微信：SunnyBridge_Service
          </span>
        </div>
      </div>
    </div>
  );
};
