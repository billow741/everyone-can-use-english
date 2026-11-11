#!/usr/bin/env node
// 数据管道脚本：从生产线产物生成 /listening-data/v1/ 静态目录与 catalog.json
// 用法：node tools/build-listening-data.mjs \
//         --prod <prod_dir> \
//         --asr <asr_dir> \
//         --pack <pack_dir> \
//         --allowlist <allowlist.json> \
//         --out <output_dir>
//
// allowlist.json 格式：["book/chapter", ...] 如 ["wizard_of_oz/01", "world/01"]
// world 章节音频从 prod/world-audio/<chapter>.mp3 拷贝，不走 asr 映射

import fs from "fs";
import path from "path";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";

// ---- 解析命令行 ----
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    opts[key] = args[i + 1];
  }
  const required = ["prod", "asr", "pack", "allowlist", "out"];
  for (const r of required) {
    if (!opts[r]) {
      console.error(`缺少参数 --${r}`);
      process.exit(1);
    }
  }
  return opts;
}

// ---- 书目元数据（中文名维护表）----
const BOOK_META = {
  treasury_beatrixpotter_0910: {
    title_zh: "彼得兔合集",
    title_en: "The Great Big Treasury of Beatrix Potter",
  },
  velveteenduet_librivox: {
    title_zh: "绒布小兔",
    title_en: "The Velveteen Rabbit",
  },
  wizard_of_oz: {
    title_zh: "绿野仙踪",
    title_en: "The Wonderful Wizard of Oz",
  },
  story_of_doctor_dolittle_librivox: {
    title_zh: "杜立特医生",
    title_en: "The Story of Doctor Dolittle",
  },
  just_so_stories: {
    title_zh: "原来如此",
    title_en: "Just So Stories",
  },
  winniethepooh_2201_librivox: {
    title_zh: "小熊维尼",
    title_en: "Winnie-the-Pooh",
  },
  childs_garden_verses_librivox: {
    title_zh: "儿童诗园",
    title_en: "A Child's Garden of Verses",
  },
  aesopforchildren_1308_librivox: {
    title_zh: "伊索寓言",
    title_en: "The Aesop for Children",
  },
  world: {
    title_zh: "环球漫游",
    title_en: "Around the World",
  },
};

function getBookMeta(bookId) {
  return BOOK_META[bookId] ?? {
    title_zh: bookId,
    title_en: bookId,
  };
}

// ---- 章节号格式化 ----
function padChapter(ch) {
  return String(ch).padStart(2, "0");
}

