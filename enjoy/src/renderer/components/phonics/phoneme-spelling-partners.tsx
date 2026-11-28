import React, { useState } from "react";
import { Volume2Icon, SparklesIcon } from "lucide-react";
import { playPhonemeSound, PhonicsBenchmarkWord } from "@renderer/lib/phoneme-data";
import { playStandardTts } from "@renderer/lib/phonetics-coach";

export interface SpellingPartnerItem {
  grapheme: string;
  example: string;
  note?: string;
}

/**
 * 39+5 音素常见拼写搭档（仅呈现常见拼写字母组合与示范词，供认读对应）
 */
export const PHONEME_SPELLING_PARTNERS: Record<string, SpellingPartnerItem[]> = {
  i_long: [
    { grapheme: "ee", example: "tree", note: "最常见组合" },
    { grapheme: "ea", example: "tea", note: "双元音组合" },
    { grapheme: "e", example: "me", note: "开音节单字母" },
    { grapheme: "e_e", example: "these", note: "魔法 e" },
    { grapheme: "y", example: "happy", note: "词尾轻读" },
  ],
  ih: [
    { grapheme: "i", example: "igloo", note: "闭音节短 i" },
    { grapheme: "y", example: "gym", note: "词中替位" },
  ],
  eh: [
    { grapheme: "e", example: "egg", note: "闭音节短 e" },
    { grapheme: "ea", example: "head", note: "特殊短音" },
  ],
  ae: [
    { grapheme: "a", example: "apple", note: "闭音节短 a" },
  ],
  ah: [
    { grapheme: "o", example: "hot", note: "闭音节短 o" },
    { grapheme: "a", example: "father" },
  ],
  ar: [
    { grapheme: "ar", example: "car", note: "r 控音节" },
  ],
  aw: [
    { grapheme: "o", example: "orange" },
    { grapheme: "aw", example: "saw" },
    { grapheme: "au", example: "autumn" },
    { grapheme: "al", example: "ball" },
  ],
  or: [
    { grapheme: "or", example: "horse", note: "r 控音节" },
    { grapheme: "ore", example: "more" },
    { grapheme: "oor", example: "door" },
  ],
  uh: [
    { grapheme: "oo", example: "book", note: "短音 oo" },
    { grapheme: "u", example: "put" },
  ],
  u_long: [
    { grapheme: "oo", example: "boot", note: "长音 oo" },
    { grapheme: "ue", example: "blue" },
    { grapheme: "u_e", example: "cute", note: "魔法 e" },
    { grapheme: "ew", example: "new" },
  ],
  wedge: [
    { grapheme: "u", example: "umbrella", note: "闭音节短 u" },
    { grapheme: "o", example: "love" },
    { grapheme: "ou", example: "touch" },
  ],
  er: [
    { grapheme: "er", example: "her", note: "常见词尾" },
    { grapheme: "ir", example: "bird" },
    { grapheme: "ur", example: "nurse" },
  ],
  schwa: [
    { grapheme: "a", example: "ago", note: "弱读音节" },
    { grapheme: "e", example: "open" },
    { grapheme: "o", example: "lemon" },
    { grapheme: "u", example: "circus" },
  ],
  ey: [
    { grapheme: "a_e", example: "cake", note: "魔法 e" },
    { grapheme: "ai", example: "rain", note: "词中常见" },
    { grapheme: "ay", example: "day", note: "词尾常见" },
  ],
  ay: [
    { grapheme: "i_e", example: "ice", note: "魔法 e" },
    { grapheme: "igh", example: "night" },
    { grapheme: "y", example: "my", note: "单音节词尾" },
    { grapheme: "ie", example: "pie" },
  ],
  ow: [
    { grapheme: "oa", example: "boat", note: "词中常见" },
    { grapheme: "o_e", example: "home", note: "魔法 e" },
    { grapheme: "ow", example: "snow", note: "词尾常见" },
    { grapheme: "o", example: "go" },
  ],
  oy: [
    { grapheme: "oy", example: "boy", note: "词尾常见" },
    { grapheme: "oi", example: "coin", note: "词中常见" },
  ],
  aw_dip: [
    { grapheme: "ow", example: "cow" },
    { grapheme: "ou", example: "house", note: "词中常见" },
  ],
  p: [
    { grapheme: "p", example: "pig" },
    { grapheme: "pp", example: "apple", note: "双写仍发一音" },
  ],
  b: [
    { grapheme: "b", example: "ball" },
    { grapheme: "bb", example: "rabbit", note: "双写仍发一音" },
  ],
  t: [
    { grapheme: "t", example: "tiger" },
    { grapheme: "tt", example: "letter" },
  ],
  d: [
    { grapheme: "d", example: "dog" },
    { grapheme: "dd", example: "ladder" },
  ],
  k: [
    { grapheme: "c", example: "cat", note: "a/o/u 前" },
    { grapheme: "k", example: "kite", note: "i/e 前" },
    { grapheme: "ck", example: "duck", note: "短元音后词尾" },
  ],
  g: [
    { grapheme: "g", example: "goat" },
    { grapheme: "gg", example: "egg", note: "双写仍发一音" },
  ],
  f: [
    { grapheme: "f", example: "fish" },
    { grapheme: "ff", example: "off" },
    { grapheme: "ph", example: "phone", note: "外来词常见" },
  ],
  v: [
    { grapheme: "v", example: "van" },
    { grapheme: "ve", example: "love", note: "词尾不单独用 v" },
  ],
  th: [
    { grapheme: "th", example: "thumb", note: "轻咬舌尖不振动" },
  ],
  dh: [
    { grapheme: "th", example: "feather", note: "轻咬舌尖声带振" },
  ],
  s: [
    { grapheme: "s", example: "sun" },
    { grapheme: "ss", example: "grass" },
    { grapheme: "ce", example: "ice", note: "e/i/y 前软音 c" },
  ],
  z: [
    { grapheme: "z", example: "zebra" },
    { grapheme: "zz", example: "buzz" },
    { grapheme: "s", example: "nose", note: "元音间常浊化" },
  ],
  sh: [
    { grapheme: "sh", example: "ship", note: "核心二合字母" },
    { grapheme: "ti", example: "station", note: "词尾 -tion" },
  ],
  h: [
    { grapheme: "h", example: "hat" },
    { grapheme: "wh", example: "who", note: "o 前不读 w" },
  ],
  ch: [
    { grapheme: "ch", example: "chair", note: "核心二合字母" },
    { grapheme: "tch", example: "watch", note: "短元音后常见" },
  ],
  jh: [
    { grapheme: "j", example: "juice" },
    { grapheme: "g", example: "orange", note: "e/i/y 前软音 g" },
    { grapheme: "dge", example: "bridge", note: "短元音后" },
  ],
  m: [
    { grapheme: "m", example: "moon" },
    { grapheme: "mm", example: "summer" },
    { grapheme: "mb", example: "thumb", note: "词尾 b 不发音" },
  ],
  n: [
    { grapheme: "n", example: "nose" },
    { grapheme: "nn", example: "sunny" },
    { grapheme: "kn", example: "knee", note: "词首 k 不发音" },
  ],
  ng: [
    { grapheme: "ng", example: "ring", note: "后鼻音组合" },
    { grapheme: "n", example: "pink", note: "k/g 前发 /ŋ/" },
  ],
  l: [
    { grapheme: "l", example: "lion" },
    { grapheme: "ll", example: "ball", note: "词尾常双写" },
  ],
  r: [
    { grapheme: "r", example: "rabbit" },
    { grapheme: "rr", example: "carrot" },
    { grapheme: "wr", example: "write", note: "词首 w 不发音" },
  ],
  w: [
    { grapheme: "w", example: "whale" },
    { grapheme: "wh", example: "wheel" },
  ],
  j: [
    { grapheme: "y", example: "yoyo", note: "词首辅音 y" },
  ],
  qu: [
    { grapheme: "qu", example: "queen", note: "q 与 u 固定搭档" },
  ],
  x: [
    { grapheme: "x", example: "box", note: "发 /ks/ 复合音" },
  ],
  wh: [
    { grapheme: "wh", example: "wheel", note: "常见于疑问词/名词" },
    { grapheme: "w", example: "water" },
  ],
};

