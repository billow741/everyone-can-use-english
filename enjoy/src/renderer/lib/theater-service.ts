export interface TheaterRole {
  id: string;
  name: string;
  avatar: string;
}

export interface TheaterScriptLine {
  role: string;
  time: string; // e.g. "00:02"
  text: string;
  zh: string;
}

export interface TheaterScenario {
  id: string;
  title: string;
  titleZh: string;
  category: string;
  icon: string;
  tagline: string;
  videoUrl: string;
  posterUrl: string;
  roles: TheaterRole[];
  script: TheaterScriptLine[];
}

export interface TheaterCatalog {
  version: string;
  totalCount: number;
  theaters: TheaterScenario[];
}

export interface UserTheaterProgress {
  completedTheaters: string[];
  theaterStars: Record<string, number>;
  roleScores: Record<string, number>;
  totalStars: number;
}

const THEATER_PROGRESS_KEY = "sunnybridge_theater_progress_v1";
let cachedCatalog: TheaterCatalog | null = null;

export async function getTheaterCatalog(): Promise<TheaterCatalog> {
  if (cachedCatalog) return cachedCatalog;
  try {
    const res = await fetch("/assets/tmm/theater/tmm_theater_catalog.json");
    if (!res.ok) throw new Error("Failed to load theater catalog");
    const data = await res.json();
    cachedCatalog = data;
    return data;
  } catch (err) {
    console.error("Error loading theater catalog:", err);
    return { version: "1.0.0", totalCount: 0, theaters: [] };
  }
}

export async function getTheaterById(id: string): Promise<TheaterScenario | null> {
  const catalog = await getTheaterCatalog();
  return catalog.theaters.find((t) => t.id === id) || null;
}

export function getUserTheaterProgress(): UserTheaterProgress {
  try {
    const raw = localStorage.getItem(THEATER_PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read theater progress:", err);
  }
  return {
    completedTheaters: [],
    theaterStars: {},
    roleScores: {},
    totalStars: 0,
  };
}

export function recordTheaterCompletion(
  theaterId: string,
  roleId: string,
  stars: number,
  score: number
): UserTheaterProgress {
  const prog = getUserTheaterProgress();
  if (!prog.completedTheaters.includes(theaterId)) {
    prog.completedTheaters.push(theaterId);
  }
  const prevStar = prog.theaterStars[theaterId] || 0;
  if (stars > prevStar) {
    prog.theaterStars[theaterId] = stars;
    prog.totalStars += stars - prevStar;
  }
  prog.roleScores[`${theaterId}_${roleId}`] = Math.max(
    prog.roleScores[`${theaterId}_${roleId}`] || 0,
    score
  );
  try {
    localStorage.setItem(THEATER_PROGRESS_KEY, JSON.stringify(prog));
  } catch (e) {
    console.error("Failed to save theater progress:", e);
  }
  return prog;
}
