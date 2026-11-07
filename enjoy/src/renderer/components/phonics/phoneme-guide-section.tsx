import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Volume2Icon,
  ExternalLinkIcon,
  RocketIcon,
} from "lucide-react";
import {
  Badge,
  Button,
  Separator,
} from "@renderer/components/ui";
import {
  PhonicsAnchorItem,
} from "@renderer/lib/phoneme-anchors";
import {
  PHONEME_COACHING_GUIDES,
  playStandardTts,
} from "@renderer/lib/phonetics-coach";
import {
  getDecodableWordsForIpaSlug,
  PhonicsWord,
} from "@renderer/lib/open-phonics-service";
import { PhonicsWordBlendingModal } from "@renderer/components/phonics/phonics-word-blending-modal";

export default function PhonemeGuideSection({ anchor }: { anchor: PhonicsAnchorItem }) {
  const [decodableWords, setDecodableWords] = useState<PhonicsWord[]>([]);
  const [activeBlendingWord, setActiveBlendingWord] = useState<PhonicsWord | null>(null);

  useEffect(() => {
    let mounted = true;
    getDecodableWordsForIpaSlug(anchor.ipaSlug, 16).then((words) => {
      if (mounted) setDecodableWords(words);
    });
    return () => {
      mounted = false;
    };
  }, [anchor.id, anchor.ipaSlug]);

  const coachingGuide = useMemo(() => {
    const clean = anchor.ipaSymbol.replace(/[\/\[\]]/g, "");
    return (
      PHONEME_COACHING_GUIDES[clean] ||
      PHONEME_COACHING_GUIDES[anchor.ipaSlug] ||
      PHONEME_COACHING_GUIDES[anchor.id]
    );
  }, [anchor]);

  return (
    <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-card border-2 border-border shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex flex-col items-center justify-center font-black shadow-md">
                  <span className="text-2xl font-mono">{anchor.letter}</span>
                  <span className="text-[10px] opacity-80">[{anchor.ipaSymbol}]</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-foreground">
                      {anchor.anchorWord} · {anchor.anchorZh}
                    </h2>
                    <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-400/30 text-[10px]">
                      {anchor.academicName}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                    声带状态: {anchor.voiced ? "浊辅音/元音 (声带振动)" : "清辅音 (声带安静，纯气流)"}
                  </p>
                </div>
              </div>

            </div>

            <Separator />

            {/* 专业发音指导锦囊 */}
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-black text-foreground shrink-0">👅 口腔口型:</span>
                <span className="text-muted-foreground font-medium">
                  {coachingGuide?.mouthShape || "自然张开发音部位，注意唇齿配合"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-black text-foreground shrink-0">💡 辅导要点:</span>
                <span className="text-muted-foreground font-medium">
                  {coachingGuide?.tip || anchor.mnemonic}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-black text-rose-500 shrink-0">⚠️ 易错陷阱:</span>
                <span className="text-rose-600/90 dark:text-rose-400 font-medium">
                  {coachingGuide?.mistake || "注意声带是否误振动或发成汉语拼音相似音"}
                </span>
              </div>
            </div>
          </div>

          {/* 🔗 与 1236 拼读练习词库联动推荐专区 */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border-2 border-sky-400/40 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black text-base shadow-2xs">
                  🧩
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                    <span>1,236 词库实战联动 · 对应练习词推荐</span>
                    <Badge className="bg-sky-500 text-white text-[9px] font-black">
                      Letters & Sounds 规范
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    攻克字母 <strong>{anchor.letter}</strong> 后，孩子可在以下可解码词中进行拼读连读特训：
                  </p>
                </div>
              </div>

              <Link to="/phonics">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-xl text-xs font-black border-sky-400 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 shrink-0"
                >
                  <span>全量 1,236 词库 ➔</span>
                </Button>
              </Link>
            </div>

            {/* 联动单词积木卡片列表 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {decodableWords.slice(0, 9).map((w) => (
                <div
                  key={w.word}
                  className="p-3 rounded-2xl bg-card border border-border hover:border-sky-400 hover:shadow-md transition-all flex flex-col justify-between group select-none"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground font-bold">
                      第 {w.phase} 阶
                    </span>
                    <button
                      type="button"
                      onClick={() => playStandardTts(w.word)}
                      title="点击发音"
                      className="size-6 rounded-full bg-muted/60 hover:bg-sky-500/20 text-muted-foreground hover:text-sky-600 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Volume2Icon className="size-3" />
                    </button>
                  </div>

                  {/* 单词大写与音素拆解 */}
                  <div className="text-center my-1">
                    <div className="text-lg font-black font-mono text-foreground group-hover:text-sky-600 transition-colors">
                      {w.word}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {w.sounds.join(" - ")}
                    </div>
                  </div>

                  {/* 火箭滑读按钮 */}
                  <button
                    type="button"
                    onClick={() => setActiveBlendingWord(w)}
                    className="w-full mt-2 py-1 rounded-xl bg-sky-500/10 hover:bg-sky-500 text-sky-700 hover:text-white text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <RocketIcon className="size-3" />
                    <span>火箭滑读</span>
                  </button>
                </div>
              ))}

              {decodableWords.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground font-semibold">
                  正在加载关联的 1,236 练习词库数据...
                </div>
              )}
            </div>
          </div>

      {/* 火箭滑读弹窗 */}
      <PhonicsWordBlendingModal
        word={activeBlendingWord}
        open={Boolean(activeBlendingWord)}
        onOpenChange={(open) => {
          if (!open) setActiveBlendingWord(null);
        }}
      />
    </div>
  );
}