export function getSpellingPartners(slug: string): SpellingPartnerItem[] {
  return PHONEME_SPELLING_PARTNERS[slug] || [];
}

/**
 * 计算单词中属于目标音素的字符下标集合，用于「示范词目标字母高亮」
 */
export function getTargetHighlightMask(
  word: string,
  slug: string,
  benchmarkWords?: PhonicsBenchmarkWord[],
  explicitGrapheme?: string
): boolean[] {
  const mask = new Array<boolean>(word.length).fill(false);
  const lower = word.toLowerCase();

  // 1. 若显式传入搭档字母组合（如 a_e, ee, sh），直接按搭档匹配
  const candidates: string[] = [];
  if (explicitGrapheme) {
    candidates.push(explicitGrapheme);
  }

  // 2. 从 benchmarkWords 里的 isTarget block 提取候选字母组合
  if (benchmarkWords) {
    const matchedBm = benchmarkWords.find((b) => b.word.toLowerCase() === lower);
    if (matchedBm) {
      for (const blk of matchedBm.blocks) {
        if (blk.isTarget) {
          candidates.push(blk.letters);
        }
      }
    }
  }

  // 3. 拼写搭档表中按长度降序匹配（优先匹配 ck / ee / th / a_e 等组合）
  const partners = getSpellingPartners(slug);
  for (const p of partners) {
    candidates.push(p.grapheme);
  }

  // 去重并按长度降序（优先长组合，split digraph 如 a_e 拆开匹配）
  const unique = Array.from(new Set(candidates)).sort((a, b) => b.length - a.length);

  for (const rawG of unique) {
    const g = rawG.toLowerCase().trim();
    if (!g) continue;

    // 处理 split digraph: e.g. a_e, i_e, o_e, u_e, e_e
    const splitMatch = /^([a-z])_([a-z])$/.exec(g);
    if (splitMatch) {
      const [, first, second] = splitMatch;
      const re = new RegExp(`${first}[a-z]${second}`);
      const m = re.exec(lower);
      if (m) {
        mask[m.index] = true;
        mask[m.index + 2] = true;
        return mask;
      }
      continue;
    }

    // 特殊情况：cake/ice/nose/whale/cute 等带哑音 e 的拼读词（如 benchmark里写了 a_e 或仅写 ke）
    const idx = lower.indexOf(g);
    if (idx !== -1) {
      for (let i = idx; i < idx + g.length; i++) {
        mask[i] = true;
      }
      return mask;
    }
  }

  // 4. 兜底：若目标为开音节长元音，尝试首字母+词尾e
  if (slug === "ey" || slug === "ay" || slug === "ow" || slug === "u_long" || slug === "i_long") {
    const vowelChar =
      slug === "ey" ? "a" : slug === "ay" ? "i" : slug === "ow" ? "o" : slug === "u_long" ? "u" : "e";
    const re = new RegExp(`${vowelChar}[a-z]e`);
    const m = re.exec(lower);
    if (m) {
      mask[m.index] = true;
      mask[m.index + 2] = true;
      return mask;
    }
  }

  return mask;
}

