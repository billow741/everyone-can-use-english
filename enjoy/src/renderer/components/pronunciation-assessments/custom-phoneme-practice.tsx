import React, { useState, useEffect, useRef, useContext } from "react";
import {
  MicIcon,
  SquareIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  SparklesIcon,
  CheckCircle2Icon,
  Volume2Icon,
  FlameIcon,
  AwardIcon,
  PlusIcon,
  SlidersIcon,
  SendIcon,
  BookOpenIcon,
  ZapIcon,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Progress,
} from "@renderer/components/ui";
import { useAudioRecorder } from "react-audio-voice-recorder";
import { LiveAudioVisualizer } from "react-audio-visualize";
import { usePronunciationAssessments } from "@renderer/hooks";
import { AppSettingsProviderContext } from "@renderer/context";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { playPhonemeSound, hasPhonemeAudio } from "@renderer/lib/phoneme-data";
import { toast } from "sonner";

export interface CustomBlendItem {
  id: string;
  sound: string;
  label: string;
  ipa: string;
  category: string;
  sampleWord: string;
  words: { word: string; ipa: string; translation: string }[];
  tip: string;
}

// 常见高频高难辅音连缀与复合发音预设
export const PRESET_BLENDS: CustomBlendItem[] = [
  {
    id: "tr",
    sound: "tr",
    label: "tr 卷舌破擦",
    ipa: "/tr/",
    category: "破擦连缀",
    sampleWord: "tree",
    words: [
      { word: "tree", ipa: "/triː/", translation: "树木" },
      { word: "train", ipa: "/treɪn/", translation: "火车" },
      { word: "trip", ipa: "/trɪp/", translation: "旅行" },
      { word: "truck", ipa: "/trʌk/", translation: "卡车" },
    ],
    tip: "双唇略微向前突出并收圆，舌尖翘起抵在上齿龈后部，发/t/的同时舌身迅速后缩发/r/，类似汉字'戳'但声带绝不振动！",
  },
  {
    id: "dr",
    sound: "dr",
    label: "dr 卷舌浊破擦",
    ipa: "/dr/",
    category: "破擦连缀",
    sampleWord: "drive",
    words: [
      { word: "drive", ipa: "/draɪv/", translation: "驾驶" },
      { word: "drum", ipa: "/drʌm/", translation: "鼓" },
      { word: "draw", ipa: "/drɔː/", translation: "画画" },
      { word: "dream", ipa: "/driːm/", translation: "梦想" },
    ],
    tip: "发音部位完全同/tr/，但声带必须剧烈振动，双唇收圆微突出，类似汉字'捉'，气流浑厚连贯！",
  },
  {
    id: "ts",
    sound: "ts",
    label: "ts 舌尖塞擦",
    ipa: "/ts/",
    category: "塞擦连缀",
    sampleWord: "cats",
    words: [
      { word: "cats", ipa: "/kæts/", translation: "猫咪复数" },
      { word: "hats", ipa: "/hæts/", translation: "帽子复数" },
      { word: "kites", ipa: "/kaɪts/", translation: "风筝复数" },
      { word: "boats", ipa: "/bəʊts/", translation: "小船复数" },
    ],
    tip: "舌尖贴住上齿龈阻挡气流，然后舌尖微开一条窄缝，气流瞬间爆破摩擦而出，类似汉字'次'，常用于名词复数与动词三单！",
  },
  {
    id: "dz",
    sound: "dz",
    label: "dz 齿龈浊塞擦",
    ipa: "/dz/",
    category: "塞擦连缀",
    sampleWord: "birds",
    words: [
      { word: "birds", ipa: "/bɜːdz/", translation: "小鸟复数" },
      { word: "beds", ipa: "/bedz/", translation: "床铺复数" },
      { word: "hands", ipa: "/hændz/", translation: "双手" },
      { word: "cards", ipa: "/kɑːdz/", translation: "卡片复数" },
    ],
    tip: "发音动作同/ts/，但声带强烈振动发麻，类似汉字'自'，同样是英语中极高频的复数与词尾形态！",
  },
  {
    id: "th_unvoiced",
    sound: "th",
    label: "th 咬舌清辅音",
    ipa: "/θ/",
    category: "齿间摩擦",
    sampleWord: "think",
    words: [
      { word: "think", ipa: "/θɪŋk/", translation: "思考" },
      { word: "three", ipa: "/θriː/", translation: "数字三" },
      { word: "thank", ipa: "/θæŋk/", translation: "感谢" },
      { word: "mouth", ipa: "/maʊθ/", translation: "嘴巴" },
    ],
    tip: "上下门牙轻咬住舌尖面，轻柔送气吹出沙沙声，喉咙声带不振动。切勿用 /s/ 或 /f/ 替代！",
  },
  {
    id: "th_voiced",
    sound: "th",
    label: "th 咬舌浊辅音",
    ipa: "/ð/",
    category: "齿间摩擦",
    sampleWord: "this",
    words: [
      { word: "this", ipa: "/ðɪs/", translation: "这个" },
      { word: "that", ipa: "/ðæt/", translation: "那个" },
      { word: "mother", ipa: "/ˈmʌðə/", translation: "妈妈" },
      { word: "brother", ipa: "/ˈbrʌðə/", translation: "兄弟" },
    ],
    tip: "舌尖同样轻置于上下齿之间，送气同时喉咙声带剧烈振动，舌尖能感受到明显的酥麻感！",
  },
  {
    id: "ch",
    sound: "ch",
    label: "ch 破擦清辅音",
    ipa: "/tʃ/",
    category: "破擦音",
    sampleWord: "chair",
    words: [
      { word: "chair", ipa: "/tʃeə/", translation: "椅子" },
      { word: "cheese", ipa: "/tʃiːz/", translation: "奶酪" },
      { word: "watch", ipa: "/wɒtʃ/", translation: "手表" },
      { word: "beach", ipa: "/biːtʃ/", translation: "海滩" },
    ],
    tip: "舌尖抵住上齿龈后部，双唇略微前凸像喇叭，气流冲开阻碍瞬间爆破摩擦而出，类似汉字'吃'！",
  },
  {
    id: "sh",
    sound: "sh",
    label: "sh 摩擦清辅音",
    ipa: "/ʃ/",
    category: "摩擦音",
    sampleWord: "ship",
    words: [
      { word: "ship", ipa: "/ʃɪp/", translation: "轮船" },
      { word: "sheep", ipa: "/ʃiːp/", translation: "绵羊" },
      { word: "shoe", ipa: "/ʃuː/", translation: "鞋子" },
      { word: "fish", ipa: "/fɪʃ/", translation: "鱼" },
    ],
    tip: "双唇向前收圆突出，上下齿微闭，气流在舌面与硬腭之间摩擦发声，发出提示安静的'嘘'声！",
  },
  {
    id: "str",
    sound: "str",
    label: "str 三重辅音连缀",
    ipa: "/str/",
    category: "复合连缀",
    sampleWord: "street",
    words: [
      { word: "street", ipa: "/striːt/", translation: "街道" },
      { word: "strong", ipa: "/strɒŋ/", translation: "强壮" },
      { word: "stream", ipa: "/striːm/", translation: "小溪" },
      { word: "straight", ipa: "/streɪt/", translation: "笔直" },
    ],
    tip: "以/s/起音，紧接着极其紧凑地过渡到/tr/，三个辅音一气呵成连贯喷出，中间绝不插入任何元音！",
  },
];