// ---- 从 ASR 目录中查找与章节匹配的 JSON 文件（文件名含 _NN_ 段；单文件书兜底）----
function findAsrFile(asrBookDir, chapterNum) {
  if (!fs.existsSync(asrBookDir)) return null;
  const files = fs.readdirSync(asrBookDir).filter((f) => f.endsWith(".json"));
  const padded = padChapter(chapterNum);
  // 1. 优先匹配 _NN_ 或 _N_ 格式（如 wizardofoz_01_baum_64kb.json）
  for (const f of files) {
    const m = f.match(/_(\d+)_/);
    if (m && padChapter(m[1]) === padded) return path.join(asrBookDir, f);
  }

  // 2. 兜底：单文件书（ASR 文件名无 _NN_ 段，如 velveteenrabbit_duet_williams_64kb.json）
  // 筛出内容含 audio_file 字段的章节文件（排除 summary.json 等）
  const candidates = [];
  for (const f of files) {
    try {
      const fullPath = path.join(asrBookDir, f);
      const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
      if (parsed && typeof parsed === "object" && Boolean(parsed.audio_file)) {
        candidates.push(fullPath);
      }
    } catch {
      // 忽略无法解析的 json
    }
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  if (candidates.length > 1) {
    console.warn(
      `单文件书兜底失败：ASR 目录下找到多个含 audio_file 的文件 (${candidates.length})，无法唯一匹配：${asrBookDir}`
    );
  }
  return null;
}

// ---- 拷贝文件（字节一致）----
async function copyFile(src, dest) {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await pipeline(createReadStream(src), createWriteStream(dest));
}

// ---- 主函数 ----
async function main() {
  const opts = parseArgs();
  const prodDir = path.resolve(opts.prod);
  const asrDir = path.resolve(opts.asr);
  const packDir = path.resolve(opts.pack);
  const outDir = path.resolve(opts.out);
  const allowlistPath = path.resolve(opts.allowlist);

  // 读取 allowlist
  const allowlist = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  const allowSet = new Set(allowlist);
  console.log(`允许名单共 ${allowSet.size} 章节`);

  // 确保输出目录存在
  await fs.promises.mkdir(outDir, { recursive: true });

  // 收集结果
  const catalogChapters = [];
  const catalogBooks = {};

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of allowlist) {
    const slashIdx = entry.indexOf("/");
    if (slashIdx < 0) {
      console.warn(`允许名单格式错误（需 book/chapter）：${entry}`);
      skipped++;
      continue;
    }
    const bookId = entry.slice(0, slashIdx);
    const chapterStr = entry.slice(slashIdx + 1);
    const chapterNum = parseInt(chapterStr, 10);
    const chapterKey = padChapter(chapterNum);
    const isWorld = bookId === "world";

    // 1. 读取生产 JSON
    const prodJsonPath = path.join(prodDir, bookId, `${chapterKey}.json`);
    if (!fs.existsSync(prodJsonPath)) {
      console.warn(`生产 JSON 不存在，跳过：${prodJsonPath}`);
      skipped++;
      continue;
    }
    let prodData;
    try {
      prodData = JSON.parse(fs.readFileSync(prodJsonPath, "utf8"));
    } catch (e) {
      console.error(`生产 JSON 解析失败：${prodJsonPath}`, e.message);
      errors++;
      continue;
    }

    // 2. 确定音频源文件路径
    let audioSrc;
    if (isWorld) {
      // world：直接从 prod/world-audio/<chapter>.mp3
      audioSrc = path.join(prodDir, "world-audio", `${chapterKey}.mp3`);
      if (!fs.existsSync(audioSrc)) {
        console.warn(`world 音频不存在，跳过：${audioSrc}`);
        skipped++;
        continue;
      }
    } else {
      // 绘本：通过 ASR 文件的 audio_file 字段映射
      const asrBookDir = path.join(asrDir, bookId);
      const asrFile = findAsrFile(asrBookDir, chapterNum);
      if (!asrFile) {
        console.warn(`ASR 文件未找到（book=${bookId} chapter=${chapterKey}），跳过`);
        skipped++;
        continue;
      }
      let asrData;
      try {
        asrData = JSON.parse(fs.readFileSync(asrFile, "utf8"));
      } catch (e) {
        console.error(`ASR JSON 解析失败：${asrFile}`, e.message);
        errors++;
        continue;
      }
      const audioFileName = asrData.audio_file;
      if (!audioFileName) {
        console.warn(`ASR 文件无 audio_file 字段：${asrFile}`);
        skipped++;
        continue;
      }
      audioSrc = path.join(packDir, bookId, audioFileName);
      if (!fs.existsSync(audioSrc)) {
        console.warn(`音频文件不存在：${audioSrc}`);
        skipped++;
        continue;
      }
    }

    // 3. 写出生产 JSON（原样）
    const outJsonPath = path.join(outDir, bookId, `${chapterKey}.json`);
    await fs.promises.mkdir(path.dirname(outJsonPath), { recursive: true });
    fs.writeFileSync(outJsonPath, JSON.stringify(prodData, null, 2), "utf8");

    // 4. 拷贝音频
    const outAudioPath = path.join(outDir, bookId, `${chapterKey}.mp3`);
    await copyFile(audioSrc, outAudioPath);

    // 5. 组装 catalog 条目
    const bookMeta = getBookMeta(bookId);
    const hasZh = (prodData.sentences ?? []).some((s) => s.zh);
    const duration = prodData.duration ?? 0;
    const sentenceCount = (prodData.sentences ?? []).length;

    const catEntry = {
      book: bookId,
      chapter: chapterKey,
      title_en: prodData.title ?? `Chapter ${chapterKey}`,
      title_zh: prodData.title_zh ?? bookMeta.title_zh,
      level: prodData.level ?? "b1",
      duration,
      sentence_count: sentenceCount,
      has_zh: hasZh,
      audio_url: `/listening-data/v1/${bookId}/${chapterKey}.mp3`,
      json_url: `/listening-data/v1/${bookId}/${chapterKey}.json`,
    };
    catalogChapters.push(catEntry);

    // 收集 book 条目
    if (!catalogBooks[bookId]) {
      catalogBooks[bookId] = {
        book: bookId,
        title_zh: bookMeta.title_zh,
        title_en: bookMeta.title_en,
        cover_url: undefined,
        chapters: [],
      };
    }
    catalogBooks[bookId].chapters.push(catEntry);

    processed++;
    console.log(`✓ ${bookId}/${chapterKey} (${prodData.level ?? "?"}, ${Math.round(duration)}s, hasZh=${hasZh})`);
  }

  // 6. 写 catalog.json
  const catalog = {
    generated_at: new Date().toISOString(),
    books: Object.values(catalogBooks),
    chapters: catalogChapters,
  };
  const catalogPath = path.join(outDir, "catalog.json");
  
  // 如果已有 catalog，合并（新增行不改既有行）
  if (fs.existsSync(catalogPath)) {
    let existing;
    try {
      existing = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
    } catch {
      existing = { books: [], chapters: [] };
    }
    // 以新数据为准，按 book+chapter 去重
    const existingMap = new Map(
      (existing.chapters ?? []).map((c) => [`${c.book}/${c.chapter}`, c])
    );
    for (const ch of catalogChapters) {
      existingMap.set(`${ch.book}/${ch.chapter}`, ch);
    }
    catalog.chapters = [...existingMap.values()];

    // 重建 books
    const newBooksMap = new Map();
    for (const ch of catalog.chapters) {
      if (!newBooksMap.has(ch.book)) {
        const bm = getBookMeta(ch.book);
        newBooksMap.set(ch.book, {
          book: ch.book,
          title_zh: bm.title_zh,
          title_en: bm.title_en,
          cover_url: undefined,
          chapters: [],
        });
      }
      newBooksMap.get(ch.book).chapters.push(ch);
    }
    catalog.books = [...newBooksMap.values()];
  }

  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), "utf8");

  // 7. 结果汇报
  console.log(`\n========== 管道完成 ==========`);
  console.log(`处理成功：${processed} 章`);
  console.log(`跳过：${skipped} 章`);
  console.log(`错误：${errors} 章`);
  console.log(`catalog.json 总计：${catalog.chapters.length} 章，${catalog.books.length} 书`);
  console.log(`输出目录：${outDir}`);
  console.log(`==============================`);
}

main().catch((e) => {
  console.error("管道运行异常：", e);
  process.exit(1);
});
