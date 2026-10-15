export interface CultureKeyword {
  word: string;
  ipa: string;
  zh: string;
}

export interface CultureQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CultureSlide {
  id: string;
  rawId: string;
  title: string;
  titleZh: string;
  region: string;
  stamp: string;
  tagline: string;
  intro: string;
  contentEn: string;
  contentZh: string;
  imageUrl: string;
  keyWords: CultureKeyword[];
  quiz: CultureQuiz;
}

export interface CultureCatalog {
  version: string;
  totalCount: number;
  slides: CultureSlide[];
}

export interface UserPassport {
  collectedStamps: string[];
  quizPassedSlides: string[];
  totalCoins: number;
}

const PASSPORT_KEY = "sunnybridge_culture_passport_v1";
let cachedCultureCatalog: CultureCatalog | null = null;

export async function getCultureCatalog(): Promise<CultureCatalog> {
  if (cachedCultureCatalog) return cachedCultureCatalog;
  try {
    const res = await fetch("/assets/tmm/culture/tmm_culture_catalog.json");
    if (!res.ok) throw new Error("Failed to load culture catalog");
    const data = await res.json();
    cachedCultureCatalog = data;
    return data;
  } catch (err) {
    console.error("Error loading culture catalog:", err);
    return { version: "1.0.0", totalCount: 0, slides: [] };
  }
}

export async function getCultureSlideById(id: string): Promise<CultureSlide | null> {
  const catalog = await getCultureCatalog();
  return (
    catalog.slides.find((s) => s.id === id || s.rawId === id) || null
  );
}

export function getUserPassport(): UserPassport {
  try {
    const raw = localStorage.getItem(PASSPORT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read user passport:", err);
  }
  return {
    collectedStamps: [],
    quizPassedSlides: [],
    totalCoins: 0,
  };
}

export function recordPassportStamp(
  slideId: string,
  bonusCoins = 10
): UserPassport {
  const pass = getUserPassport();
  if (!pass.collectedStamps.includes(slideId)) {
    pass.collectedStamps.push(slideId);
  }
  if (!pass.quizPassedSlides.includes(slideId)) {
    pass.quizPassedSlides.push(slideId);
    pass.totalCoins += bonusCoins;
  }
  try {
    localStorage.setItem(PASSPORT_KEY, JSON.stringify(pass));
  } catch (e) {
    console.error("Failed to save passport:", e);
  }
  return pass;
}
