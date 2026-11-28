import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  getCultureCatalog,
  getCultureSlideById,
  recordPassportStamp,
  getUserPassport,
  CultureSlide,
} from "@renderer/lib/culture-service";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { toggleFavWord, isWordFaved } from "@renderer/lib/listening-sync";
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
  Volume2,
  VolumeX,
  MapPin,
  CheckCircle2,
  Coins,
  BookOpen,
  HelpCircle,
  ChevronDown,
  Star,
} from "lucide-react";

const renderBalancedTitle = (title: string) => {
  const sepIndex = title.indexOf(" · ");
  if (sepIndex <= 0) return title;
  const prefix = title.slice(0, sepIndex + 2);
  const rest = title.slice(sepIndex + 3);
  return (
    <>
      <span className={prefix.length <= 8 ? "whitespace-nowrap" : undefined}>{prefix}</span>{" "}
      <wbr />
      <span>{rest}</span>
    </>
  );
};

export default () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [slide, setSlide] = useState<CultureSlide | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReading, setIsReading] = useState(false);

  // 中文导读默认折叠
  const [zhOpen, setZhOpen] = useState(false);

  // 文化关键词发音与生词收藏状态
  const [chapterKey, setChapterKey] = useState<string>("");
  const [favedWords, setFavedWords] = useState<Record<string, boolean>>({});
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  // 问答状态（答错可重试：记录已选错的选项索引）
  const [wrongOptions, setWrongOptions] = useState<number[]>([]);
  const [correctSelected, setCorrectSelected] = useState(false);
  const [isPassed, setIsPassed] = useState(false);
  const [showStampModal, setShowStampModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!id) return;

    setLoading(true);
    setZhOpen(false);
    setWrongOptions([]);
    setCorrectSelected(false);
    setShowStampModal(false);
    setIsReading(false);
    setPlayingWord(null);

    Promise.all([getCultureSlideById(id), getCultureCatalog()]).then(([s, catalog]) => {
      if (!mounted) return;
      if (s) {
        setSlide(s);
        const pass = getUserPassport();
        setIsPassed(pass.collectedStamps.includes(s.id));

        const idx = catalog.slides.findIndex((item) => item.id === s.id);
        const resolvedKey = idx >= 0 ? String(idx + 1).padStart(2, "0") : s.id;
        setChapterKey(resolvedKey);

        const initialFaved: Record<string, boolean> = {};
        for (const kw of s.keyWords) {
          initialFaved[kw.word] = isWordFaved("world", resolvedKey, kw.word);
        }
        setFavedWords(initialFaved);
      } else {
        setSlide(null);
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

  // 语音朗读 (锁定 Sonia 纯正英音)
  const handleToggleReadAloud = () => {
    if (!slide) return;
    if (isReading) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    setPlayingWord(null);
    setIsReading(true);
    playStandardTts(slide.contentEn, {
      voice: "en-GB-SoniaNeural",
      rate: "-5%",
      onEnd: () => setIsReading(false),
    }).catch(() => setIsReading(false));
  };

  // 点击关键词播放英音（与详情页朗读同源）
  const handlePlayKeyword = (word: string) => {
    setIsReading(false);
    setPlayingWord(word);
    playStandardTts(word, {
      voice: "en-GB-SoniaNeural",
      rate: "-5%",
      onEnd: () => setPlayingWord((cur) => (cur === word ? null : cur)),
    }).catch(() => setPlayingWord((cur) => (cur === word ? null : cur)));
  };

  // 收藏关键词到生词本（复用 listening-sync 现有生词收藏逻辑）
  const handleToggleKeywordFav = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    const key = chapterKey || slide?.id || "";
    if (!key) return;
    const nextFaved = toggleFavWord("world", key, word);
    setFavedWords((prev) => ({ ...prev, [word]: nextFaved }));
    if (nextFaved) {
      toast.success(`已将 "${word}" 加入生词本`);
    } else {
      toast.info(`已将 "${word}" 移出生词本`);
    }
  };

  // 提交问答（答错不锁死：错选项标红禁用，其余选项可继续选）
  const handleSelectOption = (idx: number) => {
    if (!slide || correctSelected || wrongOptions.includes(idx)) return;

    if (idx === slide.quiz.correctIndex) {
      setCorrectSelected(true);
      setIsPassed(true);
      recordPassportStamp(slide.id, 10);
      setShowStampModal(true);
      toast.success("回答正确，获得旅行邮戳，金币 +10。");
    } else {
      setWrongOptions((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
      toast.error("答案就在短文中，再读一遍试试。");
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
          <Link to="/world">返回环球漫游</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full max-w-5xl mx-auto px-4 pt-6 pb-24 xl:pb-10 space-y-6">
      {/* 顶部面包屑 */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/world" className="text-[#4E6B69] hover:text-[#0F7B7A]">
                环球漫游
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="text-[#4E6B69]">{slide.region}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage className="font-bold text-[#123B3C]">
            {slide.title}
          </BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 拍立得明信片主卡片 */}
      <div className="bg-white border border-[#D3E4DE] rounded-3xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 items-stretch">
          {/* 左侧：高清名胜实景照片 (5 列) */}
          <div className="md:col-span-5 relative bg-[#E7F2EF] min-h-[300px]">
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* 小狮子敢敢旅行邮戳 */}
            {isPassed && (
              <div className="absolute top-4 right-4 bg-[#F2A93B] text-[#123B3C] font-extrabold px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-1.5 text-xs animate-in zoom-in-50">
                <span>已打卡 · 旅行邮戳已收集</span>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center gap-1.5 text-xs text-white/90 font-bold mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#F2A93B]" />
                <span>{slide.region}</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">{slide.title}</h2>
            </div>
          </div>

          {/* 右侧：中英双语探索解读 (7 列) */}
          <div className="md:col-span-7 p-5 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span className="text-2xl shrink-0 leading-none mt-0.5">{slide.stamp}</span>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-extrabold text-[#123B3C] leading-snug text-balance">
                      {renderBalancedTitle(slide.titleZh)}
                    </h1>
                    <p className="text-xs text-[#4E6B69] mt-0.5">{slide.tagline}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleReadAloud}
                  className={`rounded-2xl text-xs gap-1.5 shrink-0 ${
                    isReading
                      ? "bg-[#0F7B7A] text-white border-[#0F7B7A] hover:bg-[#0A5E5D] hover:text-white"
                      : "bg-white text-[#0F7B7A] border-[#D3E4DE] hover:bg-[#F3FAF8] hover:text-[#0A5E5D]"
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
              <div className="bg-[#F3FAF8] rounded-2xl p-4 border border-[#D3E4DE] space-y-2">
                <div className="text-[11px] font-bold text-[#4E6B69] uppercase tracking-wider">
                  English Reading
                </div>
                <p className="text-sm font-medium leading-relaxed text-[#123B3C] select-text">
                  {slide.contentEn}
                </p>
              </div>

              {/* 中文导读（默认收起，点击标题行展开/收起） */}
              <details
                key={slide.id}
                open={zhOpen}
                className="bg-[#F3FAF8] rounded-2xl p-4 border border-[#D3E4DE]"
              >
                <summary
                  onClick={(e) => {
                    e.preventDefault();
                    setZhOpen((prev) => !prev);
                  }}
                  className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center justify-between gap-2 text-xs font-bold text-[#0F7B7A]"
                >
                  <span className="flex items-center gap-1.5">
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        zhOpen ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                    <span>中文导读</span>
                  </span>
                  <span className="text-[11px] font-medium text-[#4E6B69]">
                    {zhOpen ? "收起译文" : "点击展开译文"}
                  </span>
                </summary>
                <div className="pt-2.5 space-y-2 text-xs leading-relaxed text-[#123B3C]/90">
                  {slide.contentZh
                    .split(/\n+/)
                    .filter(Boolean)
                    .map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                </div>
              </details>
            </div>

            {/* 核心拓展生词 */}
            <div className="pt-2 border-t border-[#D3E4DE]">
              <div className="text-xs font-bold text-[#4E6B69] mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#0F7B7A]" />
                  <span>文化关键词</span>
                </span>
                <span className="text-[11px] font-medium text-[#4E6B69]">
                  点击单词听英音 · 星标收藏进生词本
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {slide.keyWords.map((kw, i) => {
                  const isFaved = !!favedWords[kw.word];
                  const isPlaying = playingWord === kw.word;

                  return (
                    <div
                      key={i}
                      className={`relative rounded-xl border transition-colors ${
                        isPlaying
                          ? "bg-[#E7F2EF] border-[#0F7B7A]"
                          : isFaved
                          ? "bg-[#F3FAF8] border-[#F2A93B]"
                          : "bg-white border-[#D3E4DE] hover:border-[#0F7B7A]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handlePlayKeyword(kw.word)}
                        aria-label={`朗读关键词 ${kw.word}`}
                        className="w-full text-left p-2.5 pr-8 space-y-0.5 rounded-xl cursor-pointer"
                      >
                        <div className="flex items-center gap-1 font-bold text-xs text-[#123B3C]">
                          <span className="truncate">{kw.word}</span>
                          <Volume2
                            className={`w-3 h-3 shrink-0 ${
                              isPlaying ? "text-[#0F7B7A] animate-pulse" : "text-[#4E6B69]"
                            }`}
                          />
                        </div>
                        <div className="text-[10px] font-mono text-[#0F7B7A] truncate">
                          {kw.ipa}
                        </div>
                        <div className="text-[10px] text-[#4E6B69] truncate">
                          {kw.zh}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleToggleKeywordFav(e, kw.word)}
                        aria-pressed={isFaved}
                        aria-label={isFaved ? `取消收藏 ${kw.word}` : `收藏 ${kw.word} 到生词本`}
                        title={isFaved ? "已收藏至生词本（点击移除）" : "收藏到生词本"}
                        className={`absolute top-1.5 right-1.5 size-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                          isFaved
                            ? "bg-[#F2A93B]/20 text-[#96690A] border border-[#F2A93B]/50"
                            : "text-[#4E6B69] hover:text-[#0F7B7A] hover:bg-[#F3FAF8]"
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFaved ? "fill-[#F2A93B] text-[#F2A93B]" : ""
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 互动小百科趣味测验 (Culture Quiz) */}
      <div className="bg-white border border-[#D3E4DE] rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#0F7B7A]" />
            <h3 className="font-extrabold text-base text-[#123B3C]">
              文化小测 · 收集旅行邮戳
            </h3>
          </div>
          {isPassed && (
            <span className="flex items-center gap-1 text-xs font-bold text-[#0A5E5D] bg-[#E7F2EF] border border-[#D3E4DE] px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0F7B7A]" />
              已打卡
            </span>
          )}
        </div>

        <p className="text-sm font-semibold text-[#123B3C]">
          {slide.quiz.question}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {slide.quiz.options.map((opt, i) => {
            const isWrong = wrongOptions.includes(i);
            const isCorrect = i === slide.quiz.correctIndex;
            const isDisabled = correctSelected || isWrong;

            let btnStyle =
              "bg-[#F3FAF8] border-[#D3E4DE] hover:bg-[#E7F2EF] hover:border-[#0F7B7A] text-[#123B3C] cursor-pointer";
            if (correctSelected && isCorrect) {
              btnStyle = "bg-emerald-600 text-white border-emerald-600 shadow-md";
            } else if (isWrong) {
              btnStyle = "bg-rose-500 text-white border-rose-500";
            }

            return (
              <button
                key={i}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelectOption(i)}
                className={`p-4 rounded-2xl border font-bold text-sm text-left transition-all ${btnStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                      (correctSelected && isCorrect) || isWrong
                        ? "bg-white/25 text-white"
                        : "bg-white border border-[#D3E4DE] text-[#123B3C]"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </div>
              </button>
            );
          })}
        </div>

        {wrongOptions.length > 0 && !correctSelected && (
          <div className="p-4 rounded-2xl bg-[#F3FAF8] border border-[#D3E4DE] text-xs text-[#4E6B69] flex items-center gap-2 animate-in fade-in">
            <span className="text-base">🔍</span>
            <span>答案就在短文中，再读一遍试试。</span>
          </div>
        )}

        {correctSelected && (
          <div className="p-4 rounded-2xl bg-[#F3FAF8] border border-[#D3E4DE] text-xs text-[#4E6B69] flex items-center gap-2 animate-in fade-in">
            <span className="text-lg">💡</span>
            <span>{slide.quiz.explanation}</span>
          </div>
        )}
      </div>

      {/* 盖章通关弹窗 */}
      {showStampModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white border border-[#D3E4DE] rounded-3xl shadow-2xl p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#0F7B7A] to-[#0A5E5D] text-white flex items-center justify-center text-5xl mx-auto shadow-xl shadow-[#0F7B7A]/25 animate-bounce">
              📮
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-[#123B3C]">
                打卡成功！
              </h2>
              <p className="text-sm text-[#4E6B69] leading-relaxed">
                已完成【{slide.title}】文化阅读，旅行邮戳已存入护照。
              </p>
            </div>

            <div className="bg-[#F3FAF8] border border-[#D3E4DE] rounded-2xl p-4 flex items-center justify-center gap-3 text-[#96690A] font-extrabold text-lg">
              <Coins className="w-6 h-6 text-[#F2A93B]" />
              <span>获得 +10 旅行金币</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowStampModal(false)}
                className="flex-1 rounded-2xl border-[#D3E4DE] text-[#123B3C] hover:bg-[#F3FAF8]"
              >
                继续阅读
              </Button>
              <Button
                onClick={() => navigate("/world")}
                className="flex-1 rounded-2xl bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white font-bold"
              >
                下一站 →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
