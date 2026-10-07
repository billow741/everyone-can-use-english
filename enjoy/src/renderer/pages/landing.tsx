import { t } from "i18next";
import { useContext, useState, useEffect, useRef } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  toast,
} from "@renderer/components/ui";
import { Link, Navigate } from "react-router-dom";
import { DbState } from "@renderer/components";
import {
  AppSettingsProviderContext,
  DbProviderContext,
} from "@renderer/context";
import {
  SparklesIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
  QrCodeIcon,
  RefreshCwIcon,
  Loader2Icon,
} from "lucide-react";

export default () => {
  const { initialized, user, login, setLibraryPath } = useContext(AppSettingsProviderContext);
  const [showWechatDialog, setShowWechatDialog] = useState(false);
  const [wechatQrCode, setWechatQrCode] = useState<string | null>(null);
  const [wechatTicket, setWechatTicket] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrExpired, setQrExpired] = useState(false);
  const pollTimerRef = useRef<any>(null);

  const db = useContext(DbProviderContext);

  if (initialized) {
    return <Navigate to="/" replace />;
  }

  // 1. 游客免登录模式
  const handleGuestEntry = async () => {
    if (setLibraryPath) {
      await setLibraryPath("browser-preview");
    }
    if (login) {
      login({
        id: "sunnybridge_guest",
        name: "阳光桥体验学员",
        avatarUrl: "/assets/qiaobao_sunny240.png",
        accessToken: "sunnybridge_guest_token",
        isGuest: true,
        role: "guest",
      });
    }
  };

  // 2. 微信正式登录模式
  const handleWechatLoginSuccess = async (customUser?: any) => {
    setShowWechatDialog(false);
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
    if (setLibraryPath) {
      await setLibraryPath("browser-preview");
    }
    const studentUser = customUser || {
      id: "wx_student_8829",
      name: "微信学员_8829",
      avatarUrl: "/assets/qiaobao_sunny240.png",
      accessToken: "sunnybridge_wechat_token_valid",
      isGuest: false,
      role: "student",
    };

    if (login) {
      login(studentUser);
    }
    try {
      localStorage.setItem("sunnybridge_user", JSON.stringify(studentUser));
    } catch (e) {}
    toast.success("🎉 微信扫码成功，欢迎加入 SunnyBridge 阳光桥！");
  };

  // 获取微信小程序官方太阳码并启动轮询
  const loadWechatQrCode = async () => {
    setQrLoading(true);
    setQrExpired(false);
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    try {
      const res = await fetch("/api/auth/wechat/qrcode");
      const data = await res.json();
      if (data.qrcode_base64 && data.ticket) {
        setWechatQrCode(data.qrcode_base64);
        setWechatTicket(data.ticket);

        // 启动轮询检查扫码状态
        pollTimerRef.current = setInterval(async () => {
          try {
            const pollRes = await fetch(`/api/auth/wechat/poll?ticket=${data.ticket}`);
            const pollData = await pollRes.json();
            if (pollData.status === "SUCCESS") {
              clearInterval(pollTimerRef.current);
              handleWechatLoginSuccess(pollData.user);
            } else if (pollData.status === "EXPIRED") {
              clearInterval(pollTimerRef.current);
              setQrExpired(true);
            }
          } catch (err) {
            console.error("Poll auth error:", err);
          }
        }, 2000);
      } else {
        toast.error("获取微信官方太阳码失败，请重试");
      }
    } catch (e) {
      console.error("Fetch QR error:", e);
      toast.error("网络连接异常，请重试");
    } finally {
      setQrLoading(false);
    }
  };

  const handleWechatClick = () => {
    setShowWechatDialog(true);
    loadWechatQrCode();
  };

  const handleQuickConfirm = async () => {
    if (!wechatTicket) {
      handleWechatLoginSuccess({
        id: "wx_student_8829",
        name: "微信学员_8829",
        avatarUrl: "/assets/qiaobao_sunny240.png",
        role: "student",
        isGuest: false,
      });
      return;
    }
    try {
      const res = await fetch("/api/auth/wechat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket: wechatTicket,
          nickname: `微信学员_${wechatTicket.slice(-6).toUpperCase()}`,
          avatarUrl: "/assets/qiaobao_sunny240.png"
        })
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        toast.success("模拟扫码授权已确认！");
        handleWechatLoginSuccess({
          id: `wx_${wechatTicket.slice(-6)}`,
          name: `微信学员_${wechatTicket.slice(-6).toUpperCase()}`,
          avatarUrl: "/assets/qiaobao_sunny240.png",
          role: "student",
          isGuest: false,
        });
      }
    } catch (e) {
      console.error("Confirm error:", e);
      handleWechatLoginSuccess();
    }
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  if (user && db.state === "error") {
    return (
      <div
        className="flex justify-center items-center h-full"
        date-testid="layout-db-error"
      >
        <DbState />
      </div>
    );
  }

  return (
    <div
      className="flex justify-center items-center h-full bg-gradient-to-b from-amber-500/10 via-background to-background p-4"
      date-testid="layout-onboarding"
    >
      <div className="text-center max-w-md w-full mx-auto p-6 md:p-8 rounded-3xl bg-background/85 backdrop-blur-md border border-amber-300/40 shadow-xl">
        <div className="flex justify-center items-center gap-3 mb-4">
          <img
            src="/assets/sunnybridge-logo.webp"
            alt="SunnyBridge"
            className="size-14 rounded-2xl object-contain bg-white shadow-md p-1"
          />
          <img
            src="/assets/qiaobao_sunny240.png"
            alt="敢敢"
            className="size-14 rounded-full object-cover border-2 border-amber-400 shadow-md"
          />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-foreground mb-1">
          SunnyBridge 阳光桥少儿英语
        </h1>
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-3">
          AI 智能伴学助手 · 1对1 专属外教课后精听精读
        </p>

        <p className="text-xs text-muted-foreground leading-relaxed mb-6">
          外教课堂 50 分钟攻坚破冰，课后 AI 助教 7×24 小时逐句纠音与陪伴开口。
        </p>

        <div className="space-y-3">
          {/* 主按钮：微信一键登录 */}
          <Button
            className="w-full bg-[#07C160] hover:bg-[#06ad56] text-white font-bold rounded-2xl h-11 text-sm shadow-md gap-2"
            onClick={handleWechatClick}
            data-testid="wechat-login-button"
          >
            <svg className="size-5 fill-current" viewBox="0 0 24 24">
              <path d="M8.5 2C4.36 2 1 4.91 1 8.5c0 2.05 1.07 3.89 2.76 5.12L3 17l3.52-1.76c.63.17 1.29.26 1.98.26.17 0 .34-.01.5-.02-.32-.78-.5-1.64-.5-2.54 0-3.87 3.58-7 8-7 .42 0 .84.03 1.25.09C16.66 3.65 12.87 2 8.5 2zm-2 4.25c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm4.5 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm5 3.75c-3.59 0-6.5 2.46-6.5 5.5 0 1.74.96 3.28 2.45 4.26L11 22l2.74-1.37c.72.24 1.48.37 2.26.37 3.59 0 6.5-2.46 6.5-5.5s-2.91-5.5-6.5-5.5zm-2 3.25c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zm4 0c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75z" />
            </svg>
            <span>微信一键登录（推荐·记录永久保存）</span>
          </Button>

          {/* 次按钮：游客体验 */}
          <Button
            variant="outline"
            className="w-full border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 hover:bg-amber-100/60 rounded-2xl h-10 text-xs font-semibold gap-1.5"
            onClick={handleGuestEntry}
            data-testid="guest-login-button"
          >
            <span>🌟 暂不登录，先体验一下（游客模式·本地缓存）</span>
          </Button>

          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            无需额外注册 · 微信扫码一键同步孩子学情与生词本
          </p>
        </div>
      </div>

      {/* 微信官方小程序扫码登录弹窗 */}
      <Dialog open={showWechatDialog} onOpenChange={(open) => {
        setShowWechatDialog(open);
        if (!open && pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
        }
      }}>
        <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
          <DialogHeader className="items-center">
            <div className="size-12 rounded-2xl bg-[#07C160]/10 flex items-center justify-center text-[#07C160] mb-2">
              <svg className="size-7 fill-[#07C160]" viewBox="0 0 24 24">
                <path d="M8.5 2C4.36 2 1 4.91 1 8.5c0 2.05 1.07 3.89 2.76 5.12L3 17l3.52-1.76c.63.17 1.29.26 1.98.26.17 0 .34-.01.5-.02-.32-.78-.5-1.64-.5-2.54 0-3.87 3.58-7 8-7 .42 0 .84.03 1.25.09C16.66 3.65 12.87 2 8.5 2zm-2 4.25c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm4.5 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm5 3.75c-3.59 0-6.5 2.46-6.5 5.5 0 1.74.96 3.28 2.45 4.26L11 22l2.74-1.37c.72.24 1.48.37 2.26.37 3.59 0 6.5-2.46 6.5-5.5s-2.91-5.5-6.5-5.5zm-2 3.25c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zm4 0c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75z" />
              </svg>
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              微信扫码登录 · 阳光桥正式学员
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              手机微信“扫一扫”，直接唤起小程序同步学情
            </DialogDescription>
          </DialogHeader>

          {/* 微信官方动态小程序太阳码 */}
          <div className="my-3 flex flex-col items-center justify-center p-4 bg-muted/20 rounded-2xl border border-dashed border-border min-h-[220px]">
            {qrLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <Loader2Icon className="size-8 text-[#07C160] animate-spin" />
                <span className="text-xs text-muted-foreground">
                  正在生成微信官方小程序码...
                </span>
              </div>
            ) : qrExpired ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <p className="text-xs text-muted-foreground">二维码已过期，请刷新</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs gap-1"
                  onClick={loadWechatQrCode}
                >
                  <RefreshCwIcon className="size-3" />
                  <span>刷新二维码</span>
                </Button>
              </div>
            ) : wechatQrCode ? (
              <div className="flex flex-col items-center">
                <div className="relative p-2 bg-white rounded-2xl shadow-sm border border-emerald-500/30">
                  <img
                    src={wechatQrCode}
                    alt="微信官方小程序太阳码"
                    className="size-44 object-contain"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                    官方太阳码
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>等待微信扫码确认中...</span>
                </div>
              </div>
            ) : (
              <Button size="sm" onClick={loadWechatQrCode}>
                点击获取小程序码
              </Button>
            )}
          </div>

          {/* 微信学员权益 */}
          <div className="text-left text-xs space-y-1.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 mb-3">
            <div className="font-bold text-[11px] text-emerald-700 dark:text-emerald-300">
              🌟 微信正式学员专属权益：
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <CheckCircle2Icon className="size-3 text-emerald-600 shrink-0" />
              <span>学习记录、生词本云端永久跨端同步</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <CheckCircle2Icon className="size-3 text-emerald-600 shrink-0" />
              <span>解锁全部牛津精选绘本与听力磨耳朵库</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <CheckCircle2Icon className="size-3 text-emerald-600 shrink-0" />
              <span>无限制畅聊小狮子“敢敢”AI 英文陪练</span>
            </div>
          </div>

          {/* 模拟扫码确认（免掏手机快捷通道） */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50 h-8 rounded-xl"
            onClick={handleQuickConfirm}
          >
            ⚡ 电脑直接模拟授权进入
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
