import React, { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  getCultureSlideById,
  recordPassportStamp,
  getUserPassport,
  CultureSlide,
} from "@renderer/lib/culture-service";
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
  Volume2,
  VolumeX,
  Compass,
  MapPin,
  CheckCircle2,
  Coins,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Stamp,
  Globe2,
  HelpCircle,
  Trophy,
} from "lucide-react";

export default () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [slide, setSlide] = useState<CultureSlide | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReading, setIsReading] = useState(false);

  // 问答状态
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isPassed, setIsPassed] = useState(false);
  const [showStampModal, setShowStampModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!id) return;

    getCultureSlideById(id).then((s) => {
      if (!mounted) return;
      if (s) {
        setSlide(s);
        const pass = getUserPassport();
        if (pass.collectedStamps.includes(s.id)) {
          setIsPassed(true);
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [id]);

  // 语音朗读
  const handleToggleReadAloud = () => {
    if (!slide) return;
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    if (!window.speechSynthesis) {
      toast.error("当前浏览器不支持原生语音朗读");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(slide.contentEn);
    utterance.lang = "en-GB";
    utterance.rate = 0.9;
    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);

    window.speechSynthesis.speak(utterance);
    setIsReading(true);
  };

  // 提交问答
  const handleSelectOption = (idx: number) => {
    if (!slide || selectedOpt !== null) return;
    setSelectedOpt(idx);

    if (idx === slide.quiz.correctIndex) {
      setIsPassed(true);
      recordPassportStamp(slide.id, 10);
      setShowStampModal(true);
      toast.success("回答正确！成功收集旅行邮戳 🎉 金币 +10");
    } else {
      toast.error("再仔细读读课文，答案就在里面哦～加油！");
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <LoaderSpin />
      </div>
    );
  }

  if (!slide) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="text-4xl">🌍</div>
        <h2 className="text-xl font-bold">未找到该文化漫游站点</h2>
        <Button asChild variant="outline">
          <Link to="/world">返回环球奇遇记</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* 顶部面包屑 */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/world" className="hover:text-indigo-500">
                敢敢环球奇遇记
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="text-muted-foreground">{slide.region}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage className="font-bold text-foreground">
            {slide.title}
          </BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 拍立得明信片主卡片 */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 items-stretch">
          {/* 左侧：高清名胜实景照片 (5 列) */}
          <div className="md:col-span-5 relative bg-muted min-h-[300px]">
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* 小狮子敢敢旅行邮戳 */}
            {isPassed && (
              <div className="absolute top-4 right-4 bg-amber-500 text-white font-extrabold px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-1.5 text-xs animate-in zoom-in-50">
                <span>🦁</span>
                <span>敢敢旅行护照已盖章</span>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center gap-1.5 text-xs text-blue-200 font-bold mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{slide.region}</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">{slide.title}</h2>
            </div>
          </div>

          {/* 右侧：中英双语探索解读 (7 列) */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{slide.stamp}</span>
                  <div>
                    <h1 className="text-lg font-extrabold text-foreground">
                      {slide.titleZh}
                    </h1>
                    <p className="text-xs text-muted-foreground">{slide.tagline}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleReadAloud}
                  className={`rounded-2xl text-xs gap-1.5 ${
                    isReading
                      ? "bg-indigo-500 text-white hover:bg-indigo-600"
                      : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  }`}
                >
                  {isReading ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span>{isReading ? "停止朗读" : "英音朗读"}</span>
                </Button>
              </div>

              {/* 英文课文 */}
              <div className="bg-muted/40 rounded-2xl p-4 border border-border/80 space-y-2">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  English Reading
                </div>
                <p className="text-sm font-medium leading-relaxed text-foreground select-text">
                  {slide.contentEn}
                </p>
              </div>

              {/* 少儿中文导读 */}
              <div className="bg-indigo-50/60 dark:bg-indigo-950/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                <div className="text-[11px] font-bold text-indigo-500 flex items-center gap-1">
                  <span>🦁 敢敢中文导读</span>
                </div>
                <p className="text-xs leading-relaxed text-foreground/90">
                  {slide.contentZh}
                </p>
              </div>
            </div>

            {/* 核心拓展生词 */}
            <div className="pt-2 border-t border-border/60">
              <div className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>文化关键词 (Keywords)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {slide.keyWords.map((kw, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-xl bg-card border border-border/80 space-y-0.5"
                  >
                    <div className="font-bold text-xs text-foreground truncate">
                      {kw.word}
                    </div>
                    <div className="text-[10px] font-mono text-indigo-500">
                      {kw.ipa}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {kw.zh}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 互动小百科趣味测验 (Culture Quiz) */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-500" />
            <h3 className="font-extrabold text-base text-foreground">
              文化小百科挑战 · 收集印章
            </h3>
          </div>
          {isPassed && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              已通关收集
            </span>
          )}
        </div>

        <p className="text-sm font-semibold text-foreground">
          {slide.quiz.question}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {slide.quiz.options.map((opt, i) => {
            const isSelected = selectedOpt === i;
            const isCorrect = i === slide.quiz.correctIndex;

            let btnStyle = "bg-muted/40 border-border hover:bg-muted text-foreground";
            if (selectedOpt !== null) {
              if (isCorrect) {
                btnStyle = "bg-emerald-500 text-white border-emerald-500 shadow-md";
              } else if (isSelected) {
                btnStyle = "bg-rose-500 text-white border-rose-500";
              }
            }

            return (
              <button
                key={i}
                disabled={selectedOpt !== null}
                onClick={() => handleSelectOption(i)}
                className={`p-4 rounded-2xl border font-bold text-sm text-left transition-all ${btnStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </div>
              </button>
            );
          })}
        </div>

        {selectedOpt !== null && (
          <div className="p-4 rounded-2xl bg-muted/60 border border-border/80 text-xs text-muted-foreground flex items-center gap-2 animate-in fade-in">
            <span className="text-lg">💡</span>
            <span>{slide.quiz.explanation}</span>
          </div>
        )}
      </div>

      {/* 盖章通关弹窗 */}
      {showStampModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-5xl mx-auto shadow-xl shadow-indigo-500/25 animate-bounce">
              📮
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-foreground">
                旅行护照盖章成功！
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                恭喜你完成了【{slide.title}】的文化探索！专属小狮子印章已盖入你的旅行护照！
              </p>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 text-indigo-600 dark:text-indigo-400 font-extrabold text-lg">
              <Coins className="w-6 h-6 text-amber-500" />
              <span>获得 +10 旅行金币</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowStampModal(false)}
                className="flex-1 rounded-2xl"
              >
                继续阅读
              </Button>
              <Button
                onClick={() => navigate("/world")}
                className="flex-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold"
              >
                去下一站 🌍
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