interface CustomPhonemePracticeProps {
  className?: string;
  defaultSound?: string;
}

export const CustomPhonemePractice: React.FC<CustomPhonemePracticeProps> = ({
  className = "",
  defaultSound = "tr",
}) => {
  const { EnjoyApp, learningLanguage } = useContext(AppSettingsProviderContext);
  const { createAssessment } = usePronunciationAssessments();

  // 状态管理
  const [selectedPreset, setSelectedPreset] = useState<CustomBlendItem>(() => {
    return PRESET_BLENDS.find((b) => b.sound === defaultSound) || PRESET_BLENDS[0];
  });
  const [customInputText, setCustomInputText] = useState("");
  const [activeTargetWord, setActiveTargetWord] = useState<string>(selectedPreset.sampleWord);
  const [activeIpa, setActiveIpa] = useState<string>(selectedPreset.ipa);
  const [activeTip, setActiveTip] = useState<string>(selectedPreset.tip);

  // 录音与评测状态
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlayingModel, setIsPlayingModel] = useState<boolean>(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<any | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 录音器
  const recorder = useAudioRecorder(
    {
      noiseSuppression: true,
      echoCancellation: true,
    },
    (err) => console.warn("Custom AudioRecorder Error:", err)
  );

  const { startRecording, stopRecording, recordingBlob, isRecording, recordingTime, mediaRecorder } =
    recorder;

  useEffect(() => {
    if (recordingBlob) {
      const url = URL.createObjectURL(recordingBlob);
      setRecordedUrl(url);
      setAssessmentResult(null);
    }
  }, [recordingBlob]);

  // 选择预设连音
  const handleSelectPreset = (preset: CustomBlendItem) => {
    if (isRecording) stopRecording();
    resetAudioState();
    setSelectedPreset(preset);
    setActiveTargetWord(preset.sampleWord);
    setActiveIpa(preset.ipa);
    setActiveTip(preset.tip);
  };

  // 切换目标词（从预设词族中选择）
  const handleSelectWord = (wordObj: { word: string; ipa: string; translation: string }) => {
    if (isRecording) stopRecording();
    resetAudioState();
    setActiveTargetWord(wordObj.word);
    setActiveIpa(wordObj.ipa);
  };

  // 提交自定义输入（如输入 tr, train, through, splash）
  const handleApplyCustomInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customInputText.trim();
    if (!trimmed) {
      toast.info("请输入想要挑战的连音或单词，如 tr, dr, tree, thank 等");
      return;
    }

    if (isRecording) stopRecording();
    resetAudioState();

    // 检查是否匹配已有预设
    const match = PRESET_BLENDS.find(
      (b) => b.sound.toLowerCase() === trimmed.toLowerCase() || b.sampleWord.toLowerCase() === trimmed.toLowerCase()
    );

    if (match) {
      setSelectedPreset(match);
      setActiveTargetWord(trimmed);
      setActiveIpa(match.ipa);
      setActiveTip(match.tip);
    } else {
      setActiveTargetWord(trimmed);
      setActiveIpa(`/${trimmed}/`);
      setActiveTip(`自定义发音目标：练习输入内容「${trimmed}」，注意咬字清晰，气流自然充沛。`);
    }

    toast.success(`🎯 已加载自定义发音目标：${trimmed}`);
    setCustomInputText("");
  };

  const resetAudioState = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingRecorded(false);
    }
    setRecordedUrl(null);
    setAssessmentResult(null);
  };

  // 播放标准示范发音 (严禁对音标/音素朗读字母名称音如 T-H, S-H, C-H)
  const handlePlayModel = async (wordToPlay = activeTargetWord) => {
    if (isPlayingModel) return;
    setIsPlayingModel(true);
    try {
      const cleanIpa = activeIpa.replace(/[\/\[\]ˈˌ]/g, "").trim();
      const cleanWord = (wordToPlay || "").replace(/[\/\[\]ˈˌ]/g, "").trim().toLowerCase();

      // 1. 如果当前目标是标准音素或具有原声 MP3 录音 (如 /θ/, /ð/, /ʃ/, /tʃ/, th, sh, ch, ng 等)
      // 必须播放原厂真人发音器官录制的纯正音素，严禁使用 TTS 拼读字母音！
      if (hasPhonemeAudio(cleanIpa)) {
        await playPhonemeSound(cleanIpa);
      } else if (hasPhonemeAudio(cleanWord)) {
        await playPhonemeSound(cleanWord);
      } else if (["tr", "dr", "ts", "dz", "str", "sk", "st", "sp"].includes(cleanWord)) {
        // 辅音连缀 (如 tr, dr, ts, dz)，由于 TTS 直接读双辅音字母会拼出 "T-R" / "D-R" 的字母名音，
        // 自动提取其核心代表词进行标准连缀连读示范
        const demoWord = selectedPreset.sampleWord || "tree";
        toast.info(`正在示范连音 [${cleanWord}] 在核心例词【${demoWord}】中的标准连读`, { duration: 2500 });
        await playStandardTts(demoWord, { rate: playbackSpeed === 1.0 ? "-5%" : "-25%" });
      } else {
        // 普通单词或自定义输入词 (如 think, three, train, apple 等)
        await playStandardTts(wordToPlay, { rate: playbackSpeed === 1.0 ? "-5%" : "-25%" });
      }
    } catch (e) {
      console.warn("TTS Error:", e);
    } finally {
      setIsPlayingModel(false);
    }
  };

  // 播放录音
  const handleTogglePlayRecorded = () => {
    if (!recordedUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(recordedUrl);
      audioRef.current.onended = () => setIsPlayingRecorded(false);
      audioRef.current.onerror = () => setIsPlayingRecorded(false);
    }

    if (isPlayingRecorded) {
      audioRef.current.pause();
      setIsPlayingRecorded(false);
    } else {
      audioRef.current.src = recordedUrl;
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .then(() => setIsPlayingRecorded(true))
        .catch(() => setIsPlayingRecorded(false));
    }
  };

  // 提交 AI 评测
  const handleSubmitAssessment = async () => {
    if (!recordingBlob || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const blobUrl = recordedUrl || URL.createObjectURL(recordingBlob);
      let rec: any = null;

      try {
        rec = await EnjoyApp?.recordings?.create({
          language: learningLanguage || "en-US",
          referenceText: activeTargetWord,
          src: blobUrl,
          blob: {
            type: recordingBlob.type || "audio/webm",
          },
        });
      } catch (dbErr) {
        console.warn("Local DB recording save fallback:", dbErr);
      }

      if (!rec) {
        rec = {
          id: `rec-custom-${Date.now()}`,
          language: learningLanguage || "en-US",
          referenceText: activeTargetWord,
          src: blobUrl,
          duration: recordingTime * 1000 || 3000,
        };
      }
      rec._rawBlob = recordingBlob;
      rec.src = blobUrl;

      const created = await createAssessment({
        language: learningLanguage || "en-US",
        reference: activeTargetWord,
        recording: rec,
      });

      setAssessmentResult(created);
      toast.success("🎉 AI 评测已完成！查看多维发音表现与诊断报告！");
    } catch (err: any) {
      console.error("Custom assessment failed:", err);
      toast.error("评测引擎未响应，请检查麦克风权限或稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const score = assessmentResult?.pronunciationScore || 0;
  const isHighScore = score >= 85;
  const isMidScore = score >= 70 && score < 85;

  return (
    <Card className={`rounded-3xl border-border bg-card shadow-sm overflow-hidden ${className}`}>
      {/* 头部：标题与自定义输入表单 */}
      <CardHeader className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 pb-4 border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
              <span className="size-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm shadow-md shadow-blue-500/20">
                🎯
              </span>
              <span>自定义发音与辅音连缀特训工坊 · DIY Blend Studio</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              不仅限于 39 单音标！自由输入任意高难连缀（如 <strong className="text-foreground">tr, dr, ts, dz, str, th</strong>）或自定义单词，全流程跟读纠音
            </p>
          </div>

          {/* 自由输入框表单 */}
          <form
            onSubmit={handleApplyCustomInput}
            className="flex items-center gap-2 shrink-0 w-full sm:w-auto"
          >
            <div className="relative flex-1 sm:w-64">
              <Input
                value={customInputText}
                onChange={(e) => setCustomInputText(e.target.value)}
                placeholder="输入任意发音/词 (如 tr, train...)"
                className="h-9 text-xs rounded-xl pr-8 bg-background/80 border-border/80 focus:border-blue-500"
              />
              {customInputText && (
                <button
                  type="button"
                  onClick={() => setCustomInputText("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ×
                </button>
              )}
            </div>

            <Button
              type="submit"
              size="sm"
              className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <SendIcon className="size-3" />
              <span>载入特训</span>
            </Button>
          </form>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* 1. 快捷高频攻坚连音预设 Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-bold flex items-center gap-1.5 text-foreground">
              <ZapIcon className="size-3.5 text-amber-500" />
              <span>攻坚预设：高频难点连音与复合辅音</span>
            </span>
            <span className="text-[11px]">点击即可快速载入对应发音技巧与代表词族</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {PRESET_BLENDS.map((blend) => {
              const isSelected = selectedPreset.id === blend.id && activeTargetWord === blend.sampleWord;
              return (
                <button
                  key={blend.id}
                  type="button"
                  onClick={() => handleSelectPreset(blend)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105"
                      : "bg-muted/60 hover:bg-muted text-foreground border border-border"
                  }`}
                >
                  <span>{blend.label}</span>
                  <span className={`text-[10px] ${isSelected ? "text-blue-100" : "text-muted-foreground font-normal"}`}>
                    {blend.ipa}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 当前特训目标卡片 + 对应词族快捷切换 */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="size-12 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center font-mono font-black text-xl text-blue-600 dark:text-blue-400">
                {activeTargetWord}
              </div>
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>当前特训目标</span>
                  <Badge variant="outline" className="font-mono text-[10px] border-blue-500/30 text-blue-600 dark:text-blue-400">
                    {activeIpa}
                  </Badge>
                </div>
                <div className="text-sm font-black text-foreground mt-0.5">
                  目标单词 / 音素：<span className="font-mono text-base">{activeTargetWord}</span>
                </div>
              </div>
            </div>

            {/* 连音发音技巧提示 */}
            <div className="text-xs text-muted-foreground leading-relaxed bg-background/60 p-2.5 rounded-xl border border-border/60 max-w-2xl">
              <span className="font-bold text-amber-600 dark:text-amber-400 mr-1">💡 发音秘籍:</span>
              {activeTip}
            </div>
          </div>

          {/* 预设相关联词族选择 */}
          {selectedPreset.words && selectedPreset.words.length > 0 && (
            <div className="shrink-0 space-y-1">
              <div className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                <span>特训目标切换（单音/高频例词）：</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 1. 纯正单音/连音专用药丸 */}
                <button
                  type="button"
                  onClick={() => {
                    if (isRecording) stopRecording();
                    resetAudioState();
                    setActiveTargetWord(selectedPreset.sound);
                    setActiveIpa(selectedPreset.ipa);
                    setActiveTip(selectedPreset.tip);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeTargetWord === selectedPreset.sound
                      ? "bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400"
                      : "bg-background hover:bg-muted text-foreground border border-amber-500/40"
                  }`}
                >
                  <span>🌟 纯音: {selectedPreset.sound}</span>
                  <span className={`text-[10px] ml-1 ${activeTargetWord === selectedPreset.sound ? "text-slate-900" : "text-amber-600 dark:text-amber-400"}`}>
                    ({selectedPreset.ipa})
                  </span>
                </button>

                {/* 2. 词族拓展 */}
                {selectedPreset.words.map((wItem, wIdx) => {
                  const isCurrentWord = activeTargetWord === wItem.word;
                  return (
                    <button
                      key={wIdx}
                      type="button"
                      onClick={() => handleSelectWord(wItem)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isCurrentWord
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-background hover:bg-muted text-foreground border border-border/80"
                      }`}
                    >
                      <span>{wItem.word}</span>
                      <span className={`text-[10px] ml-1 font-normal ${isCurrentWord ? "text-blue-100" : "text-muted-foreground"}`}>
                        ({wItem.translation})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. 核心声学录音与听音工作台 (Dark Console) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 text-white shadow-inner flex flex-col md:flex-row items-center justify-between gap-5 border border-slate-800">
          {/* 左侧：示范音频与倍速 */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Button
              onClick={() => handlePlayModel()}
              disabled={isPlayingModel}
              className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs h-10 px-4 gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Volume2Icon className={`size-4 ${isPlayingModel ? "animate-bounce" : ""}`} />
              <span>
                {isPlayingModel
                  ? "正在示范中..."
                  : hasPhonemeAudio(activeIpa) || hasPhonemeAudio(activeTargetWord)
                  ? `听真人音标原音 (${activeIpa || activeTargetWord})`
                  : `听标准例词原音 (${activeTargetWord})`}
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlaybackSpeed((s) => (s === 1.0 ? 0.75 : 1.0))}
              className="h-8 px-2.5 text-xs rounded-xl bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
              title="切换慢速示范"
            >
              <SlidersIcon className="size-3 mr-1" />
              <span>{playbackSpeed === 1.0 ? "1.0x" : "0.75x慢速"}</span>
            </Button>
          </div>

          {/* 右侧：录音按钮与动态波形 */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            {isRecording ? (
              <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-950/70 border border-emerald-500/40">
                <span className="size-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {Math.floor(recordingTime / 60)}:
                  {String(recordingTime % 60).padStart(2, "0")}
                </span>
                {mediaRecorder && (
                  <LiveAudioVisualizer
                    mediaRecorder={mediaRecorder}
                    barWidth={3}
                    gap={2}
                    width={110}
                    height={26}
                    barColor="#10b981"
                  />
                )}
                <Button
                  size="sm"
                  onClick={stopRecording}
                  className="h-8 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs gap-1 cursor-pointer"
                >
                  <SquareIcon className="size-3 fill-current" />
                  <span>完成</span>
                </Button>
              </div>
            ) : recordedUrl ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTogglePlayRecorded}
                  className="h-9 px-3 rounded-xl bg-slate-900 border-slate-700 text-slate-200 hover:text-white text-xs gap-1.5 cursor-pointer font-bold"
                >
                  {isPlayingRecorded ? (
                    <>
                      <PauseIcon className="size-3.5 fill-current" />
                      <span>暂停</span>
                    </>
                  ) : (
                    <>
                      <PlayIcon className="size-3.5 fill-current" />
                      <span>听本人录音</span>
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetAudioState}
                  className="h-9 px-2.5 rounded-xl bg-slate-900 border-slate-700 text-slate-400 hover:text-white text-xs gap-1 cursor-pointer"
                  title="重新录制"
                >
                  <RotateCcwIcon className="size-3" />
                  <span>重录</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleSubmitAssessment}
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCcwIcon className="size-3.5 animate-spin" />
                      <span>AI 声学诊断中...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="size-3.5" />
                      <span>提交 AI 评测打分</span>
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={startRecording}
                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs h-10 px-5 gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <MicIcon className="size-4" />
                <span>开始麦克风跟读录音</span>
              </Button>
            )}
          </div>
        </div>

        {/* 4. 评测打分结果卡片 */}
        {assessmentResult && (
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
              <div className="flex items-center gap-3">
                <div
                  className={`size-14 rounded-2xl flex flex-col items-center justify-center font-black shadow-md ${
                    isHighScore
                      ? "bg-emerald-500 text-slate-950 shadow-emerald-500/30"
                      : isMidScore
                      ? "bg-amber-500 text-slate-950 shadow-amber-500/30"
                      : "bg-rose-500 text-white shadow-rose-500/30"
                  }`}
                >
                  <span className="text-xl leading-none font-mono">{score}</span>
                  <span className="text-[9px] font-bold mt-0.5">分</span>
                </div>
                <div>
                  <div className="text-sm font-black text-foreground flex items-center gap-1.5">
                    <span>
                      {isHighScore
                        ? "🎉 太棒了！连音过渡与咬字极其纯正！"
                        : isMidScore
                        ? "👍 良好！连缀发音基本到位，注意节奏更紧凑！"
                        : "💪 加油！注意辅音之间不要插入元音哦！"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    评测目标: <strong className="text-foreground font-mono">{activeTargetWord}</strong> · 声学四维综合表现
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={resetAudioState}
                className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer self-start sm:self-auto"
              >
                <RotateCcwIcon className="size-3" />
                <span>再练一次</span>
              </Button>
            </div>

            {/* 四大维度 Progress 柱 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: "准确度 Accuracy", val: assessmentResult.accuracyScore || score },
                { label: "流利度 Fluency", val: assessmentResult.fluencyScore || score },
                { label: "完整度 Completeness", val: assessmentResult.completenessScore || score },
                { label: "音调 Prosody", val: assessmentResult.prosodyScore || score },
              ].map((dim, dIdx) => (
                <div key={dIdx} className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                  <div className="text-[10px] text-muted-foreground font-medium">{dim.label}</div>
                  <div className="text-base font-black font-mono text-foreground mt-0.5">{dim.val}</div>
                  <Progress value={dim.val} className="h-1.5 mt-1.5 bg-muted" />
                </div>
              ))}
            </div>

            {/* 音素分解诊断 */}
            {assessmentResult.result?.words?.[0]?.phonemes && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1">
                    <SparklesIcon className="size-3.5 text-amber-500" />
                    <span>音素逐一诊断 (Phoneme Diagnostic)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">绿色: 优异 | 橙色: 需注意</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {assessmentResult.result.words[0].phonemes.map((phItem: any, pIdx: number) => {
                    const phScore = phItem.pronunciationAssessment?.accuracyScore || 80;
                    const isPhonemeGood = phScore >= 75;
                    return (
                      <div
                        key={pIdx}
                        className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-mono ${
                          isPhonemeGood
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        <span className="text-xs font-black">/{phItem.phoneme}/</span>
                        <span className="text-[10px] font-bold opacity-80">{phScore}分</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
