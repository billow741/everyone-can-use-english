import React, { useState, useEffect, useRef } from "react";
import {
  XIcon,
  DownloadIcon,
  CopyIcon,
  Share2Icon,
  SparklesIcon,
  AwardIcon,
  CheckCircle2Icon,
  TrophyIcon,
  FlameIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
} from "@renderer/components/ui";
import { ALL_39_PHONEMES, PhonemeItem } from "@renderer/lib/phoneme-data";
import { calculatePhonemeBadges, PhonemeBadge } from "@renderer/lib/phoneme-badges";
import { toast } from "sonner";

interface PhonemeCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneme?: PhonemeItem | null;
  masteryMap: Record<string, boolean>;
  mode?: "grand" | "single";
}

export const PhonemeCertificateModal: React.FC<PhonemeCertificateModalProps> = ({
  isOpen,
  onClose,
  phoneme,
  masteryMap,
  mode = phoneme ? "single" : "grand",
}) => {
  const [activeMode, setActiveMode] = useState<"grand" | "single">(mode);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const masteredPhonemes = ALL_39_PHONEMES.filter((p) => masteryMap[p.id]);
  const masteredCount = masteredPhonemes.length;
  const percentage = Math.round((masteredCount / ALL_39_PHONEMES.length) * 100);
  const badges = calculatePhonemeBadges(masteryMap);
  const unlockedBadges = badges.filter((b) => b.isUnlocked);

  useEffect(() => {
    if (isOpen) {
      setActiveMode(phoneme ? "single" : "grand");
      // 生成海报
      setTimeout(() => {
        drawPoster();
      }, 100);
    }
  }, [isOpen, phoneme, masteryMap, activeMode]);

  const drawPoster = () => {
    setIsGenerating(true);
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 750;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. 背景渐变
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1080);
    bgGrad.addColorStop(0, "#FFFDF7");
    bgGrad.addColorStop(0.4, "#FFF9EB");
    bgGrad.addColorStop(1, "#FEF3C7");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 750, 1080);

    // 2. 双重古典荣誉边框
    ctx.strokeStyle = "#FDE68A";
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, 710, 1040);

    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(32, 32, 686, 1016);

    // 四角装饰纹样
    const cornerSize = 24;
    const corners = [
      [36, 36],
      [714 - cornerSize, 36],
      [36, 1044 - cornerSize],
      [714 - cornerSize, 1044 - cornerSize],
    ];
    ctx.fillStyle = "#F59E0B";
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, cornerSize, cornerSize);
    });

    // 3. 顶部机构标识与头衔
    ctx.fillStyle = "#D97706";
    ctx.font = "bold 20px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SunnyBridge 阳光桥少儿英语 · 语音工程实验室", 375, 88);

    ctx.fillStyle = "#78350F";
    ctx.font = "900 38px 'Segoe UI', system-ui, sans-serif";
    if (activeMode === "single" && phoneme) {
      ctx.fillText(`🎯 单音标通关认证卡 · ${phoneme.symbol}`, 375, 142);
    } else {
      ctx.fillText("🏆 39 国际音标金牌发音官 荣誉证书", 375, 142);
    }

    ctx.fillStyle = "#92400E";
    ctx.font = "italic 16px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("International Phonetic Alphabet Mastery Certification", 375, 172);

    // 4. 学员信息与核心成就看板
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0, 0, 0, 0.06)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.roundRect(55, 205, 640, activeMode === "single" && phoneme ? 560 : 560, 24);
    ctx.fill();
    ctx.shadowColor = "transparent";

    // 学员头衔与认证标识
    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 22px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🦁 敢敢少儿英语伴学学员", 85, 255);

    ctx.fillStyle = "#64748B";
    ctx.font = "14px 'Segoe UI', system-ui, sans-serif";
    const dateStr = new Date().toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    ctx.fillText(`认证日期: ${dateStr}`, 85, 282);

    // 分隔线
    ctx.strokeStyle = "#F1F5F9";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(85, 302);
    ctx.lineTo(665, 302);
    ctx.stroke();

    if (activeMode === "single" && phoneme) {
      // ----------------- 单音标特训认证内容 -----------------
      // 音标大卡
      ctx.fillStyle = "#FEF3C7";
      ctx.beginPath();
      ctx.roundRect(85, 325, 580, 140, 20);
      ctx.fill();

      ctx.fillStyle = "#B45309";
      ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("已通关掌握核心音素", 115, 365);

      ctx.fillStyle = "#D97706";
      ctx.font = "bold 64px 'Charis SIL', 'Segoe UI', monospace";
      ctx.fillText(phoneme.symbol, 115, 435);

      ctx.fillStyle = "#78350F";
      ctx.font = "bold 22px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(phoneme.name, 280, 390);

      ctx.fillStyle = "#B45309";
      ctx.font = "16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(`代表词: ${phoneme.sampleWord} · 自然拼读: ${phoneme.phonicsSpell}`, 280, 422);

      // 解剖与发音要领摘要
      ctx.fillStyle = "#F8FAFC";
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(85, 485, 580, 140, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("💡 发音器官动作与科学自检：", 105, 520);

      ctx.fillStyle = "#475569";
      ctx.font = "14px 'Segoe UI', system-ui, sans-serif";
      // 截取两句口诀
      const step1 = phoneme.steps[0] || phoneme.chineseExplanation;
      const step2 = phoneme.steps[1] || phoneme.tip;
      ctx.fillText(`1. ${step1.length > 34 ? step1.slice(0, 34) + "..." : step1}`, 105, 555);
      ctx.fillText(`2. ${step2.length > 34 ? step2.slice(0, 34) + "..." : step2}`, 105, 588);

      // 掌握度进度条
      ctx.fillStyle = "#10B981";
      ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(`全套 39 音标总进度: ${masteredCount} / 39 (${percentage}%)`, 105, 650);

      ctx.fillStyle = "#E2E8F0";
      ctx.beginPath();
      ctx.roundRect(105, 665, 540, 10, 5);
      ctx.fill();

      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.roundRect(105, 665, Math.max(10, 540 * (masteredCount / 39)), 10, 5);
      ctx.fill();
    } else {
      // ----------------- 39 音标总满贯证书内容 -----------------
      // 3 项统计指标卡
      const stats = [
        { label: "已掌握音标", val: `${masteredCount} / 39`, color: "#D97706" },
        { label: "掌握完成率", val: `${percentage}%`, color: "#10B981" },
        { label: "已解锁勋章", val: `${unlockedBadges.length} 枚`, color: "#8B5CF6" },
      ];

      stats.forEach((st, idx) => {
        const sx = 85 + idx * 195;
        ctx.fillStyle = "#F8FAFC";
        ctx.beginPath();
        ctx.roundRect(sx, 320, 185, 95, 16);
        ctx.fill();

        ctx.fillStyle = "#64748B";
        ctx.font = "13px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText(st.label, sx + 20, 350);

        ctx.fillStyle = st.color;
        ctx.font = "900 28px 'Segoe UI', system-ui, monospace";
        ctx.fillText(st.val, sx + 20, 390);
      });

      // 解锁的勋章展示
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 17px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("🏅 荣获发音成就勋章：", 85, 450);

      const renderBadges = unlockedBadges.length > 0 ? unlockedBadges : badges.slice(0, 4);
      renderBadges.slice(0, 4).forEach((b, bIdx) => {
        const bx = 85 + (bIdx % 2) * 295;
        const by = 470 + Math.floor(bIdx / 2) * 65;

        ctx.fillStyle = b.isUnlocked ? "#FEF3C7" : "#F1F5F9";
        ctx.beginPath();
        ctx.roundRect(bx, by, 280, 52, 12);
        ctx.fill();

        ctx.font = "22px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText(b.icon, bx + 12, by + 34);

        ctx.fillStyle = b.isUnlocked ? "#78350F" : "#94A3B8";
        ctx.font = "bold 15px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText(b.name, bx + 44, by + 32);

        ctx.fillStyle = b.isUnlocked ? "#10B981" : "#94A3B8";
        ctx.font = "bold 12px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText(b.isUnlocked ? "✓ 已解锁" : "进行中", bx + 215, by + 32);
      });

      // 精选已攻克的代表音标矩阵
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 17px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("🔤 攻坚发音标杆矩阵 (IPA Representative)：", 85, 625);

      const samplePhonemes = (masteredPhonemes.length > 0 ? masteredPhonemes : ALL_39_PHONEMES).slice(
        0,
        14
      );
      samplePhonemes.forEach((p, pIdx) => {
        const px = 85 + (pIdx % 7) * 82;
        const py = 645 + Math.floor(pIdx / 7) * 45;

        ctx.fillStyle = "#F1F5F9";
        ctx.beginPath();
        ctx.roundRect(px, py, 74, 36, 10);
        ctx.fill();

        ctx.fillStyle = "#1E293B";
        ctx.font = "bold 14px 'Charis SIL', monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.symbol, px + 37, py + 23);
        ctx.textAlign = "left";
      });
    }

    // 5. 官方防伪金印章 (Approved Stamp)
    ctx.save();
    ctx.translate(565, 715);
    ctx.rotate((-12 * Math.PI) / 180);

    // 外圈红色印章
    ctx.strokeStyle = "#DC2626";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#DC2626";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#DC2626";
    ctx.font = "900 13px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("阳光桥发音认证", 0, -12);
    ctx.font = "bold 16px 'Segoe UI', system-ui, monospace";
    ctx.fillText("VERIFIED", 0, 6);
    ctx.font = "bold 10px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("★ ★ ★ ★ ★", 0, 22);
    ctx.restore();

    // 6. 寄语格言
    ctx.fillStyle = "#78350F";
    ctx.font = "bold 20px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("“每一次清晰纯正地发音，都是探索广阔世界的金钥匙。”", 375, 805);

    // 7. 底部阳光桥品牌条
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(55, 840, 640, 160, 22);
    ctx.fill();

    ctx.fillStyle = "#F59E0B";
    ctx.font = "900 38px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🦁 阳光桥 SunnyBridge", 90, 905);

    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("AI 智能伴学助手 · 39 音标发音沉浸工坊", 90, 942);

    ctx.fillStyle = "#64748B";
    ctx.font = "14px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("专属外教课后逐句纠音与地道语调训练 · app.sunnybridge.qzz.io", 90, 970);

    // 生成图片链接
    const url = canvas.toDataURL("image/png");
    setPosterUrl(url);
    setIsGenerating(false);
  };

  // 下载海报
  const handleDownload = () => {
    if (!posterUrl) return;
    const link = document.createElement("a");
    link.download = `SunnyBridge-Phoneme-Certificate-${Date.now()}.png`;
    link.href = posterUrl;
    link.click();
    toast.success("🎉 通关海报已下载！欢迎分享至朋友圈记录成长！");
  };

  // 复制海报到剪贴板
  const handleCopy = async () => {
    if (!posterUrl) return;
    try {
      const res = await fetch(posterUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      toast.success("📋 通关海报已复制到剪贴板！可以直接粘贴发送！");
    } catch (err) {
      toast.info("当前浏览器暂不支持直接复制图片，请使用右键另存或点击下方【下载海报】");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 bg-card border-border">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <span className="size-7 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-sm">
                🎓
              </span>
              <span>发音通关荣誉殿堂 · 战报证书</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            记录每一次精准发音与肌肉记忆突破，一键生成精美成长证书海报
          </DialogDescription>
        </DialogHeader>

        {/* 模式切换 (如果指定了音标) */}
        {phoneme && (
          <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-2xl w-fit">
            <button
              onClick={() => setActiveMode("single")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === "single"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              本音标 [{phoneme.symbol}] 认证卡
            </button>
            <button
              onClick={() => setActiveMode("grand")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === "grand"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              39 音标总进度证书
            </button>
          </div>
        )}

        {/* 海报画板预览 */}
        <div className="flex justify-center py-2">
          {posterUrl ? (
            <div className="relative group max-w-sm rounded-2xl overflow-hidden shadow-xl border-4 border-amber-500/20">
              <img
                src={posterUrl}
                alt="Phoneme Certificate"
                className="w-full h-auto object-contain rounded-xl"
              />
            </div>
          ) : (
            <div className="h-96 w-72 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground text-xs animate-pulse">
              正在生成高清通关证书...
            </div>
          )}
        </div>

        {/* 隐藏 Canvas 节点供导出 */}
        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <SparklesIcon className="size-3.5 text-amber-500" />
            <span>支持微信朋友圈、群打卡或打印永久留念</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex-1 sm:flex-none rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
            >
              <CopyIcon className="size-3.5" />
              <span>复制图片</span>
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              className="flex-1 sm:flex-none rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <DownloadIcon className="size-3.5" />
              <span>下载高清海报</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
