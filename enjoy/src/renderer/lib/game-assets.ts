// 阳光桥少儿英语 · G1 试点区游戏资产路径与过场脚本数据
// 资产位于 enjoy/public/assets/game/，URL 路径以 /assets/game/ 开头

export type SpeakerId = "narrator" | "gangan" | "pam" | "sam" | "dad";

export interface SpeakerMeta {
  id: SpeakerId;
  name: string;
  portrait?: string;
}

export const SPEAKERS: Record<SpeakerId, SpeakerMeta> = {
  narrator: {
    id: "narrator",
    name: "旁白",
  },
  gangan: {
    id: "gangan",
    name: "敢敢",
    portrait: "/assets/game/chr/gangan-listen.webp",
  },
  pam: {
    id: "pam",
    name: "Pam",
    portrait: "/assets/game/chr/pam-stand.webp",
  },
  sam: {
    id: "sam",
    name: "Sam",
    portrait: "/assets/game/chr/sam-stand.webp",
  },
  dad: {
    id: "dad",
    name: "Dad",
    portrait: "/assets/game/chr/dad-stand.webp",
  },
};

export interface DialogueLine {
  speaker: SpeakerId;
  text: string;
  voiceId?: string;
  portrait?: string;
}

export interface CutscenePanel {
  image: string;
  lines: DialogueLine[];
}

export interface CutsceneConfig {
  id: "CS-00" | "CS-G1-IN" | "CS-R03-PRE" | "CS-R03-FINAL" | "CS-R04-ARR" | "CS-R04";
  title: string;
  mode: "cut-a" | "cut-b";
  backgroundImage?: string;
  panels: CutscenePanel[];
}

// 资产路径常量表
export const GAME_ASSETS = {
  cut: {
    cs00_01: "/assets/game/cut/cs00-01.webp",
    cs00_02: "/assets/game/cut/cs00-02.webp",
    cs00_03: "/assets/game/cut/cs00-03.webp",
    cs00_04: "/assets/game/cut/cs00-04.webp",
    cs00_05: "/assets/game/cut/cs00-05.webp",
    cs00_06: "/assets/game/cut/cs00-06.webp",
    csr03_pre: "/assets/game/cut/csr03-pre.webp",
    csr03_final: "/assets/game/cut/csr03-final.webp",
    csr04_01: "/assets/game/cut/csr04-01.webp",
    csr04_02: "/assets/game/cut/csr04-02.webp",
    csr04_03: "/assets/game/cut/csr04-03.webp",
    csr04_04: "/assets/game/cut/csr04-04.webp",
  },
  scenes: {
    breezeDock: {
      base: "/assets/game/scenes/breeze-dock.webp",
      silent: "/assets/game/scenes/breeze-dock-silent.webp",
      lit: "/assets/game/scenes/breeze-dock-lit.webp",
    },
    appleLighthouse: {
      base: "/assets/game/scenes/apple-lighthouse.webp",
      silent: "/assets/game/scenes/apple-lighthouse-silent.webp",
      lit: "/assets/game/scenes/apple-lighthouse-lit.webp",
    },
    tigerTrail: {
      base: "/assets/game/scenes/tiger-trail.webp",
      silent: "/assets/game/scenes/tiger-trail-silent.webp",
      lit: "/assets/game/scenes/tiger-trail-lit.webp",
    },
    pigCamp: {
      base: "/assets/game/scenes/pig-camp.webp",
      silent: "/assets/game/scenes/pig-camp-silent.webp",
      lit: "/assets/game/scenes/pig-camp-lit.webp",
    },
  },
  world: {
    main: "/assets/game/world/wld-main.webp",
    mainLit: "/assets/game/world/wld-main-lit.webp",
    consonantZoom: "/assets/game/world/wld-consonant-zoom.webp",
  },
  chr: {
    ganganListen: "/assets/game/chr/gangan-listen.webp",
    ganganPoint: "/assets/game/chr/gangan-point.webp",
    ganganCheer: "/assets/game/chr/gangan-cheer.webp",
    ganganThink: "/assets/game/chr/gangan-think.webp",
    ganganWorried: "/assets/game/chr/gangan-worried.webp",
    ganganCompass: "/assets/game/chr/gangan-compass.webp",
    ganganSit: "/assets/game/chr/gangan-sit.webp",
    ganganHelp: "/assets/game/chr/gangan-help.webp",
    ganganBase: "/assets/game/chr/gangan-base.webp",
    pamStand: "/assets/game/chr/pam-stand.webp",
    samStand: "/assets/game/chr/sam-stand.webp",
    dadStand: "/assets/game/chr/dad-stand.webp",
    dadPot: "/assets/game/chr/dad-pot.webp",
    decoderBack: "/assets/game/chr/decoder-back.webp",
    decoderProfile: "/assets/game/chr/decoder-profile.webp",
  },
  props: {
    compassOff: "/assets/game/props/compass-off.webp",
    compassDim: "/assets/game/props/compass-dim.webp",
    compassLit: "/assets/game/props/compass-lit.webp",
    beaconOff: "/assets/game/props/beacon-off.webp",
    beaconHalf: "/assets/game/props/beacon-half.webp",
    beaconLit: "/assets/game/props/beacon-lit.webp",
    relicBaseOff: "/assets/game/props/relic-base-off.webp",
    relicBaseLit: "/assets/game/props/relic-base-lit.webp",
    logpage01Art: "/assets/game/props/logpage-01-art.webp",
  },
  fx: {
    hushFog1: "/assets/game/fx/fx-hush-fog-1.webp",
    hushFog2: "/assets/game/fx/fx-hush-fog-2.webp",
    hushFog3: "/assets/game/fx/fx-hush-fog-3.webp",
    lightburst: "/assets/game/fx/fx-lightburst.webp",
    soundwave: "/assets/game/fx/fx-soundwave.webp",
    starfall: "/assets/game/fx/fx-starfall.webp",
    campfireGlow: "/assets/game/fx/fx-campfire-glow.webp",
  },
  svg: {
    iconsSprite: "/assets/game/svg/icons-sprite.svg",
    statusSprite: "/assets/game/svg/status-sprite.svg",
    colBadgeG1: "/assets/game/svg/col-badge-g1.svg",
  },
} as const;

