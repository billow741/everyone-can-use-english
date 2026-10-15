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
} from "lucide-react";

export default () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [theater, setTheater] = useState<TheaterScenario | null>(null);
  const [loading, setLoading] = useState(true);

  // 播放器状态
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(0);

  // 角色扮演模式 (null: 全片精听欣赏, 字符串: 选定扮演的角色ID)
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // 录音状态
  const [recordingLineIndex, setRecordingLineIndex] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [recordedAudios, setRecordedAudios] = useState<Record<number, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 结算弹窗
  const [showVictoryModal, setShowVictoryModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!id) return;

    getTheaterById(id).then((th) => {
      if (!mounted) return;
      if (th) {
        setTheater(th);
        // Default role: the second role (often the kid/learner role)
        if (th.roles.length > 1) {
          setSelectedRole(th.roles[1].id);
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [id]);

  // 同步当前播放时间与台词
  const handleTimeUpdate = () => {
    if (!videoRef.current || !theater) return;
    const ct = videoRef.current.currentTime;
    setCurrentTime(ct);

    // 解析 script 中的时间标记
    let foundIdx = 0;
    for (let i = 0; i < theater.script.length; i++) {
      const parts = theater.script[i].time.split(":");
      const sec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      if (ct >= sec) {
        foundIdx = i;
      }
    }
    setActiveLineIndex(foundIdx);
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleChangeSpeed = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const jumpToLine = (idx: number) => {
    if (!videoRef.current || !theater) return;
    const parts = theater.script[idx].time.split(":");
    const sec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    videoRef.current.currentTime = sec;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
    setActiveLineIndex(idx);
  };

  // 开始录音跟读指定台词
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

        // 模拟打分 (88 ~ 98)
        const fakeScore = Math.floor(88 + Math.random() * 11);
        setScores((prev) => {
          const updated = { ...prev, [lineIdx]: fakeScore };
          checkAllCompleted(updated);
          return updated;
        });

        toast.success(`朗读完成！得分: ${fakeScore} 分 🎉 表现太棒啦！`);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingLineIndex(lineIdx);
    } catch (err) {
      toast.error("无法访问麦克风，请检查录音授权！");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingLineIndex !== null) {
      mediaRecorderRef.current.stop();
      setRecordingLineIndex(null);
    }
  };

  const checkAllCompleted = (currentScores: Record<number, number>) => {
    if (!theater || !selectedRole) return;
    const myRoleLines = theater.script
      .map((item, idx) => ({ ...item, idx }))
      .filter((item) => item.role === selectedRole);

    const allDone = myRoleLines.every((l) => currentScores[l.idx] !== undefined);
    if (allDone && myRoleLines.length > 0) {
      const avg = Math.round(
        myRoleLines.reduce((acc, l) => acc + (currentScores[l.idx] || 90), 0) /
          myRoleLines.length
      );
      recordTheaterCompletion(theater.id, selectedRole, 3, avg);
      setShowVictoryModal(true);
    }
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

  return (
    <div className="min-h-full max-w-6xl mx-auto px-4 py-6 space-y-6">
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

      {/* 剧场控制栏：角色切换与全屏模式 */}
      <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{theater.icon}</span>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-foreground">
              {theater.titleZh}
            </h1>
            <p className="text-xs text-muted-foreground">{theater.title}</p>
          </div>
        </div>

        {/* 角色扮演切换 Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
            扮演角色:
          </span>
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/60">
            <button
              onClick={() => setSelectedRole(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedRole === null
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              全片欣赏
            </button>
            {theater.roles.map((r) => {
              const active = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
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
              onEnded={() => setIsPlaying(false)}
            />

            {/* 正在角色扮演的高亮浮层提示 */}
            {selectedRole && theater.script[activeLineIndex]?.role === selectedRole && (
              <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between bg-amber-500/90 text-white backdrop-blur-md px-3.5 py-2 rounded-2xl animate-pulse shadow-lg text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-yellow-200" />
                  当前正轮到你的角色发言！准备跟读打分
                </span>
                <span>{currentRoleObj?.name}</span>
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

                  {/* 角色扮演专属跟读打分栏 */}
                  {isMyRole && (
                    <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {score !== undefined ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>得分: {score}分</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            大声朗读模仿外教
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
                          onClick={() => startRecording(idx)}
                          className="border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl text-xs gap-1.5"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          {score !== undefined ? "重新跟读" : "开始配音"}
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

      {/* 角色扮演通关胜利弹窗 */}
      {showVictoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center text-5xl mx-auto shadow-xl shadow-amber-500/25 animate-bounce">
              🌟
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-foreground">
                太棒啦！小小金牌演员！
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                你成功完成了【{theater.titleZh}】中【{currentRoleObj?.name}
                】的全部情景对白，纯正发音令人赞叹！
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
                <span className="text-xs text-muted-foreground mt-1">荣誉通关金币</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowVictoryModal(false)}
                className="flex-1 rounded-2xl"
              >
                继续欣赏
              </Button>
              <Button
                onClick={() => navigate("/theater")}
                className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold"
              >
                选其他剧目 🎬
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
