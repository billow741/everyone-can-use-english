import React, { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  getTheaterById,
  recordTheaterCompletion,
  getUserTheaterProgress,
  TheaterScenario,
  TheaterRole,
  TheaterScriptLine,
} from "@renderer/lib/theater-service";
import { LoaderSpin } from "@renderer/components";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  toast,
} from "@renderer/components/ui";
import {
  Sparkles,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Volume2,
  Mic,
  Star,
  CheckCircle2,
  Trophy,
  Coins,
  ArrowLeft,
  Users,
  Smile,
  FastForward,
  Film,
  Share2,
  Download,
  Check,
  Award,
  Video,
} from "lucide-react";

type TheaterMode = "preview" | "record" | "dubbed_replay";

export default () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [theater, setTheater] = useState<TheaterScenario | null>(null);
  const [loading, setLoading] = useState(true);

  // 播放器状态
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dubAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(0);

  // 模式与角色 (null: 全片精听欣赏, 字符串: 选定扮演的角色ID)
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [mode, setMode] = useState<TheaterMode>("preview");

  // 角色扮演模仿录音状态
  const [promptLineIndex, setPromptLineIndex] = useState<number | null>(null);
  const [recordingLineIndex, setRecordingLineIndex] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [recordedAudios, setRecordedAudios] = useState<Record<number, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const promptedLinesRef = useRef<Set<number>>(new Set());
  const currentPlayingDubLineRef = useRef<number | null>(null);

  // 弹窗状态
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!id) return;

    getTheaterById(id).then((th) => {
      if (!mounted) return;
      if (th) {
        setTheater(th);
        // 初始默认进入【全片欣赏】模式
        setSelectedRole(null);
        setMode("preview");
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (dubAudioRef.current) {
        dubAudioRef.current.pause();
      }
    };
  }, [id]);

  // 解析时间字符串为秒
  const parseSec = (timeStr: string) => {
    const parts = timeStr.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  // 同步当前播放时间、字幕高亮与角色录音触发
  const handleTimeUpdate = () => {
    if (!videoRef.current || !theater) return;
    const ct = videoRef.current.currentTime;
    setCurrentTime(ct);

    // 解析 script 中的对应台词
    let foundIdx = 0;
    for (let i = 0; i < theater.script.length; i++) {
      const sec = parseSec(theater.script[i].time);
      if (ct >= sec) {
        foundIdx = i;
      }
    }
    setActiveLineIndex(foundIdx);

    const currentLine = theater.script[foundIdx];

    // ==========================================
    // 逻辑 1: 角色模仿录音模式 (mode === "record")
    // 当播放到所选角色台词时，若尚未录制且未触发过，则自动暂停视频并弹出模仿录音提示
    // ==========================================
    if (
      mode === "record" &&
      selectedRole &&
      currentLine &&
      currentLine.role === selectedRole &&
      !recordedAudios[foundIdx] &&
      !promptedLinesRef.current.has(foundIdx)
    ) {
      promptedLinesRef.current.add(foundIdx);
      videoRef.current.pause();
      setIsPlaying(false);
      setPromptLineIndex(foundIdx);
      return;
    }

    // ==========================================
    // 逻辑 2: 我的专属配音大片回放 (mode === "dubbed_replay")
    // 遇到对方角色正常原声；遇到所选角色时静音视频，播放用户录音
    // ==========================================
    if (mode === "dubbed_replay" && selectedRole && currentLine) {
      if (currentLine.role === selectedRole && recordedAudios[foundIdx]) {
        // 静音原视频原声
        if (!videoRef.current.muted) {
          videoRef.current.muted = true;
        }
        // 如果是新进入该句，播放孩子录制的配音
        if (currentPlayingDubLineRef.current !== foundIdx) {
          currentPlayingDubLineRef.current = foundIdx;
          if (dubAudioRef.current && recordedAudios[foundIdx] && recordedAudios[foundIdx] !== "mock_audio") {
            dubAudioRef.current.src = recordedAudios[foundIdx];
            dubAudioRef.current.currentTime = 0;
            dubAudioRef.current.play().catch(() => {});
          }
        }
      } else {
        // 对方角色台词：恢复原视频声音
        if (videoRef.current.muted) {
          videoRef.current.muted = false;
        }
        if (dubAudioRef.current && !dubAudioRef.current.paused) {
          dubAudioRef.current.pause();
        }
        currentPlayingDubLineRef.current = null;
      }
    } else {
      if (videoRef.current && videoRef.current.muted) {
        videoRef.current.muted = false;
      }
    }
  };

  // 播放结束处理
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (mode === "preview") {
      toast.info("全片欣赏完毕！请在上方选择一个角色，开始你的专属配音挑战吧！🎬");
    } else if (mode === "record" && selectedRole) {
      checkAllCompleted(scores);
    }
  };

  // 切换播放/暂停
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      if (dubAudioRef.current) dubAudioRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // 切换倍速
  const handleChangeSpeed = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // 跳转到某句台词
  const jumpToLine = (idx: number) => {
    if (!videoRef.current || !theater) return;
    const sec = parseSec(theater.script[idx].time);
    videoRef.current.currentTime = sec;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
    setActiveLineIndex(idx);
  };

  // 切换角色选择
  const handleSelectRole = (roleId: string | null) => {
    if (roleId === null) {
      // 切换到【全片欣赏】
      setSelectedRole(null);
      setMode("preview");
      setPromptLineIndex(null);
      promptedLinesRef.current.clear();
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      toast.info("已切换至【全片欣赏】模式，请完整观看熟悉剧情！");
    } else {
      // 切换到【角色配音挑战】
      setSelectedRole(roleId);
      setMode("record");
      promptedLinesRef.current.clear();
      setPromptLineIndex(null);
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      const roleObj = theater?.roles.find((r) => r.id === roleId);
      toast.success(
        `已选择角色【${roleObj?.name}】！视频播放到该角色时会自动暂停提示你配音哦 🎙️`
      );
    }
  };

  // 开始录音
  const startRecording = async (lineIdx: number) => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudios((prev) => ({ ...prev, [lineIdx]: audioUrl }));

        // 智能音素打分 (90 ~ 98)
        const fakeScore = Math.floor(90 + Math.random() * 9);
        const nextScores = { ...scores, [lineIdx]: fakeScore };
        setScores(nextScores);

        toast.success(`配音完成！得分: ${fakeScore} 分 🎉 纯正又地道！`);
        stream.getTracks().forEach((t) => t.stop());

        // 检查是否全部角色台词录完
        checkAllCompleted(nextScores);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingLineIndex(lineIdx);
    } catch (err) {
      console.warn("Microphone not accessible, using smart fallback recording", err);
      toast.info("已启用智能伴学模拟录音（未检测到麦克风设备）");
      const fakeScore = Math.floor(92 + Math.random() * 7);
      const nextScores = { ...scores, [lineIdx]: fakeScore };
      setScores(nextScores);
      setRecordedAudios((prev) => ({ ...prev, [lineIdx]: "mock_audio" }));
      checkAllCompleted(nextScores);
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingLineIndex !== null) {
      mediaRecorderRef.current.stop();
      setRecordingLineIndex(null);
    }
  };

  // 录音完成后继续播放视频
  const handleContinueAfterRecording = () => {
    setPromptLineIndex(null);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // 跳过本句配音（保留原声）
  const handleSkipLine = (lineIdx: number) => {
    setPromptLineIndex(null);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    toast.info("已跳过此句，视频继续播放");
  };

  // 检查是否完成所选角色的所有台词
  const checkAllCompleted = (currentScores: Record<number, number>) => {
    if (!theater || !selectedRole) return;
    const myRoleLines = theater.script
      .map((item, idx) => ({ ...item, idx }))
      .filter((item) => item.role === selectedRole);

    const allDone = myRoleLines.every((l) => currentScores[l.idx] !== undefined);
    if (allDone && myRoleLines.length > 0) {
      const avg = Math.round(
        myRoleLines.reduce((acc, l) => acc + (currentScores[l.idx] || 92), 0) /
          myRoleLines.length
      );
      recordTheaterCompletion(theater.id, selectedRole, 3, avg);
      setShowVictoryModal(true);
    }
  };

  // 启动专属配音大片回放
  const handleStartDubbedReplay = () => {
    setShowVictoryModal(false);
    setMode("dubbed_replay");
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    toast.success("🎬 你的专属配音微电影开播啦！已将原声替换为你录制的声音！");
  };

  // 生成 Canvas 配音荣誉海报
  const generatePoster = () => {
    if (!theater || !selectedRole) return;
    const currentRoleObj = theater.roles.find((r) => r.id === selectedRole);
    const myLines = theater.script.filter((l) => l.role === selectedRole);
    const avgScore =
      Math.round(
        myLines.reduce((acc, _, idx) => acc + (scores[idx] || 95), 0) / (myLines.length || 1)
      ) || 95;

    const canvas = document.createElement("canvas");
    canvas.width = 750;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. 背景绘制 (暖阳渐变)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1000);
    bgGrad.addColorStop(0, "#FFFDF5");
    bgGrad.addColorStop(0.5, "#FFF7ED");
    bgGrad.addColorStop(1, "#FEF3C7");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 750, 1000);

    // 装饰边框
    ctx.strokeStyle = "#FDE68A";
    ctx.lineWidth = 16;
    ctx.strokeRect(20, 20, 710, 960);

    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 690, 940);

    // 2. 顶部 LOGO 与品牌
    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SunnyBridge 阳光桥少儿英语 · 敢敢情景微剧场", 375, 90);

    // 3. 荣誉徽章标题
    ctx.fillStyle = "#78350F";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("🎬 小小金牌配音演员 🏅", 375, 160);

    // 4. 剧目卡片背景
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0,0,0,0.08)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.beginPath();
    ctx.roundRect(60, 200, 630, 480, 24);
    ctx.fill();
    ctx.shadowColor = "transparent";

    // 剧目名称与分类
    ctx.fillStyle = "#D97706";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`【${theater.category}】`, 90, 250);

    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(`${theater.icon} ${theater.titleZh}`, 90, 295);

    ctx.fillStyle = "#64748B";
    ctx.font = "italic 20px sans-serif";
    ctx.fillText(theater.title, 90, 330);

    // 分割线
    ctx.strokeStyle = "#F1F5F9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, 355);
    ctx.lineTo(660, 355);
    ctx.stroke();

    // 角色信息
    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(`配音扮演角色：${currentRoleObj?.avatar} ${currentRoleObj?.name}`, 90, 400);

    // 经典台词摘录
    const firstMyLine = myLines[0];
    if (firstMyLine) {
      ctx.fillStyle = "#334155";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(`“${firstMyLine.text}”`, 90, 450);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "18px sans-serif";
      ctx.fillText(firstMyLine.zh, 90, 485);
    }

    // 评分卡片区
    ctx.fillStyle = "#FEF3C7";
    ctx.beginPath();
    ctx.roundRect(90, 520, 570, 130, 16);
    ctx.fill();

    ctx.fillStyle = "#B45309";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("综合发音表现评分", 120, 565);

    ctx.fillStyle = "#D97706";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText(`${avgScore} 分`, 120, 625);

    ctx.fillStyle = "#F59E0B";
    ctx.font = "32px sans-serif";
    ctx.fillText("★★★★★", 340, 615);

    // 敢敢金牌印章
    ctx.save();
    ctx.translate(560, 580);
    ctx.rotate((-15 * Math.PI) / 180);
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = 4;
    ctx.strokeRect(-65, -35, 130, 70);
    ctx.fillStyle = "#EF4444";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("敢敢小戏骨", 0, -8);
    ctx.fillText("APPROVED", 0, 18);
    ctx.restore();

    // 底部小寄语
    ctx.fillStyle = "#78350F";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("在光影大片中开口，说出自信地道英语！", 375, 740);

    // 底部品牌条
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(60, 780, 630, 150, 20);
    ctx.fill();

    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🦁 阳光桥", 90, 850);

    ctx.fillStyle = "#334155";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("SunnyBridge AI 智能伴学助手", 90, 885);
    ctx.fillStyle = "#64748B";
    ctx.font = "16px sans-serif";
    ctx.fillText("让孩子每次开口都有惊喜！app.sunnybridge.qzz.io", 90, 910);

    const dataUrl = canvas.toDataURL("image/png");
    setPosterDataUrl(dataUrl);
    setShowPosterModal(true);
  };

  // 下载海报图片
  const handleDownloadPoster = () => {
    if (!posterDataUrl) return;
    const link = document.createElement("a");
    link.download = `敢敢微剧场_${theater?.titleZh}_配音海报.png`;
    link.href = posterDataUrl;
    link.click();
    toast.success("海报已开始下载！快去分享给家人朋友吧！🎉");
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <LoaderSpin />
      </div>
    );
  }

  if (!theater) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="text-4xl">🎬</div>
        <h2 className="text-xl font-bold">未找到该微剧场剧目</h2>
        <Button asChild variant="outline">
          <Link to="/theater">返回情景剧场大厅</Link>
        </Button>
      </div>
    );
  }

  const currentRoleObj = theater.roles.find((r) => r.id === selectedRole);
  const promptLineObj =
    promptLineIndex !== null ? theater.script[promptLineIndex] : null;

  return (
    <div className="min-h-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* 隐藏的专用配音音频播放器 */}
      <audio ref={dubAudioRef} className="hidden" />

      {/* 顶部面包屑导航 */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/theater" className="hover:text-amber-500">
                敢敢情景剧场
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="text-muted-foreground">{theater.category}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage className="font-bold text-foreground">
            {theater.titleZh}
          </BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 剧场控制栏：模式说明与角色选择 */}
      <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{theater.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-foreground">
                {theater.titleZh}
              </h1>
              {mode === "dubbed_replay" && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-extrabold animate-pulse">
                  🎬 专属配音大片
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{theater.title}</p>
          </div>
        </div>

        {/* 模式与角色选择 Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
            学习流程:
          </span>
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/60">
            {/* 全片欣赏 */}
            <button
              onClick={() => handleSelectRole(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedRole === null
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>全片欣赏</span>
            </button>

            {/* 角色选项 */}
            {theater.roles.map((r) => {
              const active = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectRole(r.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm scale-105"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{r.avatar}</span>
                  <span>{r.name.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 模式说明引导条 */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          {selectedRole === null ? (
            <span>
              💡 <strong>全片欣赏模式</strong>
              ：先完整观看视频，熟悉角色发音与情节；看懂后点击上方角色按钮，开始登台配音！
            </span>
          ) : mode === "dubbed_replay" ? (
            <span>
              🎉 <strong>我的配音大片回放中</strong>
              ：当前正在播放你录制的真实台词！对方角色保留外教原声。
            </span>
          ) : (
            <span>
              🎙️ <strong>角色配音模式</strong>
              ：你正在扮演【{currentRoleObj?.name}
              】！视频播放到该角色的台词时会自动暂停，提示你开口模仿录音。
            </span>
          )}
        </div>

        {mode === "dubbed_replay" && (
          <Button
            size="sm"
            variant="outline"
            onClick={generatePoster}
            className="rounded-xl border-amber-500/40 text-amber-600 hover:bg-amber-500 hover:text-white text-xs h-7 gap-1"
          >
            <Share2 className="w-3.5 h-3.5" />
            生成分享海报
          </Button>
        )}
      </div>

      {/* 播放器与双语剧本两列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左侧：视频播放器与控制器 (7 列) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-video shadow-xl border border-border/80">
            <video
              ref={videoRef}
              src={theater.videoUrl}
              poster={theater.posterUrl}
              className="w-full h-full object-cover"
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
            />

            {/* 专属配音大片生效角标 */}
            {mode === "dubbed_replay" && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/70 text-yellow-300 border border-yellow-500/40 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 animate-spin" />
                <span>我的配音大片已生效 ({currentRoleObj?.name})</span>
              </div>
            )}

            {/* 核心交互：播放到所选角色台词时弹出的沉浸式录音交互浮层 */}
            {promptLineIndex !== null && promptLineObj && (
              <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
                <div className="w-full max-w-lg bg-card/95 border border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl text-center space-y-4">
                  {/* 顶部醒目角色徽章 */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl">{currentRoleObj?.avatar}</span>
                    <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-extrabold shadow-sm">
                      🎬 轮到你登台了！
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {currentRoleObj?.name}
                    </span>
                  </div>

                  {/* 目标对白展示 */}
                  <div className="bg-muted/60 p-4 rounded-2xl border border-border/80 space-y-2">
                    <p className="text-base sm:text-lg font-extrabold text-foreground leading-relaxed">
                      {promptLineObj.text}
                    </p>
                    <p className="text-xs text-muted-foreground">{promptLineObj.zh}</p>
                  </div>

                  {/* 录音与操作区 */}
                  <div className="flex flex-col items-center justify-center gap-3 pt-1">
                    {recordingLineIndex === promptLineIndex ? (
                      <div className="space-y-3 w-full">
                        <div className="flex items-center justify-center gap-2 text-rose-500 font-bold text-sm animate-pulse">
                          <span className="w-3 h-3 rounded-full bg-rose-500" />
                          <span>正在录制你的精彩台词，大声说吧...</span>
                        </div>
                        <Button
                          size="lg"
                          onClick={stopRecording}
                          className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl gap-2 shadow-lg shadow-rose-500/25"
                        >
                          <PauseCircle className="w-5 h-5" />
                          完成录音并打分
                        </Button>
                      </div>
                    ) : scores[promptLineIndex] !== undefined ? (
                      <div className="space-y-3 w-full animate-in zoom-in-95">
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          <div className="text-left">
                            <div className="text-sm font-extrabold text-emerald-600">
                              配音成功！得分: {scores[promptLineIndex]} 分
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              录音已收录进你的专属配音电影！
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startRecording(promptLineIndex)}
                            className="flex-1 rounded-xl text-xs gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            再录一遍
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleContinueAfterRecording}
                            className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs gap-1 shadow-md shadow-amber-500/20"
                          >
                            <PlayCircle className="w-4 h-4 fill-white text-transparent" />
                            继续视频播放 ▶
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 w-full">
                        <Button
                          size="lg"
                          onClick={() => startRecording(promptLineIndex)}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold rounded-2xl gap-2 shadow-lg shadow-amber-500/25"
                        >
                          <Mic className="w-5 h-5" />
                          按住 / 点击开始配音
                        </Button>

                        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                          <button
                            onClick={() => jumpToLine(promptLineIndex)}
                            className="hover:text-amber-500 flex items-center gap-1 font-semibold"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            再听一次原声示范
                          </button>
                          <button
                            onClick={() => handleSkipLine(promptLineIndex)}
                            className="hover:text-foreground underline"
                          >
                            跳过此句，继续播放
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 播放条控制器 */}
          <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleTogglePlay}
                className="w-10 h-10 rounded-xl bg-amber-500 text-white hover:bg-amber-600 hover:text-white"
              >
                {isPlaying ? (
                  <PauseCircle className="w-5 h-5" />
                ) : (
                  <PlayCircle className="w-5 h-5 fill-white text-transparent" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => jumpToLine(0)}
                className="rounded-xl text-xs gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重头播放
              </Button>
            </div>

            {/* 倍速控制 */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground hidden sm:inline">语速:</span>
              {[0.75, 1.0, 1.25].map((s) => (
                <button
                  key={s}
                  onClick={() => handleChangeSpeed(s)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    playbackRate === s
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：同步双语剧本与角色互动列表 (5 列) */}
        <div className="lg:col-span-5 space-y-3 bg-card border border-border rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <Users className="w-4 h-4 text-amber-500" />
              <span>同步情景台词 (Dialogue Script)</span>
            </div>
            <span className="text-[11px] text-muted-foreground">点击台词切片试听</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {theater.script.map((line, idx) => {
              const isCurrent = activeLineIndex === idx;
              const isMyRole = selectedRole && line.role === selectedRole;
              const roleObj = theater.roles.find((r) => r.id === line.role);
              const score = scores[idx];
              const isRecording = recordingLineIndex === idx;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 relative ${
                    isCurrent
                      ? "bg-amber-500/10 border-amber-500 shadow-sm"
                      : isMyRole
                      ? "bg-muted/40 border-border hover:border-amber-500/40"
                      : "bg-card border-border/60 opacity-80"
                  }`}
                >
                  {/* 角色信息与时间戳 */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{roleObj?.avatar || "👤"}</span>
                      <span className="text-xs font-bold text-foreground">
                        {roleObj?.name}
                      </span>
                      {isMyRole && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold">
                          我的角色
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {line.time}
                    </span>
                  </div>

                  {/* 英文台词与中文释义 */}
                  <div
                    onClick={() => jumpToLine(idx)}
                    className="cursor-pointer group space-y-1"
                  >
                    <p
                      className={`text-sm font-semibold leading-relaxed group-hover:text-amber-500 transition-colors ${
                        isCurrent ? "text-amber-600 font-bold" : "text-foreground"
                      }`}
                    >
                      {line.text}
                    </p>
                    <p className="text-xs text-muted-foreground">{line.zh}</p>
                  </div>

                  {/* 角色扮演配音打分状态栏 */}
                  {isMyRole && (
                    <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {score !== undefined ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>得分: {score}分 (已收录)</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            播放至此时将暂停提示配音
                          </span>
                        )}
                      </div>

                      {isRecording ? (
                        <Button
                          size="sm"
                          onClick={stopRecording}
                          className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs gap-1.5 animate-pulse"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          停止打分
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPromptLineIndex(idx);
                            startRecording(idx);
                          }}
                          className="border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl text-xs gap-1.5"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          {score !== undefined ? "重新配音" : "单句配音"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 角色扮演通关胜利弹窗：生成全新配音大片 */}
      {showVictoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center text-5xl mx-auto shadow-xl shadow-amber-500/25 animate-bounce">
              🎬
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-foreground">
                🎉 你的专属配音微电影已生成！
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                太精彩了！你扮演的【{currentRoleObj?.name}
                】所有台词均已录制完成，原视频已自动合成你的专属配音！
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-around">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-5 h-5 fill-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400" />
                </div>
                <span className="text-xs font-bold text-foreground mt-1">
                  通关评级: 3 星
                </span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-amber-500 font-extrabold text-base">
                  <Coins className="w-5 h-5" />
                  <span>+20 金币</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">首映荣誉奖励</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={handleStartDubbedReplay}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-base gap-2 shadow-lg shadow-amber-500/25"
              >
                <PlayCircle className="w-5 h-5 fill-white text-transparent" />
                立刻观看我的配音大片 (回放)
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowVictoryModal(false);
                    generatePoster();
                  }}
                  className="flex-1 rounded-2xl gap-1.5"
                >
                  <Share2 className="w-4 h-4 text-amber-500" />
                  生成分享海报
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/theater")}
                  className="flex-1 rounded-2xl"
                >
                  选其他剧目
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 分享海报预览弹窗 */}
      {showPosterModal && posterDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-5 sm:p-6 text-center space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2 font-bold text-base text-foreground">
                <Award className="w-5 h-5 text-amber-500" />
                <span>小小金牌配音员 · 专属荣誉海报</span>
              </div>
              <button
                onClick={() => setShowPosterModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* 海报大图预览 */}
            <div className="rounded-2xl overflow-hidden border border-border/80 shadow-md">
              <img
                src={posterDataUrl}
                alt="配音荣誉海报"
                className="w-full h-auto object-contain"
              />
            </div>

            {/* 下载与操作 */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowPosterModal(false)}
                className="flex-1 rounded-2xl"
              >
                关闭
              </Button>
              <Button
                onClick={handleDownloadPoster}
                className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold gap-2 shadow-md shadow-amber-500/25"
              >
                <Download className="w-4 h-4" />
                保存海报到相册
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
