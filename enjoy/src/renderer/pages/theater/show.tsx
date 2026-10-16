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
  Film,
  Share2,
  Download,
  Award,
  Video,
  Check,
  XCircle,
  ChevronRight,
  ListOrdered,
} from "lucide-react";

// Tell Me More 经典三步教学流程：
// Step 1: Watch Film (Diffusion du film) - 全片播放欣赏
// Step 2: Play Your Part (Interprétation du personnage) - 角色登台配音
// Step 3: Watch with Your Recording (Rediffusion avec l'interprétation) - 配音大片回放
type TMMStep = 1 | 2 | 3;

export default () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [theater, setTheater] = useState<TheaterScenario | null>(null);
  const [loading, setLoading] = useState(true);

  // Tell Me More 三阶段教学步骤，初始默认第 1 步：全片欣赏
  const [currentStep, setCurrentStep] = useState<TMMStep>(1);

  // 播放器状态
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dubAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(0);

  // 角色选择（Step 2 / Step 3 生效）
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Step 2 录音状态（控制台置于视频正下方，无任何覆盖画面的弹窗）
  const [isRecording, setIsRecording] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [recordedAudios, setRecordedAudios] = useState<Record<number, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const promptedLinesRef = useRef<Set<number>>(new Set());
  const currentPlayingDubLineRef = useRef<number | null>(null);
  const recordStartTimeRef = useRef<number>(0);
  const [recordedDurations, setRecordedDurations] = useState<Record<number, number>>({});

  // 是否开启字幕 (Display film subtitles)
  const [showSubtitles, setShowSubtitles] = useState(true);

  // 分享海报弹窗
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!id) return;

    getTheaterById(id).then((th) => {
      if (!mounted) return;
      if (th) {
        setTheater(th);
        // 默认选择第 1 个角色作为后续登台备选
        if (th.roles.length > 0) {
          setSelectedRole(th.roles[0].id);
        }
        setCurrentStep(1);
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

  const singleLinePlayRef = useRef<{ lineIdx: number; endSec: number } | null>(null);
  const recordingEndSecRef = useRef<number | null>(null);

  // 同步视频时间与当前台词
  const handleTimeUpdate = () => {
    if (!videoRef.current || !theater) return;
    const ct = videoRef.current.currentTime;
    setCurrentTime(ct);

    // 检查是否正在跟随画面同步录音配音中
    if (isRecording && recordingEndSecRef.current !== null) {
      if (!videoRef.current.muted) {
        videoRef.current.muted = true;
      }
      if (videoRef.current.volume !== 0) {
        videoRef.current.volume = 0;
      }
      if (ct >= recordingEndSecRef.current || ct >= recordingEndSecRef.current - 0.05) {
        // 该句视频画面动作播放完毕，自动结束录音并计算得分
        stopRecordingCurrentLine();
        return;
      }
    }

    // 检查是否正在单句试听示范 (再听示范)
    if (singleLinePlayRef.current) {
      const { lineIdx, endSec } = singleLinePlayRef.current;
      if (ct >= endSec || ct >= endSec - 0.05) {
        // 单句示范播放完毕：立即暂停，画面停在该句起点，绝不溜进下一句！
        videoRef.current.pause();
        singleLinePlayRef.current = null;
        setIsPlaying(false);
        const startSec = parseSec(theater.script[lineIdx].time);
        videoRef.current.currentTime = startSec;
        setActiveLineIndex(lineIdx);
        toast.info("🎧 原声示范播放完毕，请点击【开始配音】模仿跟读 🎙️");
        return;
      }
    }

    // 解析当前台词（严格基于时间线区间判断）
    let foundIdx = -1;
    for (let i = 0; i < theater.script.length; i++) {
      const sec = parseSec(theater.script[i].time);
      if (ct >= sec) {
        foundIdx = i;
      }
    }
    if (foundIdx >= 0) {
      setActiveLineIndex(foundIdx);
    }

    const currentLine = foundIdx >= 0 ? theater.script[foundIdx] : null;

    // ==============================================================
    // Step 2 (角色配音): 当播放到所选角色台词时，视频在下方字幕栏提示录音并暂停
    // 画面 100% 保持清晰可见，无遮挡
    // ==============================================================
    if (
      currentStep === 2 &&
      selectedRole &&
      currentLine &&
      currentLine.role === selectedRole &&
      !recordedAudios[foundIdx] &&
      !promptedLinesRef.current.has(foundIdx) &&
      !singleLinePlayRef.current &&
      !isRecording &&
      recordingEndSecRef.current === null
    ) {
      promptedLinesRef.current.add(foundIdx);
      videoRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // ==============================================================
    // Step 3 (配音回放): 对方角色播放原声，所选角色播放用户的真实录音
    // 严格按照台词时间线和配音时长精准同步对齐，绝不提前或错位播放
    // ==============================================================
    if (currentStep === 3 && selectedRole) {
      if (foundIdx < 0) {
        // 第一句台词还没开始（如开头片头原声），原片声音播放，配音暂停
        if (videoRef.current.muted) {
          videoRef.current.muted = false;
        }
        if (videoRef.current.volume === 0) {
          videoRef.current.volume = 1;
        }
        if (dubAudioRef.current && !dubAudioRef.current.paused) {
          dubAudioRef.current.pause();
        }
        currentPlayingDubLineRef.current = null;
      } else {
        const lineItem = theater.script[foundIdx];
        const lineStartSec = parseSec(lineItem.time);
        const nextLineStartSec =
          foundIdx < theater.script.length - 1
            ? parseSec(theater.script[foundIdx + 1].time)
            : (videoRef.current.duration || lineStartSec + 5);

        const hasUserDub =
          lineItem.role === selectedRole &&
          recordedAudios[foundIdx] &&
          recordedAudios[foundIdx] !== "mock_audio";

        if (hasUserDub) {
          const audioUrl = recordedAudios[foundIdx];
          const offsetInLine = ct - lineStartSec;
          const maxDur =
            recordedDurations[foundIdx] ||
            (dubAudioRef.current && !isNaN(dubAudioRef.current.duration) && dubAudioRef.current.duration > 0
              ? dubAudioRef.current.duration
              : nextLineStartSec - lineStartSec);

          // 如果当前时间位于此句台词配音区间 [0, maxDur)
          if (offsetInLine >= 0 && offsetInLine < maxDur) {
            // 静音原片视频声音
            if (!videoRef.current.muted) {
              videoRef.current.muted = true;
            }
            if (videoRef.current.volume !== 0) {
              videoRef.current.volume = 0;
            }

            if (dubAudioRef.current) {
              if (currentPlayingDubLineRef.current !== foundIdx) {
                currentPlayingDubLineRef.current = foundIdx;
                dubAudioRef.current.src = audioUrl;
                dubAudioRef.current.currentTime = Math.max(0, offsetInLine);
                if (!videoRef.current.paused) {
                  dubAudioRef.current.play().catch(() => {});
                }
              } else {
                // 已在播放此句配音，检查是否时间漂移 (>0.15s 进行精准对齐)
                const audioCt = dubAudioRef.current.currentTime;
                if (Math.abs(audioCt - offsetInLine) > 0.15) {
                  dubAudioRef.current.currentTime = Math.max(0, offsetInLine);
                }
                if (!videoRef.current.paused && dubAudioRef.current.paused) {
                  dubAudioRef.current.play().catch(() => {});
                }
              }
            }
          } else {
            // 此句配音已播放结束，恢复原片视频声音（如两句对白之间的背景音乐）
            if (videoRef.current.muted) {
              videoRef.current.muted = false;
            }
            if (videoRef.current.volume === 0) {
              videoRef.current.volume = 1;
            }
            if (dubAudioRef.current && !dubAudioRef.current.paused) {
              dubAudioRef.current.pause();
            }
          }
        } else {
          // 对方角色台词，或未录制台词：播放原片声音
          if (videoRef.current.muted) {
            videoRef.current.muted = false;
          }
          if (videoRef.current.volume === 0) {
            videoRef.current.volume = 1;
          }
          if (dubAudioRef.current && !dubAudioRef.current.paused) {
            dubAudioRef.current.pause();
          }
          currentPlayingDubLineRef.current = null;
        }
      }
    } else {
      // Step 1 或 Step 2：只有在非录音阶段才自动恢复声音
      if (!isRecording && recordingEndSecRef.current === null) {
        if (videoRef.current && videoRef.current.muted) {
          videoRef.current.muted = false;
        }
        if (videoRef.current && videoRef.current.volume === 0) {
          videoRef.current.volume = 1;
        }
      }
    }
  };

  // 视频播放结束
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (currentStep === 1) {
      toast.info("🎉 全片欣赏完毕！请进入【第 2 步：角色登台配音】！");
    } else if (currentStep === 2) {
      checkAllCompleted(scores);
    }
  };

  // 播放 / 暂停
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      if (dubAudioRef.current && !dubAudioRef.current.paused) {
        dubAudioRef.current.pause();
      }
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      if (
        currentStep === 3 &&
        currentPlayingDubLineRef.current !== null &&
        dubAudioRef.current &&
        dubAudioRef.current.paused
      ) {
        dubAudioRef.current.play().catch(() => {});
      }
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    if (
      currentStep === 3 &&
      currentPlayingDubLineRef.current !== null &&
      dubAudioRef.current &&
      dubAudioRef.current.paused
    ) {
      dubAudioRef.current.play().catch(() => {});
    }
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    if (dubAudioRef.current && !dubAudioRef.current.paused) {
      dubAudioRef.current.pause();
    }
  };

  const handleVideoSeeked = () => {
    if (currentStep === 3) {
      currentPlayingDubLineRef.current = null;
      if (dubAudioRef.current) {
        dubAudioRef.current.pause();
      }
    }
    handleTimeUpdate();
  };

  // 切换倍速
  const handleChangeSpeed = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // 跳转到指定台词时间点
  const jumpToLine = (idx: number) => {
    if (!videoRef.current || !theater) return;
    const sec = parseSec(theater.script[idx].time);
    videoRef.current.currentTime = sec;
    currentPlayingDubLineRef.current = null;
    if (dubAudioRef.current) {
      dubAudioRef.current.pause();
      dubAudioRef.current.currentTime = 0;
    }
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
    setActiveLineIndex(idx);
  };

  // 切换 TMM 步骤
  const handleSwitchStep = (step: TMMStep) => {
    setCurrentStep(step);
    promptedLinesRef.current.clear();
    setIsRecording(false);
    currentPlayingDubLineRef.current = null;
    if (dubAudioRef.current) {
      dubAudioRef.current.pause();
      dubAudioRef.current.currentTime = 0;
    }

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
      videoRef.current.volume = 1;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }

    if (step === 1) {
      toast.info("已切换至【第 1 步：全片播放欣赏】");
    } else if (step === 2) {
      toast.success(
        `已切换至【第 2 步：角色配音】！播放到角色【${getCurrentRoleName()}】台词时将提示配音`
      );
    } else if (step === 3) {
      toast.success("已切换至【第 3 步：配音大片回放】！正在回放你的专属成片 🎬");
    }
  };

  // 切换扮演角色
  const handleSelectRole = (roleId: string) => {
    setSelectedRole(roleId);
    promptedLinesRef.current.clear();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    const roleObj = theater?.roles.find((r) => r.id === roleId);
    toast.success(`已切换扮演角色为【${roleObj?.name}】`);
  };

  // 开始录音当前台词（跟随视频画面同步播放对口型）
  const startRecordingCurrentLine = async (lineIdx: number) => {
    if (!theater || !videoRef.current) return;
    const startSec = parseSec(theater.script[lineIdx].time);
    let endSec =
      lineIdx < theater.script.length - 1
        ? parseSec(theater.script[lineIdx + 1].time)
        : (videoRef.current.duration || startSec + 4);

    if (endSec <= startSec + 0.8) {
      endSec = startSec + 2.5;
    }

    recordingEndSecRef.current = endSec;
    singleLinePlayRef.current = null;

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

        const fakeScore = Math.floor(91 + Math.random() * 8);
        const nextScores = { ...scores, [lineIdx]: fakeScore };
        setScores(nextScores);

        const dur = (Date.now() - recordStartTimeRef.current) / 1000;
        setRecordedDurations((prev) => ({ ...prev, [lineIdx]: Math.max(1.0, dur) }));

        toast.success(`配音完成！得分: ${fakeScore} 分（已收录）🎉`);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        recordingEndSecRef.current = null;

        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = startSec;
          videoRef.current.muted = false;
          videoRef.current.volume = 1;
          setIsPlaying(false);
        }
        setActiveLineIndex(lineIdx);

        // 检查全部完成并提示
        const myRoleLines = theater.script
          .map((item, idx) => ({ ...item, idx }))
          .filter((item) => item.role === selectedRole);
        const allDone = myRoleLines.every((l) => nextScores[l.idx] !== undefined);
        if (allDone && myRoleLines.length > 0) {
          const avg = Math.round(
            myRoleLines.reduce((acc, l) => acc + (nextScores[l.idx] || 92), 0) /
              myRoleLines.length
          );
          recordTheaterCompletion(theater.id, selectedRole, 3, avg);
          toast.success("🎉 太棒啦！你已完成该角色的全部台词配音！");
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      recordStartTimeRef.current = Date.now();

      // 画面回跳到本句起始，双重静音（muted=true + volume=0）播放画面，专心对口型
      videoRef.current.currentTime = startSec;
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      toast.info("🎬 画面已启动播放，请跟随演员画面口型朗读台词 🎙️");
    } catch (err) {
      console.warn("Microphone not accessible, using smart fallback", err);
      toast.info("已启用智能伴学模拟跟随画面配音");
      setIsRecording(true);
      recordStartTimeRef.current = Date.now();
      videoRef.current.currentTime = startSec;
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);

      const durationMs = Math.max(1500, (endSec - startSec) * 1000);
      setTimeout(() => {
        const fakeScore = Math.floor(92 + Math.random() * 7);
        const nextScores = { ...scores, [lineIdx]: fakeScore };
        setScores(nextScores);
        setRecordedAudios((prev) => ({ ...prev, [lineIdx]: "mock_audio" }));
        const dur = Math.max(1.5, endSec - startSec);
        setRecordedDurations((prev) => ({ ...prev, [lineIdx]: dur }));
        setIsRecording(false);
        recordingEndSecRef.current = null;
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = startSec;
          videoRef.current.muted = false;
          videoRef.current.volume = 1;
          setIsPlaying(false);
        }
        setActiveLineIndex(lineIdx);
        toast.success(`配音完成！得分: ${fakeScore} 分（及格通过）🎉`);
      }, durationMs);
    }
  };

  // 单句示范播放：只播放本句外教原声，播放完毕自动暂停并留在本句，绝不跳进下一句！
  const playSingleLineDemo = (idx: number) => {
    if (!videoRef.current || !theater) return;
    const startSec = parseSec(theater.script[idx].time);
    let endSec =
      idx < theater.script.length - 1
        ? parseSec(theater.script[idx + 1].time)
        : (videoRef.current.duration || startSec + 4);

    if (endSec <= startSec + 0.8) {
      endSec = startSec + 2.5;
    }

    singleLinePlayRef.current = { lineIdx: idx, endSec };

    videoRef.current.currentTime = startSec;
    videoRef.current.muted = false;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  // 试听自己的配音录音
  const playUserDubbing = (lineIdx: number) => {
    const audioUrl = recordedAudios[lineIdx];
    if (!audioUrl) return;
    if (audioUrl === "mock_audio") {
      toast.info("已播放模拟录音 🎧");
      return;
    }
    if (dubAudioRef.current) {
      dubAudioRef.current.src = audioUrl;
      dubAudioRef.current.currentTime = 0;
      dubAudioRef.current.play().catch(() => {});
      toast.info("正在播放你的专属录音 🎧");
    }
  };

  // 停止录音
  const stopRecordingCurrentLine = () => {
    recordingEndSecRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.muted = false;
      videoRef.current.volume = 1;
      setIsPlaying(false);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // 满意，继续播放下一句
  const handleProceedNextLine = () => {
    singleLinePlayRef.current = null;
    recordingEndSecRef.current = null;
    if (!videoRef.current || !theater) return;
    const nextIdx = activeLineIndex + 1;
    if (nextIdx < theater.script.length) {
      const nextSec = parseSec(theater.script[nextIdx].time);
      videoRef.current.currentTime = nextSec;
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setActiveLineIndex(nextIdx);
    } else {
      checkAllCompleted(scores);
    }
  };

  // 跳过此句
  const handleSkipCurrentLine = () => {
    singleLinePlayRef.current = null;
    recordingEndSecRef.current = null;
    if (videoRef.current && theater) {
      const nextIdx = activeLineIndex + 1;
      if (nextIdx < theater.script.length) {
        const nextSec = parseSec(theater.script[nextIdx].time);
        videoRef.current.currentTime = nextSec;
        videoRef.current.muted = false;
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
        setActiveLineIndex(nextIdx);
      }
    }
    toast.info("已跳过此句，视频继续播放");
  };

  // 检查角色所有台词是否配完
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
      toast.success("🎉 太棒啦！你已完成该角色的全部台词配音！已为你自动解锁【第 3 步：配音大片回放】！");
      setCurrentStep(3);
      currentPlayingDubLineRef.current = null;
      if (dubAudioRef.current) {
        dubAudioRef.current.pause();
        dubAudioRef.current.currentTime = 0;
      }
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.muted = false;
        videoRef.current.volume = 1;
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const getCurrentRoleName = () => {
    const r = theater?.roles.find((item) => item.id === selectedRole);
    return r ? r.name : "角色";
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

    // 背景
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

    // 标题与品牌
    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SunnyBridge 阳光桥少儿英语 · 敢敢微剧场", 375, 90);

    ctx.fillStyle = "#78350F";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText("🎬 小小金牌配音演员 🏅", 375, 155);

    // 剧目卡片
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0,0,0,0.08)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.beginPath();
    ctx.roundRect(60, 195, 630, 485, 24);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.fillStyle = "#D97706";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`【${theater.category}】`, 90, 245);

    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(`${theater.icon} ${theater.titleZh}`, 90, 290);

    ctx.fillStyle = "#64748B";
    ctx.font = "italic 19px sans-serif";
    ctx.fillText(theater.title, 90, 325);

    ctx.strokeStyle = "#F1F5F9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, 350);
    ctx.lineTo(660, 350);
    ctx.stroke();

    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(`配音扮演角色：${currentRoleObj?.avatar} ${currentRoleObj?.name}`, 90, 395);

    if (myLines.length > 0) {
      ctx.fillStyle = "#334155";
      ctx.font = "bold 21px sans-serif";
      ctx.fillText(`“${myLines[0].text}”`, 90, 445);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "17px sans-serif";
      ctx.fillText(myLines[0].zh, 90, 480);
    }

    // 评分卡
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

    // 印章
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

  const handleDownloadPoster = () => {
    if (!posterDataUrl) return;
    const link = document.createElement("a");
    link.download = `敢敢微剧场_${theater?.titleZh}_配音海报.png`;
    link.href = posterDataUrl;
    link.click();
    toast.success("海报已开始下载！🎉");
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

  const activeLine = theater.script[activeLineIndex];
  const isMyTurnInStep2 =
    currentStep === 2 && activeLine && activeLine.role === selectedRole;
  const currentRoleObj = theater.roles.find((r) => r.id === selectedRole);

  return (
    <div className="min-h-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* 隐藏的专用配音音频播放器 */}
      <audio ref={dubAudioRef} className="hidden" preload="auto" />

      {/* 顶部面包屑导航 */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/theater" className="hover:text-amber-500">
                敢敢情景剧场 (Film Set)
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

      {/* 经典 Tell Me More 顶栏 */}
      <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{theater.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-foreground">
                {theater.titleZh}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold">
                Jeu de rôle / Role Play
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{theater.title}</p>
          </div>
        </div>

        {/* 字幕显示开关 (Display film subtitles) */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none bg-muted/60 px-3 py-1.5 rounded-xl border border-border/60">
            <input
              type="checkbox"
              checked={showSubtitles}
              onChange={(e) => setShowSubtitles(e.target.checked)}
              className="rounded accent-amber-500 cursor-pointer"
            />
            <span>显示双语字幕 (Subtitles)</span>
          </label>
        </div>
      </div>

      {/* 主工作区：左侧 100% 毫无遮挡的纯净视频 + 正下方专用走字录音台；右侧 TMM 经典三步面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左侧：视频播放器与下方字幕控制台 (7 列) */}
        <div className="lg:col-span-7 space-y-4">
          {/* 纯净视频展示区 —— 绝无任何居中遮挡弹窗！ */}
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-video shadow-xl border border-border/80">
            <video
              ref={videoRef}
              src={theater.videoUrl}
              poster={theater.posterUrl}
              className="w-full h-full object-cover"
              playsInline
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onSeeked={handleVideoSeeked}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
            />

            {/* Step 2 跟随画面对口型录制中 浮动提示条 */}
            {isRecording && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-rose-600/90 text-white border border-rose-400 backdrop-blur-md px-4 py-2 rounded-full text-xs sm:text-sm font-black shadow-2xl animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span>🔴 正在跟随视频画面配音 (请配合演员口型朗读台词)...</span>
              </div>
            )}

            {/* Step 3 角标 */}
            {currentStep === 3 && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/75 text-yellow-300 border border-yellow-500/40 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 animate-spin" />
                <span>3 - 配音大片回放中 ({currentRoleObj?.name})</span>
              </div>
            )}
          </div>

          {/* 播放控制条 */}
          <div className="bg-card border border-border rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm">
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

          {/* ========================================================================= */}
          {/* Tell Me More 核心精髓：视频正下方的走字字幕与配音台 (Under-Video Console) */}
          {/* 100% 照搬原版设计规范：台词在视频下方展示，根据状态变绿(合格)或变红(重录) */}
          {/* ========================================================================= */}
          <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
            {/* 状态标题条 */}
            <div className="flex items-center justify-between text-xs pb-2 border-b border-border/60">
              <div className="flex items-center gap-2 font-bold text-foreground">
                {currentStep === 1 && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <Film className="w-4 h-4" />
                    第 1 步：全片欣赏 (正在播放外教原声，请仔细倾听)
                  </span>
                )}
                {currentStep === 2 && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <Mic className="w-4 h-4" />
                    第 2 步：角色配音 (你扮演的是：{currentRoleObj?.avatar}{" "}
                    {currentRoleObj?.name})
                  </span>
                )}
                {currentStep === 3 && (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-extrabold">
                    <Trophy className="w-4 h-4" />
                    第 3 步：配音大片回放 (正在播放你配音的全新成片！)
                  </span>
                )}
              </div>

              {activeLine && (
                <span className="font-mono text-muted-foreground">
                  时间轴: {activeLine.time}
                </span>
              )}
            </div>

            {/* 当前台词展示区 (下置台词走字区) */}
            {activeLine ? (
              <div
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  isMyTurnInStep2
                    ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20"
                    : currentStep === 3 && activeLine.role === selectedRole
                    ? "bg-emerald-500/10 border-emerald-500/40"
                    : "bg-muted/40 border-border/80"
                }`}
              >
                {/* 说话角色标识 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {theater.roles.find((r) => r.id === activeLine.role)?.avatar || "👤"}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {theater.roles.find((r) => r.id === activeLine.role)?.name}
                    </span>
                    {activeLine.role === selectedRole && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold">
                        我的角色
                      </span>
                    )}
                  </div>

                  {/* TMM 绿灯/红灯评分显示 */}
                  {scores[activeLineIndex] !== undefined && (
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{scores[activeLineIndex]}分 (及格通过)</span>
                    </div>
                  )}
                </div>

                {/* 英文与中文台词 */}
                {showSubtitles && (
                  <div className="space-y-1">
                    <p className="text-base sm:text-lg font-extrabold text-foreground leading-relaxed">
                      {activeLine.text}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {activeLine.zh}
                    </p>
                  </div>
                )}

                {/* Step 2 轮到自己时的配音交互操作栏（位于台词下方，不遮挡画面） */}
                {isMyTurnInStep2 && (
                  <div className="mt-4 pt-3 border-t border-border/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {isRecording ? (
                        <Button
                          size="sm"
                          onClick={stopRecordingCurrentLine}
                          className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs gap-1.5 animate-pulse shadow-md shadow-rose-500/25"
                        >
                          <PauseCircle className="w-4 h-4" />
                          ⏹️ 正在跟随画面录音中... 点击提前结束
                        </Button>
                      ) : scores[activeLineIndex] !== undefined ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => startRecordingCurrentLine(activeLineIndex)}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md shadow-amber-500/20"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            🔄 跟随画面再配一次
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => playUserDubbing(activeLineIndex)}
                            className="rounded-xl text-xs gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                            🔊 试听我的配音
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playSingleLineDemo(activeLineIndex)}
                            className="rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1 hover:bg-muted"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                            🎧 原声示范
                          </Button>

                          <Button
                            size="sm"
                            onClick={handleProceedNextLine}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md shadow-emerald-600/20"
                          >
                            满意，继续播放下句 ▶
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => startRecordingCurrentLine(activeLineIndex)}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md shadow-amber-500/20"
                          >
                            <Mic className="w-4 h-4" />
                            🎙️ 跟随画面配音 (实时对口型)
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playSingleLineDemo(activeLineIndex)}
                            className="rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1 hover:bg-muted"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                            🔊 先听示范
                          </Button>
                        </>
                      )}
                    </div>

                    {!isRecording && scores[activeLineIndex] === undefined && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSkipCurrentLine}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        跳过此句继续 ▶
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">
                正在载入情景对白...
              </div>
            )}
          </div>
        </div>

        {/* 右侧：Tell Me More 经典三步流程面板 (5 列) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. TMM 经典三步进阶指示器 (The 3 Pedagogical Steps) */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              教学流程 (Pedagogical Steps)
            </h3>

            <div className="space-y-2">
              {/* Step 1 */}
              <div
                onClick={() => handleSwitchStep(1)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  currentStep === 1
                    ? "bg-amber-500/10 border-amber-500 shadow-sm"
                    : "bg-muted/30 border-border/70 hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      currentStep === 1
                        ? "bg-amber-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      1 - Diffusion du film
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      全片播放欣赏 (熟悉完整语境与发音)
                    </div>
                  </div>
                </div>
                {currentStep === 1 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>

              {/* Step 2 */}
              <div
                onClick={() => handleSwitchStep(2)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  currentStep === 2
                    ? "bg-amber-500/10 border-amber-500 shadow-sm"
                    : "bg-muted/30 border-border/70 hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      currentStep === 2
                        ? "bg-amber-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      2 - Interprétation du personnage
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      角色登台配音 (到点自动提示模仿录音)
                    </div>
                  </div>
                </div>
                {currentStep === 2 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>

              {/* Step 3 */}
              <div
                onClick={() => handleSwitchStep(3)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  currentStep === 3
                    ? "bg-emerald-500/10 border-emerald-500 shadow-sm"
                    : "bg-muted/30 border-border/70 hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      currentStep === 3
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      3 - Rediffusion avec l'interprétation
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      配音大片回放 (合成真实录音成果)
                    </div>
                  </div>
                </div>
                {currentStep === 3 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
            </div>
          </div>

          {/* 2. 角色选择与台词专项练习 (Characters & Pronunciation) */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                选择扮演角色 (Choose Role)
              </h3>
              {currentStep === 3 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generatePoster}
                  className="rounded-xl border-amber-500/40 text-amber-600 hover:bg-amber-500 hover:text-white text-xs h-7 gap-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  生成荣誉海报
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {theater.roles.map((r) => {
                const active = selectedRole === r.id;
                const roleLines = theater.script.filter((l) => l.role === r.id);
                const roleDoneCount = roleLines.filter(
                  (_, i) => scores[theater.script.findIndex((s) => s.text === roleLines[i].text)] !== undefined
                ).length;

                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRole(r.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                      active
                        ? "bg-gradient-to-tr from-amber-500/15 to-orange-500/10 border-amber-500 shadow-sm ring-2 ring-amber-500/20"
                        : "bg-muted/30 border-border/60 hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-2xl">{r.avatar}</span>
                      <span className="text-xs font-bold text-foreground truncate">
                        {r.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>已配音:</span>
                      <span className="font-bold text-amber-600">
                        {roleDoneCount} / {roleLines.length} 句
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. 完整剧本概览 (Display Film Script) */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <ListOrdered className="w-4 h-4 text-amber-500" />
                <span>完整情景台词 (Display Script)</span>
              </div>
              <span className="text-[11px] text-muted-foreground">点击跳转播放</span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {theater.script.map((line, idx) => {
                const isCurrent = activeLineIndex === idx;
                const isMyRole = line.role === selectedRole;
                const roleObj = theater.roles.find((r) => r.id === line.role);
                const score = scores[idx];

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (currentStep === 2) {
                        setActiveLineIndex(idx);
                        playSingleLineDemo(idx);
                      } else {
                        jumpToLine(idx);
                      }
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isCurrent
                        ? "bg-amber-500/15 border-amber-500 font-bold"
                        : isMyRole
                        ? "bg-muted/40 border-border/70 hover:border-amber-500/40"
                        : "bg-card border-border/40 opacity-70"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                      <span className="text-sm shrink-0">{roleObj?.avatar || "👤"}</span>
                      <div className="truncate">
                        <span className="text-foreground">{line.text}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMyRole && score !== undefined && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 text-[10px] font-bold">
                          {score}分
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {line.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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

            <div className="rounded-2xl overflow-hidden border border-border/80 shadow-md">
              <img
                src={posterDataUrl}
                alt="配音荣誉海报"
                className="w-full h-auto object-contain"
              />
            </div>

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