export interface HighlightTargetLettersProps {
  word: string;
  slug: string;
  benchmarkWords?: PhonicsBenchmarkWord[];
  explicitGrapheme?: string;
  className?: string;
}

export const HighlightTargetLetters: React.FC<HighlightTargetLettersProps> = ({
  word,
  slug,
  benchmarkWords,
  explicitGrapheme,
  className = "",
}) => {
  const mask = getTargetHighlightMask(word, slug, benchmarkWords, explicitGrapheme);
  return (
    <span className={className} data-testid="highlighted-word">
      {word.split("").map((ch, idx) =>
        mask[idx] ? (
          <mark
            key={idx}
            className="bg-[#F2A93B]/30 text-[#0A5E5D] dark:bg-amber-400/25 dark:text-amber-200 px-0.5 rounded-[4px] font-black underline decoration-[#96690A] decoration-2 underline-offset-4"
          >
            {ch}
          </mark>
        ) : (
          <span key={idx}>{ch}</span>
        )
      )}
    </span>
  );
};

export interface PhonemeSpellingPartnersSectionProps {
  phonemeId: string;
  phonemeSlug: string;
  phonemeSymbol: string;
}

export const PhonemeSpellingPartnersSection: React.FC<PhonemeSpellingPartnersSectionProps> = ({
  phonemeId,
  phonemeSlug,
  phonemeSymbol,
}) => {
  const partners = getSpellingPartners(phonemeSlug);
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  if (partners.length === 0) return null;

  const handleTapPartner = (item: SpellingPartnerItem) => {
    setPlayingKey(item.grapheme);
    // 点拼写搭档先播纯音素，保证「纯音素铁律」；例词按钮单独点播整词
    playPhonemeSound(phonemeId, {
      onEnd: () => setPlayingKey(null),
    });
  };

  const handlePlayExample = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    setPlayingKey(`word:${word}`);
    playStandardTts(word, {
      onEnd: () => setPlayingKey(null),
    });
  };

  return (
    <section
      data-testid="spelling-partners-section"
      className="rounded-[20px] bg-white dark:bg-card border border-[#D3E4DE] p-4 sm:p-5 space-y-3.5 shadow-[0_1px_3px_rgba(18,59,60,0.04),0_4px_12px_rgba(18,59,60,0.05)]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#D3E4DE]">
        <div className="flex items-center gap-2.5">
          <span className="size-8 rounded-lg bg-[#E7F2EF] border border-[#D3E4DE] text-[#0F7B7A] flex items-center justify-center shrink-0">
            <SparklesIcon className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-black text-[#123B3C] dark:text-foreground">
              常见拼写组合
            </h2>
            <p className="text-xs text-[#4E6B69] dark:text-muted-foreground">
              发 {phonemeSymbol} 时常见的字母组合，点字母听纯音，点例词听整词。
            </p>
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E7F2EF] text-[#0A5E5D] border border-[#D3E4DE] text-xs font-bold self-start sm:self-auto shrink-0">
          共 {partners.length} 种常见拼法
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {partners.map((item) => {
          const isSounding = playingKey === item.grapheme;
          const isWordPlaying = playingKey === `word:${item.example}`;
          return (
            <div
              key={item.grapheme}
              className="rounded-[14px] bg-[#F3FAF8] dark:bg-slate-900/60 border border-[#D3E4DE] p-3 flex items-center justify-between gap-2.5"
            >
              <button
                type="button"
                onClick={() => handleTapPartner(item)}
                aria-label={`听拼写组合 ${item.grapheme} 对应的音素 ${phonemeSymbol}`}
                className={`min-h-[44px] min-w-[64px] px-3 py-2 rounded-[10px] border font-mono text-base font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                  isSounding
                    ? "bg-[#0F7B7A] text-white border-[#0A5E5D]"
                    : "bg-white dark:bg-slate-800 text-[#0A5E5D] dark:text-emerald-300 border-[#D3E4DE] hover:border-[#0F7B7A]"
                }`}
              >
                <span>{item.grapheme.replace("_", " _ ")}</span>
              </button>

              <div className="flex-1 min-w-0">
                <div className="text-base font-mono font-bold text-[#123B3C] dark:text-foreground truncate">
                  <HighlightTargetLetters
                    word={item.example}
                    slug={phonemeSlug}
                    explicitGrapheme={item.grapheme}
                  />
                </div>
                {item.note && (
                  <div className="text-[11px] text-[#4E6B69] dark:text-muted-foreground truncate">
                    {item.note}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => handlePlayExample(e, item.example)}
                aria-label={`听例词 ${item.example}`}
                className={`min-h-[44px] min-w-[44px] px-2.5 rounded-[10px] border transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                  isWordPlaying
                    ? "bg-[#F2A93B] text-[#123B3C] border-[#D69128]"
                    : "bg-white dark:bg-slate-800 text-[#0F7B7A] border-[#D3E4DE] hover:bg-[#E7F2EF]"
                }`}
              >
                <Volume2Icon className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