// 过场脚本数据（台词文本逐字取自工单第 4 节定稿原文，不得篡改）
export const CUTSCENE_SCRIPTS: Record<
  "CS-00" | "CS-G1-IN" | "CS-R03-PRE" | "CS-R03-FINAL" | "CS-R04-ARR" | "CS-R04",
  CutsceneConfig
> = {
  "CS-00": {
    id: "CS-00",
    title: "迷雾降临 · 开场故事",
    mode: "cut-a",
    panels: [
      {
        image: GAME_ASSETS.cut.cs00_01,
        lines: [
          {
            speaker: "narrator",
            text: "那天夜里，雾从海上漫过来，地图上的灯，一盏一盏灭了。",
            voiceId: "cs00-01-narr",
          },
        ],
      },
      {
        image: GAME_ASSETS.cut.cs00_02,
        lines: [
          {
            speaker: "gangan",
            text: "地图哑了。灯塔不响，桥不响，营地的钟也不响。",
            voiceId: "cs00-02-gangan-a",
            portrait: SPEAKERS.gangan.portrait,
          },
          {
            speaker: "gangan",
            text: "地图有它自己的语言，日志都用它写——你学的，就是它。",
            voiceId: "cs00-02-gangan-b",
            portrait: SPEAKERS.gangan.portrait,
          },
        ],
      },
      {
        image: GAME_ASSETS.cut.cs00_03,
        lines: [
          {
            speaker: "gangan",
            text: "航线我背得比谁都熟。就一样——信号，我听不见。",
            voiceId: "cs00-03-gangan-a",
            portrait: SPEAKERS.gangan.portrait,
          },
          {
            speaker: "gangan",
            text: "这条航线上，现在只有你能听见。",
            voiceId: "cs00-03-gangan-b",
            portrait: SPEAKERS.gangan.portrait,
          },
        ],
      },
      {
        image: GAME_ASSETS.cut.cs00_04,
        lines: [
          {
            speaker: "gangan",
            text: "有反应了……第一个信号，在微风码头。",
            voiceId: "cs00-04-gangan",
            portrait: SPEAKERS.gangan.portrait,
          },
        ],
      },
      {
        image: GAME_ASSETS.cut.cs00_05,
        lines: [
          {
            speaker: "narrator",
            text: "四个岛，三十九个站点。雾在前面等着。",
            voiceId: "cs00-05-narr",
          },
        ],
      },
      {
        image: GAME_ASSETS.cut.cs00_06,
        lines: [
          {
            speaker: "gangan",
            text: "敢敢说真的——我们把它，一个一个喊回来。",
            voiceId: "cs00-06-gangan",
            portrait: SPEAKERS.gangan.portrait,
          },
        ],
      },
    ],
  },

  "CS-G1-IN": {
    id: "CS-G1-IN",
    title: "微风码头 · 到达",
    mode: "cut-b",
    backgroundImage: GAME_ASSETS.scenes.breezeDock.silent,
    panels: [
      {
        image: GAME_ASSETS.scenes.breezeDock.silent,
        lines: [
          {
            speaker: "gangan",
            text: "微风码头。雾最厚的地方，信号反倒最清楚。",
            voiceId: "g1in-01-gangan",
            portrait: SPEAKERS.gangan.portrait,
          },
          {
            speaker: "gangan",
            text: "侧耳听——风里有东西在响。",
            voiceId: "g1in-02-gangan",
            portrait: SPEAKERS.gangan.portrait,
          },
        ],
      },
    ],
  },

  "CS-R03-PRE": {
    id: "CS-R03-PRE",
    title: "虎爪小径 · 前情",
    mode: "cut-a",
    panels: [
      {
        image: GAME_ASSETS.cut.csr03_pre,
        lines: [
          {
            speaker: "pam",
            text: "这条路以前会自己唱歌的。词就是它的歌。",
            voiceId: "csr03-pre-pam",
            portrait: SPEAKERS.pam.portrait,
          },
        ],
      },
    ],
  },

  "CS-R03-FINAL": {
    id: "CS-R03-FINAL",
    title: "虎爪小径 · 定格",
    mode: "cut-a",
    panels: [
      {
        image: GAME_ASSETS.cut.csr03_final,
        lines: [
          {
            speaker: "pam",
            // 工单第 2 节：字幕用定稿全文「sat……路出声了。第一个词，是我亲眼看着它回来的。」
            // 音频只含后半句为已知口径，字幕与音频均不篡改。
            text: "sat……路出声了。第一个词，是我亲眼看着它回来的。",
            voiceId: "csr03-final-pam",
            portrait: SPEAKERS.pam.portrait,
          },
        ],
      },
    ],
  },

  "CS-R04-ARR": {
    id: "CS-R04-ARR",
    title: "猪鼻营地 · 到达",
    mode: "cut-b",
    backgroundImage: GAME_ASSETS.scenes.pigCamp.silent,
    panels: [
      {
        image: GAME_ASSETS.scenes.pigCamp.silent,
        lines: [
          {
            speaker: "dad",
            text: "雾进不来的地方，才叫营地。先吃饭。",
            voiceId: "r04-arr-dad",
            portrait: SPEAKERS.dad.portrait,
          },
          {
            speaker: "gangan",
            text: "对了——看看我在码头捡到了什么。",
            voiceId: "r04-arr-gangan",
            portrait: SPEAKERS.gangan.portrait,
          },
        ],
      },
    ],
  },

  "CS-R04": {
    id: "CS-R04",
    title: "老船长的日志 · 揭示",
    mode: "cut-a",
    panels: [
      {
        image: GAME_ASSETS.cut.csr04_01,
        lines: [
          {
            speaker: "gangan",
            text: "老船长的日志。雾来的那天，他沿这条路走过。",
            voiceId: "csr04-01-gangan",
            portrait: SPEAKERS.gangan.portrait,
          },
        ],
      },
      {
        image: GAME_ASSETS.cut.csr04_02,
        lines: [
          {
            speaker: "pam",
            text: "怎么只有几个词？",
            voiceId: "csr04-02-pam",
            portrait: SPEAKERS.pam.portrait,
          },
        ],
      },
      {
        image: GAME_ASSETS.cut.csr04_03,
        lines: [
          {
            speaker: "gangan",
            text: "不是它不写。是我们还没学会听全。",
            voiceId: "csr04-03-gangan-a",
            portrait: SPEAKERS.gangan.portrait,
          },
          {
            speaker: "gangan",
            text: "等你学会更多声音，这一页会自己长出字来。",
            voiceId: "csr04-03-gangan-b",
            portrait: SPEAKERS.gangan.portrait,
          },
        ],
      },
      {
        image: GAME_ASSETS.cut.csr04_04,
        lines: [
          {
            speaker: "sam",
            text: "那他现在在哪儿？",
            voiceId: "csr04-04-sam",
            portrait: SPEAKERS.sam.portrait,
          },
          {
            speaker: "gangan",
            text: "走完这条路，就知道了。",
            voiceId: "csr04-04-gangan",
            portrait: SPEAKERS.gangan.portrait,
          },
        ],
      },
    ],
  },
};
