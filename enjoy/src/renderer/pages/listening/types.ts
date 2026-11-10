// SunnyBridge 听力播放器 — 共享类型定义
// 生成自工单 2（2026-11-10 修订版）

export interface ListeningSentence {
  i: number;
  start: number;
  end: number;
  text: string;
  zh?: string; // A1/A2 有逐句中文，B1/world 无
}

export interface VocabEntry {
  w: string;
  ipa?: string;
  pos?: string;
  ctx?: string;
  dict?: string;
  phrase?: string;
  forms?: string[];
}

// phrases: 以句子序号为 key 的 object，value 是短语数组
export type PhrasesMap = Record<string, Array<{ en: string; zh: string }>>;

export interface ListeningChapter {
  book: string;
  chapter: number | string;
  title: string;
  title_zh?: string;
  station_id?: string;
  region?: string;
  image_url?: string;
  duration: number;
  peaks?: number[];
  sentences: ListeningSentence[];
  phrases: PhrasesMap;
  vocab: VocabEntry[];
  level: string;
  level_source?: string;
  level_status?: string;
  level_metrics?: Record<string, unknown>;
  assess?: Record<string, unknown>;
  summary_zh?: string;
  zh_full?: string;
}

export interface CatalogEntry {
  book: string;
  chapter: string;
  title_en: string;
  title_zh: string;
  level: string;
  duration: number;
  sentence_count: number;
  has_zh: boolean;
  audio_url: string;
  json_url: string;
}

export interface BookMeta {
  book: string;
  title_zh: string;
  title_en: string;
  cover_url?: string;
  chapters: CatalogEntry[];
}

export interface Catalog {
  books: BookMeta[];
  chapters: CatalogEntry[];
}

export interface ListeningProgress {
  finished: Record<string, Record<string, boolean>>;
  favSentences: Record<string, Record<string, number[]>>;
  favWords: Record<string, Record<string, string[]>>;
}
