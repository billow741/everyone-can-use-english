/**
 * 录完即出词级信号工具：
 * 复用 /api/speech/recognize-word（Azure STT 纯转写），仅在前端展示「机器听到的词」，
 * 不评分、不产生星级、不写入任何发音档案或排行榜。
 */

export interface WordToken {
  display: string;
  norm: string;
}

export interface MissedWordSignal {
  display: string;
  norm: string;
  heardLike?: string;
}

export interface WordSignalComparison {
  totalRefWords: number;
  missedWords: MissedWordSignal[];
  allMatched: boolean;
}

const RECOGNIZE_TIMEOUT_MS = 12000;

/**
 * 调用后端 /api/speech/recognize-word 获取转写候选列表；
 * 任何失败、超时或无有效文本时返回 null（静默降级）。
 */
export async function recognizeSpeechWords(
  blob: Blob,
  externalSignal?: AbortSignal
): Promise<string[] | null> {
  if (externalSignal?.aborted) return null;

  const ctl = new AbortController();
  const onExternalAbort = () => ctl.abort();
  externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
  const timer = window.setTimeout(() => ctl.abort(), RECOGNIZE_TIMEOUT_MS);

  try {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => reject(fr.error || new Error("FileReader failed"));
      fr.readAsDataURL(blob);
    });

    if (ctl.signal.aborted) return null;

    const audioBase64 = dataUrl.split(",")[1] || "";
    if (!audioBase64) return null;

    const resp = await fetch("/api/speech/recognize-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: audioBase64 }),
      signal: ctl.signal,
    });

    if (!resp.ok) return null;

    const json = await resp.json();
    const alts: string[] = Array.isArray(json?.alternatives)
      ? json.alternatives
          .map((a: any) => (typeof a?.text === "string" ? a.text.trim() : ""))
          .filter(Boolean)
      : [];

    if (alts.length === 0 && typeof json?.text === "string" && json.text.trim()) {
      alts.push(json.text.trim());
    }

    return alts.length > 0 ? alts : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

/** 将文本切分为词项（小写化、去标点） */
export function tokenizeWords(text: string): WordToken[] {
  if (!text) return [];
  const rawParts = text.trim().split(/[\s—–-]+/);
  const tokens: WordToken[] = [];
  for (const part of rawParts) {
    const norm = part.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!norm) continue;
    const display = part.replace(/^[^a-zA-Z0-9']+|[^a-zA-Z0-9']+$/g, "") || norm;
    tokens.push({ display, norm });
  }
  return tokens;
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array<number>(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function phoneticSkeleton(word: string): string {
  const normalized = word
    .toLowerCase()
    .replace(/^kn/, "n")
    .replace(/^wr/, "r")
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/gh/g, "")
    .replace(/ce/g, "se")
    .replace(/ci/g, "si")
    .replace(/cy/g, "sy")
    .replace(/c/g, "k")
    .replace(/q/g, "k")
    .replace(/x/g, "ks")
    .replace(/(.)\1+/g, "$1");
  if (!normalized) return "";
  return normalized[0] + normalized.slice(1).replace(/[aeiouy]/g, "");
}

function similarityRank(refNorm: string, heardNorm: string): number {
  if (!refNorm || !heardNorm || refNorm === heardNorm) return 0;
  if (refNorm.length < 2 || heardNorm.length < 2) return 0;

  const dist = editDistance(refNorm, heardNorm);
  const maxLen = Math.max(refNorm.length, heardNorm.length);
  const pA = phoneticSkeleton(refNorm);
  const pB = phoneticSkeleton(heardNorm);

  if (pA && pA === pB) {
    if (pA.length >= 2 || dist <= 2) return 300 - dist;
  }
  if (maxLen >= 3 && dist === 1) return 250;
  if (maxLen >= 5 && dist <= 2) return 200 - dist;
  if (maxLen === 2 && dist === 1 && refNorm[0] === heardNorm[0]) return 180;
  return 0;
}

/** 计算两个词序列的最长公共子序列匹配对 [(refIdx, heardIdx)] */
function alignLcs(ref: WordToken[], heard: WordToken[]): [number, number][] {
  const m = ref.length;
  const n = heard.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (ref[i].norm === heard[j].norm) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (ref[i].norm === heard[j].norm) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/**
 * 将参考文本与转写候选逐词对齐比对：
 * - 优先选用匹配词数最多的真实转写候选（同分取置信度最高的首条）；
 * - 未在对齐位置出现的参考词标为「没听清」；
 * - 同一未对齐片段内若存在发音/拼写相近的真实转写词，附带「听起来像 X」。
 */
export function compareTranscriptWords(
  referenceText: string,
  alternatives: string[] | null | undefined
): WordSignalComparison | null {
  const refTokens = tokenizeWords(referenceText);
  if (refTokens.length === 0 || !alternatives || alternatives.length === 0) {
    return null;
  }

  let bestHeard: WordToken[] | null = null;
  let bestPairs: [number, number][] = [];

  for (const alt of alternatives) {
    const heardTokens = tokenizeWords(alt);
    if (heardTokens.length === 0) continue;
    const pairs = alignLcs(refTokens, heardTokens);
    if (!bestHeard || pairs.length > bestPairs.length) {
      bestHeard = heardTokens;
      bestPairs = pairs;
    }
  }

  if (!bestHeard) return null;

  const missedWords: MissedWordSignal[] = [];
  const anchors: [number, number][] = [
    ...bestPairs,
    [refTokens.length, bestHeard.length],
  ];

  let refStart = 0;
  let heardStart = 0;

  for (const [refAnchor, heardAnchor] of anchors) {
    const usedHeardIndices = new Set<number>();
    for (let r = refStart; r < refAnchor; r++) {
      const refTok = refTokens[r];
      let bestCandidateIdx = -1;
      let bestScore = 0;

      for (let h = heardStart; h < heardAnchor; h++) {
        if (usedHeardIndices.has(h)) continue;
        const score = similarityRank(refTok.norm, bestHeard[h].norm);
        if (score > bestScore) {
          bestScore = score;
          bestCandidateIdx = h;
        }
      }

      if (bestCandidateIdx !== -1) {
        usedHeardIndices.add(bestCandidateIdx);
        missedWords.push({
          display: refTok.display,
          norm: refTok.norm,
          heardLike: bestHeard[bestCandidateIdx].display,
        });
      } else {
        missedWords.push({
          display: refTok.display,
          norm: refTok.norm,
        });
      }
    }
    refStart = refAnchor + 1;
    heardStart = heardAnchor + 1;
  }

  return {
    totalRefWords: refTokens.length,
    missedWords,
    allMatched: missedWords.length === 0,
  };
}
