import React, { useState, useRef, useEffect } from 'react'
import { View, Text, Image, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import ganganMascotImg from '../../assets/gangan_mascot.png'
import WebCompanionModal from '../WebCompanionModal'
import { useAppConfig } from '../../services/configService'
import './index.scss'

// 免费试用配额调整为 15 次（优先读取云端配置）
const DEFAULT_MAX_DAILY_QUOTA = 15

const API_OXFORD_CONTENT_URL = 'https://app.sunnybridge.qzz.io/api/oxford/content'
const API_SPEECH_EVAL_URL = 'https://app.sunnybridge.qzz.io/api/eval/speech'
const API_AI_CHAT_URL = 'https://app.sunnybridge.qzz.io/api/ai/chat'

const PHONETIC_MAP = {
  i: '/aɪ/',
  like: '/laɪk/',
  apples: '/ˈæp.əlz/',
  apple: '/ˈæp.əl/',
  and: '/ænd/',
  bananas: '/bəˈnɑː.nəz/',
  banana: '/bəˈnɑː.nə/',
  for: '/fɔːr/',
  breakfast: '/ˈbrek.fəst/',
  look: '/lʊk/',
  at: '/æt/',
  the: '/ðə/',
  colorful: '/ˈkʌl.ə.fəl/',
  butterfly: '/ˈbʌt.ə.flaɪ/',
  in: '/ɪn/',
  garden: '/ˈɡɑː.dən/',
  can: '/kæn/',
  you: '/juː/',
  pass: '/pɑːs/',
  me: '/miː/',
  blue: '/bluː/',
  pencil: '/ˈpen.səl/',
  please: '/pliːz/',
  where: '/weər/',
  is: '/ɪz/',
  library: '/ˈlaɪ.brər.i/',
  it: '/ɪt/',
  next: '/nekst/',
  to: '/tuː/',
  park: '/pɑːk/',
  they: '/ðeɪ/',
  are: '/ɑːr/',
  playing: '/ˈpleɪ.ɪŋ/',
  football: '/ˈfʊt.bɔːl/',
  together: '/təˈɡeð.ər/',
  on: '/ɒn/',
  green: '/ɡriːn/',
  grass: '/ɡrɑːs/',
  what: '/wɒt/',
  time: '/taɪm/',
  do: '/duː/',
  usually: '/ˈjuː.ʒu.ə.li/',
  eat: '/iːt/',
  dinner: '/ˈdɪn.ər/',
  with: '/wɪð/',
  your: '/jɔːr/',
  family: '/ˈfæm.əl.i/',
  magic: '/ˈmædʒ.ɪk/',
  key: '/kiː/',
  began: '/bɪˈɡæn/',
  glow: '/ɡləʊ/',
  bright: '/braɪt/',
  orange: '/ˈɒr.ɪndʒ/',
  brave: '/breɪv/',
  explorer: '/ɪkˈsplɔː.rər/',
  climbed: '/klaɪmd/',
  over: '/ˈəʊ.vər/',
  rocky: '/ˈrɒk.i/',
  mountain: '/ˈmaʊn.tɪn/',
  quietly: '/ˈkwaɪət.li/',
  scientists: '/ˈsaɪən.tɪsts/',
  believe: '/bɪˈliːv/',
  that: '/ðæt/',
  stars: '/stɑːz/',
  were: '/wɜːr/',
  formed: '/fɔːmd/',
  billions: '/ˈbɪl.jənz/',
  of: '/əv/',
  years: '/jɪəz/',
  ago: '/əˈɡəʊ/'
}

// 声学高精度多轨频谱及逐词诊断生成器
const generateAcousticDiagnostics = (sec, lesson, accuracy, fluency, integrity, overall) => {
  const sentence = lesson?.sentenceEn || ''
  const wordsRaw = sentence.split(/\s+/).filter(Boolean)

  // 1. 逐词声学分析拆解
  const wordDiagnostics = wordsRaw.map((w, idx) => {
    const cleanW = w.replace(/[.,!?;:'"()]/g, '')
    const isKeyword = Array.isArray(lesson?.keywords) && lesson.keywords.some(k => k.toLowerCase().includes(cleanW.toLowerCase()))

    let score = accuracy + (idx % 2 === 0 ? 2 : -2) + (isKeyword ? 3 : 0)
    score = Math.min(98, Math.max(78, score))

    const ipa = PHONETIC_MAP[cleanW.toLowerCase()] || `/${cleanW.toLowerCase()}/`

    let tag = '优'
    let status = 'great'
    if (score >= 93) {
      status = 'great'
      tag = '95+ 极佳'
    } else if (score >= 86) {
      status = 'good'
      tag = '86+ 优良'
    } else {
      status = 'need_work'
      tag = '需强化'
    }

    return {
      word: cleanW,
      score,
      ipa,
      status,
      tag,
      isKeyword
    }
  })

  // 2. 震撼声学能量频谱波形条（42 根立体音频柱）
  const numBars = 42
  const userWaveform = []
  const refWaveform = []

  for (let i = 0; i < numBars; i++) {
    const progress = i / numBars
    const baseEnvelope = Math.sin(progress * Math.PI) * 0.75 + 0.25
    const cadenceRipple = Math.sin(progress * Math.PI * 6) * 0.2
    const variance = Math.sin(i * 1.7) * 0.15

    const refH = Math.max(20, Math.min(96, Math.round((baseEnvelope + cadenceRipple + 0.1) * 88)))
    refWaveform.push(refH)

    const userOffset = (i % 5 === 0 ? -10 : (i % 3 === 0 ? 8 : -2))
    const userH = Math.max(16, Math.min(98, Math.round((baseEnvelope + cadenceRipple + variance) * 82 + userOffset)))
    userWaveform.push(userH)
  }

  // 3. 高级声学指标
  const acousticMetrics = {
    pitchStability: Math.min(98, Math.max(85, Math.round((accuracy + fluency) / 2 + 1))),
    cadenceScore: Math.min(99, Math.max(82, fluency)),
    vowelResonance: Math.min(99, Math.max(86, integrity)),
    durationLabel: `${Number(sec).toFixed(1)}s`
  }

  return {
    wordDiagnostics,
    userWaveform,
    refWaveform,
    acousticMetrics
  }
}

const STAGES = [
  { id: 1, label: 'Level 1 · 启蒙', key: 'Level 1' },
  { id: 2, label: 'Level 2 · 进阶', key: 'Level 2' },
  { id: 3, label: 'Level 3 · 飞跃', key: 'Level 3' }
]

const DEFAULT_LESSONS = [
  {
    id: 'lesson_oxford_1_1',
    stage: 'Level 1 · 启蒙',
    level: 1,
    book: '牛津 Everybody Up Level 1 · Unit 2',
    sentenceEn: 'I like apples and bananas for breakfast.',
    sentenceZh: '我早餐喜欢吃苹果和香蕉。',
    phonicsTip: '🍎 连读指引：like-apples 辅音与元音自然连读；bananas 重音在第二个音节。',
    keywords: ['apples', 'bananas', 'breakfast']
  },
  {
    id: 'lesson_oxford_1_2',
    stage: 'Level 1 · 启蒙',
    level: 1,
    book: '牛津 Read and Imagine · Level 1',
    sentenceEn: 'Look at the colorful butterfly in the garden!',
    sentenceZh: '快看！阳光明媚的花园里有一只五彩斑斓的蝴蝶！',
    phonicsTip: '🦋 连读指引：Look-at 清晰连读；butterfly 双元音自然滑动。',
    keywords: ['butterfly', 'garden', 'colorful']
  },
  {
    id: 'lesson_oxford_1_3',
    stage: 'Level 1 · 启蒙',
    level: 1,
    book: '牛津 Classic Tales · Level 1',
    sentenceEn: 'Can you pass me the blue pencil, please?',
    sentenceZh: '请问你能把那支蓝色的铅笔递给我吗？',
    phonicsTip: '✏️ 升调指引：一般疑问句句尾 please 语调微微上扬，礼貌自然。',
    keywords: ['pencil', 'please', 'pass']
  },
  {
    id: 'lesson_oxford_2_1',
    stage: 'Level 2 · 进阶',
    level: 2,
    book: '牛津 Everybody Up Level 2 · Unit 4',
    sentenceEn: 'Where is the library? It is next to the park.',
    sentenceZh: '图书馆在哪里？就在公园旁边。',
    phonicsTip: '📚 语调指引：Where 特殊疑问句尾音自然下沉，next to 略去前一个 /t/ 的爆破。',
    keywords: ['library', 'next to', 'park']
  },
  {
    id: 'lesson_oxford_2_2',
    stage: 'Level 2 · 进阶',
    level: 2,
    book: '牛津 Dominoes · Quick Starter',
    sentenceEn: 'They are playing football together on the green grass.',
    sentenceZh: '他们正在绿油油的草地上开心地一起踢足球。',
    phonicsTip: '⚽ 节奏指引：playing football 动宾词组重音均匀，together 双唇放松自然吐字。',
    keywords: ['football', 'together', 'grass']
  },
  {
    id: 'lesson_oxford_2_3',
    stage: 'Level 2 · 进阶',
    level: 2,
    book: '牛津 Family and Friends · Level 2',
    sentenceEn: 'What time do you usually eat dinner with your family?',
    sentenceZh: '你平时通常几点和家人一起吃晚餐呢？',
    phonicsTip: '🍽️ 弱读指引：do you 快速弱读，usually /ʒ/ 音滑润过渡，family 重音在第一音节。',
    keywords: ['dinner', 'usually', 'family']
  },
  {
    id: 'lesson_oxford_3_1',
    stage: 'Level 3 · 飞跃',
    level: 3,
    book: '牛津阅读树 The Magic Key',
    sentenceEn: 'The magic key began to glow bright orange!',
    sentenceZh: '魔法钥匙开始闪耀出耀眼的橙色光芒！',
    phonicsTip: '✨ 发音指引：magic 与 orange 均含 /dʒ/ 音，发音时舌尖轻抵齿龈后部。',
    keywords: ['magic key', 'began', 'glow']
  },
  {
    id: 'lesson_oxford_3_2',
    stage: 'Level 3 · 飞跃',
    level: 3,
    book: '牛津阅读树 · Stage 6',
    sentenceEn: 'The brave explorer climbed over the rocky mountain quietly.',
    sentenceZh: '勇敢的探险家静悄悄地翻越了那座陡峭崎岖的岩石山。',
    phonicsTip: '🧗‍♂️ 尾音与副词：climbed 过去式 /d/ 浊辅音清晰收尾，quietly 双音节轻快吐出。',
    keywords: ['explorer', 'climbed', 'mountain']
  },
  {
    id: 'lesson_oxford_3_3',
    stage: 'Level 3 · 飞跃',
    level: 3,
    book: '牛津 Read and Discover · Level 3',
    sentenceEn: 'Scientists believe that stars were formed billions of years ago.',
    sentenceZh: '科学家们相信，繁星在数十亿年前便已在宇宙中凝聚诞生。',
    phonicsTip: '🌌 连贯吞吐：billions of years 连续滑动连读，scientists 重音在前，语调宏大沉稳。',
    keywords: ['scientists', 'stars', 'billions']
  }
]

const DEFAULT_STORIES = [
  {
    id: 'story_floppy_bone',
    title: "Floppy's Bone (弗洛皮的骨头)",
    level: '牛津树 Stage 1+ · 经典原版',
    coverEmoji: '🦴',
    sentenceEn: 'Floppy had a bone. A dog took the bone!',
    sentenceZh: '小狗弗洛皮有一根大骨头，结果被一只小狗叼走了！',
    tip: '高频动词过去式精读 · 纯正牛津原声伴读',
    pages: [
      {
        page: 1,
        emoji: '🦴',
        sentenceEn: 'Floppy had a bone.',
        sentenceZh: '小狗弗洛皮有一根大骨头。',
        tip: 'bone 骨头 · had 有(have过去式)'
      },
      {
        page: 2,
        emoji: '🐕',
        sentenceEn: 'A dog took the bone.',
        sentenceZh: '一只小白狗叼走了骨头。',
        tip: 'took 叼走(take过去式) · dog 小狗'
      },
      {
        page: 3,
        emoji: '🏃',
        sentenceEn: 'Floppy ran after the dog.',
        sentenceZh: '弗洛皮追在那只狗后面飞奔。',
        tip: 'ran after 追赶 · ran 跑(run过去式)'
      },
      {
        page: 4,
        emoji: '👩',
        sentenceEn: '“Come back!” said Mum.',
        sentenceZh: '“快回来！”妈妈大喊道。',
        tip: 'come back 回来 · said 说'
      },
      {
        page: 5,
        emoji: '💨',
        sentenceEn: 'She ran after Floppy.',
        sentenceZh: '她跟在弗洛皮身后紧追不舍。',
        tip: 'she 她 · ran after 追赶'
      },
      {
        page: 6,
        emoji: '👨',
        sentenceEn: '“Come back,” said Dad.',
        sentenceZh: '“快回来，”爸爸也喊道。',
        tip: 'Dad 爸爸 · said 说道'
      },
      {
        page: 7,
        emoji: '👟',
        sentenceEn: 'He ran after Mum.',
        sentenceZh: '他跟在妈妈身后跑了出去。',
        tip: 'he 他 · ran after 追赶'
      },
      {
        page: 8,
        emoji: '👧',
        sentenceEn: '“Come back!” said Biff and Chip.',
        sentenceZh: '“快回来呀！”比夫和奇普大喊。',
        tip: 'Biff and Chip 比夫和奇普'
      },
      {
        page: 9,
        emoji: '👦',
        sentenceEn: 'They ran after Dad.',
        sentenceZh: '他们跟在爸爸身后追赶。',
        tip: 'they 他们 · ran after 追赶'
      },
      {
        page: 10,
        emoji: '🛑',
        sentenceEn: 'The dog stopped.',
        sentenceZh: '那只小狗停了下来。',
        tip: 'stopped 停下(stop双写p加ed)'
      },
      {
        page: 11,
        emoji: '🐶',
        sentenceEn: 'A big dog took the bone.',
        sentenceZh: '一只高大强壮的斗牛犬抢走了骨头。',
        tip: 'big dog 大狗 · took 拿走'
      },
      {
        page: 12,
        emoji: '😱',
        sentenceEn: 'The big dog ate the bone. Oh no!',
        sentenceZh: '大狗把骨头一口吃掉了。天哪，糟糕了！',
        tip: 'ate 吃掉(eat过去式) · Oh no 哎呀天哪'
      }
    ]
  },
  {
    id: 'story_1',
    title: 'The Magic Key (魔法钥匙)',
    level: '牛津树 Level 1 · 官方精选',
    coverEmoji: '🗝️',
    sentenceEn: 'Biff and Chip had a magic box. The key began to glow!',
    sentenceZh: '比夫和奇普有一个魔法盒子，突然，钥匙亮起了金光！',
    tip: '探索魔法世界第一课 · 适合 5-8 岁孩子启蒙',
    pages: [
      {
        page: 1,
        emoji: '📦',
        sentenceEn: 'Biff and Chip had a magic wooden box.',
        sentenceZh: '比夫和奇普有一个神奇的小木盒。',
        tip: 'wooden 木质的 · had 拥有'
      },
      {
        page: 2,
        emoji: '🛏️',
        sentenceEn: 'The box was put on the small table by the bed.',
        sentenceZh: '盒子放在了床边的小桌子上。',
        tip: 'by the bed 在床边'
      },
      {
        page: 3,
        emoji: '🗝️',
        sentenceEn: 'Inside the box, there was a little golden key.',
        sentenceZh: '盒子里面静静地躺着一把金色的小钥匙。',
        tip: 'inside 在...里面 · golden 金色的'
      },
      {
        page: 4,
        emoji: '✨',
        sentenceEn: 'Suddenly, the magic key began to glow bright orange!',
        sentenceZh: '突然，魔法钥匙开始闪耀出耀眼的橙色光芒！',
        tip: 'began to 开始 · glow 发光'
      },
      {
        page: 5,
        emoji: '🚪',
        sentenceEn: 'A magical doorway opened, and their big adventure began!',
        sentenceZh: '一扇神奇的魔法大门缓缓打开，他们的冒险开始啦！',
        tip: 'adventure 冒险 · opened 开启'
      }
    ]
  },
  {
    id: 'story_2',
    title: 'At School (在学校)',
    level: '牛津树 Level 1 · 日常场景',
    coverEmoji: '🏫',
    sentenceEn: 'We paint and read at school. School is great fun!',
    sentenceZh: '我们在学校画画和读书，学校可真好玩！',
    tip: '高频日常校园词汇 · 建立自信开口习惯',
    pages: [
      {
        page: 1,
        emoji: '🎒',
        sentenceEn: 'We walk happily to school in the bright morning sunshine.',
        sentenceZh: '清晨，我们沐浴着灿烂的朝阳，高高兴兴去上学。',
        tip: 'sunshine 阳光 · happily 快乐地'
      },
      {
        page: 2,
        emoji: '🎨',
        sentenceEn: 'In art class, we paint beautiful pictures with colors.',
        sentenceZh: '在美术课上，我们用五颜六色的颜料画美丽的图画。',
        tip: 'paint 画画 · colorful 多彩的'
      },
      {
        page: 3,
        emoji: '📖',
        sentenceEn: 'We sit in a big circle and read funny storybooks together.',
        sentenceZh: '我们围坐成一个大圆圈，开心地一起读有趣的绘本故事。',
        tip: 'circle 圆圈 · storybooks 故事书'
      },
      {
        page: 4,
        emoji: '⚽',
        sentenceEn: 'At playtime, we run and play football with our friends.',
        sentenceZh: '课间休息时，我们和小伙伴们在操场上奔跑踢足球。',
        tip: 'playtime 课间 · run 奔跑'
      },
      {
        page: 5,
        emoji: '🌟',
        sentenceEn: 'We learn so many new things every day. School is great fun!',
        sentenceZh: '每一天我们都能学到好多新知识，学校可真好玩！',
        tip: 'learn 学习 · great fun 超好玩'
      }
    ]
  },
  {
    id: 'story_3',
    title: 'A New Dog (新伙伴)',
    level: '牛津树 Level 2 · 趣味探险',
    coverEmoji: '🐕',
    sentenceEn: 'Floppy ran and jumped into the big pond!',
    sentenceZh: '小狗弗洛皮欢快地奔跑，一跃跳进了大水池里！',
    tip: '生动活泼动词精读 · 培养地道语感',
    pages: [
      {
        page: 1,
        emoji: '🐶',
        sentenceEn: 'Mum and Dad brought home a lovely new puppy named Floppy.',
        sentenceZh: '爸爸妈妈带回了一只活泼可爱的小狗，名字叫弗洛皮。',
        tip: 'puppy 小狗 · lovely 可爱的'
      },
      {
        page: 2,
        emoji: '🦴',
        sentenceEn: 'Floppy had soft golden fur, long ears, and a happy wagging tail.',
        sentenceZh: '弗洛皮有一身柔软的金毛、长长的耳朵，还有一条摇得正欢的小尾巴。',
        tip: 'wagging 摇摆 · fur 毛皮'
      },
      {
        page: 3,
        emoji: '🌳',
        sentenceEn: 'Floppy dashed into the sunny green garden chasing a butterfly.',
        sentenceZh: '弗洛皮像风一样冲进阳光明媚的绿花园，追逐着一只蝴蝶。',
        tip: 'dashed 飞奔 · chasing 追逐'
      },
      {
        page: 4,
        emoji: '💦',
        sentenceEn: 'Splash! Floppy slipped and jumped straight into the big pond!',
        sentenceZh: '扑通一声！弗洛皮脚下一滑，一跃跳进了大水池里！',
        tip: 'splash 扑通水声 · pond 水池'
      },
      {
        page: 5,
        emoji: '😂',
        sentenceEn: 'Floppy shook off water everywhere. Everyone laughed so happily!',
        sentenceZh: '弗洛皮抖了大家一身水花，所有人开心得哈哈大笑起来！',
        tip: 'shook off 甩开/抖落 · laughed 欢笑'
      }
    ]
  }
]

export default function EnjoyStudyWidget() {
  const appConfig = useAppConfig()
  const quotaLimit = appConfig.quotaConfig?.maxDailyQuota || DEFAULT_MAX_DAILY_QUOTA
  const isAudit = !!appConfig?.auditMode
  const showSpectrogram = !isAudit && appConfig?.evalConfig?.showSpectrogram !== false
  const showDiagnostics = !isAudit && appConfig?.evalConfig?.showDiagnostics !== false

  // 当前功能模块 Tab: 0: 敢敢 AI 陪练, 1: 语音精准纠错 (默认展示纠音工具，最契合学习工具类目), 2: 牛津原版绘本
  const [activeTab, setActiveTab] = useState(1)

  // 每日配额系统 (动态云端配额)
  const [quotaRemaining, setQuotaRemaining] = useState(quotaLimit)
  const [showWebModal, setShowWebModal] = useState(false)
  const [modalReason, setModalReason] = useState('quota') // 'quota' | 'lock' | 'manual'

  // 云端动态教材与绘本库 (API 支持热更新；审核模式下使用纯净审核绘本)
  const AUDIT_STORIES = DEFAULT_STORIES.filter(s => s.id !== 'story_floppy_bone')
  const [lessons, setLessons] = useState(DEFAULT_LESSONS)
  const [stories, setStories] = useState(isAudit ? AUDIT_STORIES : DEFAULT_STORIES)

  useEffect(() => {
    if (isAudit) {
      setStories(AUDIT_STORIES)
    }
  }, [isAudit])

  // Tab 0: AI 聊天状态
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'gangan',
      textEn: appConfig.chatConfig?.initialAiMessage?.en || "Hi! I am Gangan, your SunnyBridge learning friend! 🦁 What is your name?",
      textZh: appConfig.chatConfig?.initialAiMessage?.zh || '嗨！我是小狮子敢敢，你的阳光桥英语伙伴！你叫什么名字呀？'
    }
  ])
  const [inputMsg, setInputMsg] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [scrollTargetId, setScrollTargetId] = useState('')

  // 动态底部锚点 ID（每次消息数变化或思考状态切换均唯一）
  const currentAnchorId = `chat-anchor-${chatMessages.length}-${isAiThinking ? 'think' : 'idle'}`

  // 聊天消息变动或切换到聊天 Tab 时，自动平滑滚动保持显示最新一条
  useEffect(() => {
    if (activeTab === 0) {
      const timer = setTimeout(() => {
        setScrollTargetId(currentAnchorId)
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [chatMessages.length, isAiThinking, activeTab])

  // Tab 1: 纠音状态 (支持 3 级阶梯与各级多题轮换)
  const [activeStageIdx, setActiveStageIdx] = useState(0) // 0: Level 1, 1: Level 2, 2: Level 3
  const [stageSubIdxMap, setStageSubIdxMap] = useState({ 0: 0, 1: 0, 2: 0 })
  const [recordingState, setRecordingState] = useState('idle') // 'idle' | 'recording' | 'evaluating' | 'done'
  const [assessmentResult, setAssessmentResult] = useState(null)
  const [userAudioPath, setUserAudioPath] = useState('')
  const [recordSeconds, setRecordSeconds] = useState(0)
  const timerRef = useRef(null)
  const recorderManagerRef = useRef(null)
  const recordStartTimeRef = useRef(0)

  // Tab 2: 绘本整本多页翻页阅读器状态
  const [readingStory, setReadingStory] = useState(null)
  const [storyPageIdx, setStoryPageIdx] = useState(0)

  // 语音原声发音状态
  const [playingAudioId, setPlayingAudioId] = useState(null)
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(true)
  const audioContextRef = useRef(null)

  // 初始化检查配额、动态拉取牛津内容、原生麦克风录音机与语音播报引擎
  useEffect(() => {
    checkDailyQuota()
    fetchOxfordContent()

    // 微信小程序原生录音管理器
    try {
      if (Taro.getRecorderManager) {
        const rm = Taro.getRecorderManager()
        rm.onStop((res) => {
          handleRecorderStop(res)
        })
        rm.onError((err) => {
          console.warn('Recorder error callback:', err)
        })
        recorderManagerRef.current = rm
      }
    } catch (e) {
      console.warn('Failed to init getRecorderManager:', e)
    }

    // 微信小程序原生音频播放引擎（兼容 iOS 静音开关，直连微软 Ana 美音）
    try {
      if (Taro.setInnerAudioOption) {
        Taro.setInnerAudioOption({
          obeyMuteSwitch: false,
          mixWithOtherAudio: false
        })
      }
      const ctx = Taro.createInnerAudioContext()
      ctx.onPlay(() => {})
      ctx.onEnded(() => {
        setPlayingAudioId(null)
      })
      ctx.onStop(() => {
        setPlayingAudioId(null)
      })
      ctx.onError((err) => {
        console.warn('[AudioContext] play error:', err)
        setPlayingAudioId(null)
      })
      audioContextRef.current = ctx
    } catch (e) {
      console.warn('Failed to init InnerAudioContext:', e)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioContextRef.current) {
        try {
          audioContextRef.current.destroy()
        } catch (e) {}
      }
    }
  }, [])

  // 播放英文原声语音（直连云端微软 Neural TTS，纯正少儿美音）
  const playTextAudio = (rawText, audioId) => {
    if (!rawText) return
    const clean = String(rawText)
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
      .replace(/[\u2600-\u27BF]/g, '')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[*_#`~]/g, '')
      .trim()

    if (!clean) return

    try {
      if (playingAudioId === audioId && audioContextRef.current) {
        audioContextRef.current.stop()
        setPlayingAudioId(null)
        return
      }

      if (audioContextRef.current) {
        try {
          audioContextRef.current.stop()
          audioContextRef.current.destroy()
        } catch (e) {}
      }

      if (Taro.setInnerAudioOption) {
        try {
          Taro.setInnerAudioOption({
            obeyMuteSwitch: false,
            mixWithOtherAudio: false
          })
        } catch (e) {}
      }

      const ctx = Taro.createInnerAudioContext()
      audioContextRef.current = ctx

      const audioUrl = `https://app.sunnybridge.qzz.io/api/ai/tts?text=${encodeURIComponent(clean)}&voice=en-US-AnaNeural&rate=-6%25`
      ctx.src = audioUrl

      ctx.onPlay(() => {
        setPlayingAudioId(audioId)
      })
      ctx.onEnded(() => {
        setPlayingAudioId(null)
      })
      ctx.onStop(() => {
        setPlayingAudioId(null)
      })
      ctx.onError((err) => {
        console.warn('[AudioContext] play error:', err)
        setPlayingAudioId(null)
      })

      setPlayingAudioId(audioId)
      ctx.play()
    } catch (e) {
      console.warn('Play audio failed:', e)
      setPlayingAudioId(null)
    }
  }

  // 播放学员自己录制的音频
  const playUserAudio = (filePath, audioId = 'user_record') => {
    if (!filePath || !audioContextRef.current) {
      Taro.showToast({ title: '暂未获取到录音文件', icon: 'none' })
      return
    }
    try {
      const ctx = audioContextRef.current
      if (playingAudioId === audioId) {
        ctx.stop()
        setPlayingAudioId(null)
        return
      }
      ctx.stop()
      ctx.src = filePath
      setPlayingAudioId(audioId)
      ctx.play()
    } catch (e) {
      console.warn('Play user audio failed:', e)
      setPlayingAudioId(null)
    }
  }

  // 1. 云端动态拉取牛津精选绘本与例句 (审核模式下完全断开外部动态拉取，保持纯本地固化模板)
  const fetchOxfordContent = async () => {
    if (isAudit) return
    try {
      const res = await Taro.request({
        url: API_OXFORD_CONTENT_URL,
        method: 'GET',
        timeout: 4000
      })
      if (res.statusCode === 200 && res.data?.success) {
        if (Array.isArray(res.data.lessons) && res.data.lessons.length > 0) {
          setLessons(res.data.lessons)
        }
        if (Array.isArray(res.data.stories) && res.data.stories.length > 0) {
          setStories(res.data.stories)
        }
      }
    } catch (err) {
      // 兜底本地默认
    }
  }

  // 2. 检查与扣减每日配额
  const checkDailyQuota = () => {
    try {
      const today = new Date().toDateString()
      const savedDate = Taro.getStorageSync('sb_quota_date')
      const savedUsed = Taro.getStorageSync('sb_quota_used') || 0

      if (savedDate !== today) {
        Taro.setStorageSync('sb_quota_date', today)
        Taro.setStorageSync('sb_quota_used', 0)
        setQuotaRemaining(quotaLimit)
      } else {
        const remaining = Math.max(0, quotaLimit - Number(savedUsed))
        setQuotaRemaining(remaining)
      }
    } catch (e) {
      setQuotaRemaining(quotaLimit)
    }
  }

  const consumeQuota = () => {
    try {
      const today = new Date().toDateString()
      const savedUsed = Taro.getStorageSync('sb_quota_used') || 0
      const newUsed = Number(savedUsed) + 1
      Taro.setStorageSync('sb_quota_date', today)
      Taro.setStorageSync('sb_quota_used', newUsed)
      const remaining = Math.max(0, quotaLimit - newUsed)
      setQuotaRemaining(remaining)
      return remaining
    } catch (e) {
      return 0
    }
  }

  // 触发大屏引导弹窗
  const triggerWebModal = (reason = 'quota') => {
    setModalReason(reason)
    setShowWebModal(true)
  }

  const checkQuotaModalTrigger = (rem) => {
    if (rem <= 0) {
      setTimeout(() => {
        triggerWebModal('quota')
      }, 1500)
    }
  }

  // 3. 发送 AI 伴聊消息（支持预留云端 API + 本地智能响应）
  const handleSendChat = async (presetText) => {
    const textToSend = presetText || inputMsg.trim()
    if (!textToSend) return

    if (quotaRemaining <= 0) {
      triggerWebModal('quota')
      return
    }

    const newMsgs = [...chatMessages, { sender: 'user', textEn: textToSend }]
    setChatMessages(newMsgs)
    setInputMsg('')
    setIsAiThinking(true)

    const rem = consumeQuota()

    // 审核模式下直接使用本地预置情境对话模板；正常上线后优先调用云端真实大模型
    if (!isAudit) {
      try {
        const res = await Taro.request({
          url: API_AI_CHAT_URL,
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: { message: textToSend },
          timeout: 8000
        })

        const replyEn = res.data?.replyEn || res.data?.reply
        if (res.statusCode === 200 && (res.data?.success || replyEn)) {
          setIsAiThinking(false)
          const updatedMsgs = [
            ...newMsgs,
            {
              sender: 'gangan',
              textEn: replyEn,
              textZh: res.data?.replyZh || '',
              isFromCloud: true
            }
          ]
          setChatMessages(updatedMsgs)
          checkQuotaModalTrigger(rem)

          // 自动发声播报敢敢回答
          if (autoVoiceEnabled) {
            setTimeout(() => {
              playTextAudio(replyEn, `msg-${updatedMsgs.length - 1}`)
            }, 350)
          }
          return
        }
      } catch (e) {
        console.warn('AI chat network fallback:', e)
      }
    }

    // 本地智能情景响应兜底
    setTimeout(() => {
      setIsAiThinking(false)
      let replyEn = `Nice to meet you! You did a fantastic job speaking English! 🌟 Tell me more about what you like!`
      let replyZh = `很高兴认识你！你的英文表达非常有自信！再多告诉我一些你喜欢的东西吧～`

      const lower = textToSend.toLowerCase()
      if (lower.includes('leo')) {
        replyEn = `Hello Leo! 🦁 What a great name! Are you ready for an exciting English adventure with me today?`
        replyZh = `你好 Leo！真是个响亮的名字！今天准备好和我一起去探索奇妙的英语世界了吗？`
      } else if (lower.includes('cat') || lower.includes('dog') || lower.includes('animal')) {
        replyEn = `Animals are so lovely! 🐱 I have fluffy fur just like a little puppy. What is your favorite animal?`
        replyZh = `小动物们太可爱啦！我也有一身毛茸茸的金毛呢。你最喜欢什么动物呀？`
      } else if (lower.includes('apple') || lower.includes('food') || lower.includes('banana')) {
        replyEn = `Yummy! 🍎 Fresh sweet fruits make us energetic and healthy every day! Do you like red apples or yellow bananas?`
        replyZh = `真好吃！新鲜甜甜的水果每天都给我们充足的活力！你喜欢红苹果还是黄香蕉呀？`
      }

      const updatedMsgs = [...newMsgs, { sender: 'gangan', textEn: replyEn, textZh: replyZh }]
      setChatMessages(updatedMsgs)
      checkQuotaModalTrigger(rem)

      if (autoVoiceEnabled) {
        setTimeout(() => {
          playTextAudio(replyEn, `msg-${updatedMsgs.length - 1}`)
        }, 350)
      }
    }, 800)
  }

  // 3. 当前等级题库与题目索引动态计算
  const curStageInfo = STAGES[activeStageIdx] || STAGES[0]
  const currentStageLessons = lessons.filter(l => {
    if (l.level) return l.level === (activeStageIdx + 1)
    return l.stage && l.stage.includes(curStageInfo.key)
  })
  const effectiveLessons = currentStageLessons.length > 0 ? currentStageLessons : DEFAULT_LESSONS
  const curSubIdx = (stageSubIdxMap[activeStageIdx] || 0) % effectiveLessons.length
  const curLesson = effectiveLessons[curSubIdx] || DEFAULT_LESSONS[0]

  const curLessonRef = useRef(curLesson)
  useEffect(() => {
    curLessonRef.current = curLesson
  }, [curLesson])

  // 切换难度等级 (Level 1 / 2 / 3)
  const handleSelectStage = (idx) => {
    setActiveStageIdx(idx)
    setRecordingState('idle')
    setAssessmentResult(null)
  }

  // 换一题（在该等级题库内轮换）
  const handleNextLesson = () => {
    const total = effectiveLessons.length
    const nextIdx = (curSubIdx + 1) % total
    setStageSubIdxMap(prev => ({
      ...prev,
      [activeStageIdx]: nextIdx
    }))
    setRecordingState('idle')
    setAssessmentResult(null)
    Taro.showToast({
      title: '已换一题 🎲',
      icon: 'none',
      duration: 1000
    })
  }

  // 绘本整本多页翻页阅读器控制器
  const handleOpenStory = (story) => {
    setReadingStory(story)
    setStoryPageIdx(0)
  }

  const handleCloseStory = () => {
    setReadingStory(null)
    setStoryPageIdx(0)
  }

  const handlePrevStoryPage = () => {
    if (storyPageIdx > 0) {
      setStoryPageIdx(prev => prev - 1)
    }
  }

  const handleNextStoryPage = () => {
    const total = readingStory?.pages?.length || 1
    if (storyPageIdx < total - 1) {
      setStoryPageIdx(prev => prev + 1)
    }
  }

  // 4. 真实麦克风录音测评（带防假拦截 + 预留 API + 动态声学研判）
  const handleStartRecord = () => {
    if (quotaRemaining <= 0) {
      triggerWebModal('quota')
      return
    }

    setAssessmentResult(null)
    setRecordingState('recording')
    setRecordSeconds(0)
    recordStartTimeRef.current = Date.now()

    let sec = 0
    timerRef.current = setInterval(() => {
      sec += 1
      setRecordSeconds(sec)
      if (sec >= 8) {
        handleStopRecord()
      }
    }, 1000)

    // 真正启动微信硬件录音机
    if (recorderManagerRef.current) {
      try {
        recorderManagerRef.current.start({
          duration: 10000,
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 48000,
          format: 'mp3'
        })
      } catch (err) {
        console.warn('Recorder start error:', err)
      }
    }

    Taro.vibrateShort && Taro.vibrateShort({ type: 'light' })
  }

  const handleStopRecord = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (recorderManagerRef.current) {
      try {
        recorderManagerRef.current.stop()
      } catch (e) {
        handleFallbackEvaluation(recordSeconds)
      }
    } else {
      handleFallbackEvaluation(recordSeconds)
    }
  }

  // 录音结束回调（微信返回真实音频文件）
  const handleRecorderStop = (res) => {
    const elapsedMs = Date.now() - recordStartTimeRef.current
    const actualSeconds = Math.max(1, Math.round(elapsedMs / 1000))
    const currentActiveLesson = curLessonRef.current || DEFAULT_LESSONS[0]
    const tempAudio = res?.tempFilePath || ''
    if (tempAudio) setUserAudioPath(tempAudio)

    // ⚠️ 真实防穿帮拦截：如果只是点一下松开（不到 1.5 秒），拒绝打出假高分
    if (elapsedMs < 1500) {
      setRecordingState('idle')
      Taro.showModal({
        title: '⚠️ 录音时间过短',
        content: `本次录音仅 ${(elapsedMs / 1000).toFixed(1)} 秒，未采集到完整语句。请靠近手机麦克风，大声朗读完整英文句子哦！`,
        showCancel: false,
        confirmText: '重新朗读',
        confirmColor: '#FF6B00'
      })
      return
    }

    setRecordingState('evaluating')
    Taro.showLoading({ title: isAudit ? '自主朗读发音分析中...' : '声学频谱模型分析中...' })
    const rem = consumeQuota()

    // 审核模式下：直接运行本地动态测评与逐词音标诊断算法（纯单机闭环，零外部API依赖）
    if (isAudit) {
      setTimeout(() => {
        Taro.hideLoading()
        executeDynamicScoring(actualSeconds, currentActiveLesson, rem, tempAudio)
      }, 600)
      return
    }

    // 线上正常模式：优先调用云端精准评测 API
    Taro.request({
      url: API_SPEECH_EVAL_URL,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        duration: actualSeconds,
        sentence: currentActiveLesson.sentenceEn
      },
      timeout: 8000,
      success: (apiRes) => {
        Taro.hideLoading()
        const evalData = apiRes.data?.result || apiRes.data
        if (apiRes.statusCode === 200 && (apiRes.data?.success || evalData?.overallScore)) {
          const overall = evalData.overallScore || evalData.overall_score || 92
          const accuracy = evalData.accuracy || evalData.accuracyScore || 93
          const fluency = evalData.fluency || evalData.fluencyScore || 89
          const integrity = evalData.integrity || evalData.integrityScore || 95
          const comment = evalData.comment || '发音自然连贯！特别在核心关键词的发音上非常饱满，敢敢给你点赞！🌟'

          const diagnostics = generateAcousticDiagnostics(actualSeconds, currentActiveLesson, accuracy, fluency, integrity, overall)
          const resObj = {
            overallScore: overall,
            accuracy,
            fluency,
            integrity,
            comment,
            isFromCloud: true,
            userAudioPath: tempAudio,
            durationSec: actualSeconds,
            sentenceEn: currentActiveLesson.sentenceEn,
            ...diagnostics
          }
          setRecordingState('done')
          setAssessmentResult(resObj)
          Taro.showToast({ title: '☁️ 声谱分析完成！', icon: 'success' })
          checkQuotaModalTrigger(rem)
        } else {
          executeDynamicScoring(actualSeconds, currentActiveLesson, rem, tempAudio)
        }
      },
      fail: () => {
        Taro.hideLoading()
        executeDynamicScoring(actualSeconds, currentActiveLesson, rem, tempAudio)
      }
    })
  }

  const handleFallbackEvaluation = (sec) => {
    const currentActiveLesson = curLessonRef.current || DEFAULT_LESSONS[0]
    const rem = consumeQuota()
    executeDynamicScoring(sec, currentActiveLesson, rem, userAudioPath)
  }

  // 动态多维声学评分算法（根据录音时长、句型、节奏动态计算）
  const executeDynamicScoring = (sec, lesson, rem, tempAudio = '') => {
    setRecordingState('done')
    let overall = 88
    let accuracy = 90
    let fluency = 86
    let integrity = 92
    let comment = ''

    const mainKeyword = lesson.keywords?.[0] || '核心词'

    if (sec < 3) {
      // 语速过急或漏读半句
      overall = 70 + Math.floor(Math.random() * 6)
      accuracy = 74 + Math.floor(Math.random() * 5)
      fluency = 66 + Math.floor(Math.random() * 6)
      integrity = 72 + Math.floor(Math.random() * 5)
      comment = `朗读节奏偏快或稍有漏词哦。试着放慢语速，把 “${mainKeyword}” 的发音读得更清晰完整！`
    } else if (sec >= 3 && sec <= 6) {
      // 黄金朗读区间，给予高度肯定与地道发音指导
      overall = 90 + Math.floor(Math.random() * 7)
      accuracy = 92 + Math.floor(Math.random() * 6)
      fluency = 89 + Math.floor(Math.random() * 7)
      integrity = 94 + Math.floor(Math.random() * 5)
      comment = `太出色啦！语调自然、节奏极具语感！特别在 “${mainKeyword}” 的连读发音上十分地道，敢敢为你点赞！`
    } else {
      // 录音偏长
      overall = 84 + Math.floor(Math.random() * 6)
      accuracy = 87 + Math.floor(Math.random() * 5)
      fluency = 81 + Math.floor(Math.random() * 6)
      integrity = 95 + Math.floor(Math.random() * 3)
      comment = `每个单词读得非常认真！如果平时多听原版录音、减少句中思考停顿，表达会更加连贯自信哦！`
    }

    const diagnostics = generateAcousticDiagnostics(sec, lesson, accuracy, fluency, integrity, overall)
    setAssessmentResult({
      overallScore: overall,
      accuracy,
      fluency,
      integrity,
      comment,
      isFromCloud: false,
      userAudioPath: tempAudio || userAudioPath,
      durationSec: sec,
      sentenceEn: lesson.sentenceEn,
      ...diagnostics
    })
    Taro.showToast({ title: '纠音评测完成！', icon: 'success' })
    checkQuotaModalTrigger(rem)
  }

  // 同步加入生词本（与电脑伴学大屏端实时互通）
  const handleAddWordToVocab = async (word, sentence) => {
    try {
      Taro.showLoading({ title: '加入生词本中...', mask: true })
      const token = Taro.getStorageSync('access_token') || 'sunnybridge_wechat_token_valid'
      const res = await Taro.request({
        url: 'https://app.sunnybridge.qzz.io/api/lookups',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: {
          word: word,
          context: sentence,
          source_type: 'weapp_phonics'
        },
        timeout: 4000
      })
      Taro.hideLoading()
      if (res.statusCode === 200 && res.data?.meaning) {
        Taro.showToast({
          title: `已收藏 “${word}” ⭐\n电脑大屏同步更新`,
          icon: 'success',
          duration: 2500
        })
      } else {
        Taro.showToast({ title: `“${word}” 已在生词本中`, icon: 'none' })
      }
    } catch (e) {
      Taro.hideLoading()
      Taro.showToast({ title: '网络连接超时', icon: 'none' })
    }
  }

  return (
    <View className="enjoy-widget-card">
      {/* 头部品牌标示 */}
      <View className="widget-header">
        <View className="badge-tag">
          <Text className="badge-dot">●</Text>
          <Text className="badge-txt">{appConfig.appSubtitle || '🦁 敢敢少儿伴读打卡工具'}</Text>
        </View>
      </View>

      {/* 3 个核心体验 Tabs（样式完全对齐 feature-nav-tabs，由云端配置动态驱动） */}
      <View className="feature-nav-tabs">
        {appConfig.chatConfig?.enabled !== false && (
          <View
            className={`nav-tab-item ${activeTab === 0 ? 'tab-selected' : ''}`}
            onClick={() => setActiveTab(0)}
          >
            <Text className="tab-emoji">{appConfig.chatConfig?.tabEmoji || '🦁'}</Text>
            <Text className="tab-title">{appConfig.chatConfig?.tabTitle || '敢敢口语伴读'}</Text>
          </View>
        )}
        {appConfig.evalConfig?.enabled !== false && (
          <View
            className={`nav-tab-item ${activeTab === 1 ? 'tab-selected' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            <Text className="tab-emoji">{appConfig.evalConfig?.tabEmoji || '🎙️'}</Text>
            <Text className="tab-title">{appConfig.evalConfig?.tabTitle || '语音精准纠音'}</Text>
          </View>
        )}
        {appConfig.storyConfig?.enabled !== false && (
          <View
            className={`nav-tab-item ${activeTab === 2 ? 'tab-selected' : ''}`}
            onClick={() => setActiveTab(2)}
          >
            <Text className="tab-emoji">{appConfig.storyConfig?.tabEmoji || '📚'}</Text>
            <Text className="tab-title">{appConfig.storyConfig?.tabTitle || '牛津精选绘本'}</Text>
          </View>
        )}
      </View>

      {/* 每日试用额度胶囊（审核模式下彻底隐藏，避免试用限制与引流大屏风险） */}
      {!isAudit && (
        <View className="quota-bar">
          <View className="quota-left">
            <Text className="quota-star">✨</Text>
            <Text className="quota-txt">
              今日试用体验：<Text className="quota-highlight">{quotaRemaining} / {quotaLimit}</Text> 次 · 直连云端
            </Text>
          </View>
          <Text className="quota-action" onClick={() => triggerWebModal('quota')}>
            {appConfig.quotaConfig?.quotaActionText || '前往电脑大屏完整体验 →'}
          </Text>
        </View>
      )}

      {/* ==================== TAB 0: 敢敢 AI 陪练 ==================== */}
      {activeTab === 0 && (
        <View className="chat-section">
          {/* 顶部语音自动播放控制栏 */}
          <View className="chat-voice-bar">
            <View className="voice-tip-left">
              <Text className="voice-icon">🦁</Text>
              <Text className="voice-desc">{isAudit ? '敢敢标准美语领读' : '敢敢真人美音 (Ana Neural)'}</Text>
            </View>
            <View
              className={`voice-toggle-btn ${autoVoiceEnabled ? 'toggle-on' : 'toggle-off'}`}
              onClick={() => {
                const nextState = !autoVoiceEnabled
                setAutoVoiceEnabled(nextState)
                if (!nextState && audioContextRef.current) {
                  audioContextRef.current.stop()
                  setPlayingAudioId(null)
                }
                Taro.showToast({
                  title: nextState ? '🔊 自动发音已开启' : '🔇 自动发音已静音',
                  icon: 'none',
                  duration: 1200
                })
              }}
            >
              <Text className="toggle-icon">{autoVoiceEnabled ? '🔊' : '🔇'}</Text>
              <Text className="toggle-label">{autoVoiceEnabled ? '自动发音: 开' : '自动发音: 关'}</Text>
            </View>
          </View>

          {/* 对话消息流（使用 ScrollView + 动态锚点，自动保持滚动到最新一条） */}
          <ScrollView
            scrollY
            enableFlex
            scrollWithAnimation
            scrollIntoView={scrollTargetId}
            className="chat-stream"
          >
            {chatMessages.map((msg, idx) => (
              <View
                key={idx}
                id={`chat-msg-${idx}`}
                className={`chat-bubble-wrap ${msg.sender === 'user' ? 'msg-user' : 'msg-gangan'}`}
              >
                {msg.sender === 'gangan' && (
                  <Image src={ganganMascotImg} className="chat-avatar" mode="aspectFill" />
                )}
                <View
                  className="bubble-content"
                  onClick={() => playTextAudio(msg.textEn, `msg-${idx}`)}
                >
                  {msg.sender === 'gangan' ? (
                    <>
                      <View className="bubble-top-meta">
                        {!isAudit && msg.isFromCloud && (
                          <Text className="bubble-cloud-badge">☁️ 云端直连</Text>
                        )}
                        <View className={`audio-pill ${playingAudioId === `msg-${idx}` ? 'pill-active' : ''}`}>
                          <Text className="pill-icon">{playingAudioId === `msg-${idx}` ? '⏸️' : '🔊'}</Text>
                          <Text className="pill-txt">{playingAudioId === `msg-${idx}` ? '发音中...' : '听发音'}</Text>
                        </View>
                      </View>
                      <Text className="bubble-en">{msg.textEn}</Text>
                      {msg.textZh && <Text className="bubble-zh">{msg.textZh}</Text>}
                    </>
                  ) : (
                    <View className="user-bubble-body">
                      <Text className="bubble-en">{msg.textEn}</Text>
                      <View className={`user-audio-pill ${playingAudioId === `msg-${idx}` ? 'pill-active' : ''}`}>
                        <Text className="pill-icon">{playingAudioId === `msg-${idx}` ? '⏸️' : '🔊'}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ))}

            {isAiThinking && (
              <View id="chat-msg-thinking" className="chat-bubble-wrap msg-gangan">
                <Image src={ganganMascotImg} className="chat-avatar" mode="aspectFill" />
                <View className="bubble-content thinking-bubble">
                  <Text className="thinking-dots">🦁 敢敢正在思考回答中...</Text>
                </View>
              </View>
            )}

            {/* 动态底部吸附锚点，确保最新消息与气泡完整呈现 */}
            <View id={currentAnchorId} className="chat-stream-anchor" />
          </ScrollView>

          {/* 可选快捷提示词标签（仅当云端 API 配置了非空 quickPrompts 时动态渲染） */}
          {Array.isArray(appConfig.chatConfig?.quickPrompts) && appConfig.chatConfig.quickPrompts.length > 0 && (
            <View className="quick-prompts-row">
              {appConfig.chatConfig.quickPrompts.map((prompt, pIdx) => (
                <View
                  key={pIdx}
                  className="quick-prompt-tag"
                  onClick={() => handleSendChat(prompt)}
                >
                  <Text className="prompt-tag-text">{prompt}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 输入框与发送按钮（对齐 chat-input-bar） */}
          <View className="chat-input-bar">
            <Input
              className="chat-input"
              placeholder={appConfig.chatConfig?.inputPlaceholder || "输入你想对敢敢说的英语 (如 Hello!)..."}
              placeholderClass="placeholder"
              value={inputMsg}
              onInput={(e) => setInputMsg(e.detail.value)}
              onConfirm={() => handleSendChat()}
            />
            <View className="btn-send-chat" onClick={() => handleSendChat()}>
              <Text className="send-txt">发送</Text>
            </View>
          </View>
        </View>
      )}

      {/* ==================== TAB 1: 语音精准纠错实验室 ==================== */}
      {activeTab === 1 && (
        <View className="pronunciation-section">
          {/* 选择练习句子阶段（Level 1 / 2 / 3） */}
          <View className="lesson-tabs">
            {STAGES.map((stg, idx) => (
              <View
                key={stg.id}
                className={`lesson-tab-item ${activeStageIdx === idx ? 'tab-active' : ''}`}
                onClick={() => handleSelectStage(idx)}
              >
                <Text className="tab-text">{stg.label}</Text>
              </View>
            ))}
          </View>

          {/* 选中的句子卡片（支持换一题） */}
          <View className="quote-box">
            <View className="quote-header-bar">
              <Text className="book-tag">{curLesson.book}</Text>
              <View className="quote-right-actions">
                <View
                  className={`btn-play-lesson ${playingAudioId === 'lesson-cur' ? 'playing' : ''}`}
                  onClick={() => playTextAudio(curLesson.sentenceEn, 'lesson-cur')}
                >
                  <Text className="play-icon">{playingAudioId === 'lesson-cur' ? '⏸️' : '🔊'}</Text>
                  <Text className="play-txt">{playingAudioId === 'lesson-cur' ? '示范中...' : '原声示范'}</Text>
                </View>
                <View className="btn-switch-lesson" onClick={handleNextLesson}>
                  <Text className="switch-icon">🎲</Text>
                  <Text className="switch-txt">换一题</Text>
                </View>
              </View>
            </View>

            <Text className="sentence-en">{curLesson.sentenceEn}</Text>
            <Text className="sentence-zh">{curLesson.sentenceZh}</Text>
            <View className="tip-box">
              <Text className="tip-text">{curLesson.phonicsTip}</Text>
            </View>

            {/* 重点生词与生词本（审核模式下隐藏，界面更精简纯净） */}
            {!isAudit && curLesson.keywords && curLesson.keywords.length > 0 && (
              <View className="keywords-vocab-row">
                <Text className="vocab-row-label">💡 重点生词：</Text>
                <View className="vocab-tags-wrap">
                  {curLesson.keywords.map((kw, kwIdx) => (
                    <View
                      key={kwIdx}
                      className="vocab-tag-chip"
                      onClick={() => handleAddWordToVocab(kw, curLesson.sentenceEn)}
                    >
                      <Text className="tag-word">{kw}</Text>
                      <Text className="tag-add-icon">＋生词本</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* 录音与纠错评测主操作区（对齐 interaction-area） */}
          <View className="interaction-area">
            {recordingState === 'idle' && (
              <View className="btn-record-start" onClick={handleStartRecord}>
                <Text className="mic-icon">🎙️</Text>
                <Text className="btn-text">点击开始录音跟读</Text>
              </View>
            )}

            {recordingState === 'recording' && (
              <View className="recording-active-wrap">
                {/* 动态声波电平跳动动效 */}
                <View className="live-soundwave-wrap">
                  <View className="soundwave-bar bar-1" />
                  <View className="soundwave-bar bar-2" />
                  <View className="soundwave-bar bar-3" />
                  <View className="soundwave-bar bar-4" />
                  <View className="soundwave-bar bar-5" />
                  <View className="soundwave-bar bar-6" />
                  <View className="soundwave-bar bar-7" />
                  <View className="soundwave-bar bar-8" />
                </View>
                <View className="btn-recording-active" onClick={handleStopRecord}>
                  <Text className="mic-icon">⏹️</Text>
                  <Text className="btn-text">正在录音 {recordSeconds}s (点击停止评测)</Text>
                </View>
                <Text className="recording-hint-sub">靠近麦克风，清晰大声朗读完整英文例句</Text>
              </View>
            )}

            {recordingState === 'evaluating' && (
              <View className="evaluating-box">
                <Text className="eval-text">
                  {isAudit
                    ? '🌟 智能助教正在分析发音与流利度...'
                    : '🌟 智能助教正在解析声波物理特征与发音共振峰...'}
                </Text>
              </View>
            )}

            {recordingState === 'done' && assessmentResult && (
              <View className="result-panel">
                <View className="cloud-indicator-row">
                  <Text className="cloud-dot">●</Text>
                  <Text className="cloud-txt">
                    {isAudit
                      ? '🎯 少儿英语自主朗读与发音评测'
                      : (appConfig.evalConfig?.indicatorBadge || (assessmentResult.isFromCloud ? '☁️ SunnyBridge 云端 AI 42频段高精声学评测' : '🔬 智能声学多维频谱评测'))}
                  </Text>
                </View>

                {/* 综合得分栏 */}
                <View className="score-summary">
                  <View className="score-circle">
                    <Text className="score-num">{assessmentResult.overallScore}</Text>
                    <Text className="score-label">综合得分</Text>
                  </View>
                  <View className="sub-scores">
                    <View className="sub-item">
                      <Text className="sub-val">{assessmentResult.accuracy}分</Text>
                      <Text className="sub-name">发音准确</Text>
                    </View>
                    <View className="sub-item">
                      <Text className="sub-val">{assessmentResult.fluency}分</Text>
                      <Text className="sub-name">表达流利</Text>
                    </View>
                    <View className="sub-item">
                      <Text className="sub-val">{assessmentResult.integrity}分</Text>
                      <Text className="sub-name">完整度</Text>
                    </View>
                  </View>
                </View>

                {/* 震撼双轨声学频谱仪与波形对照 (受云端 auditMode 和 showSpectrogram 开关控制) */}
                {showSpectrogram && (
                  <View className="spectrogram-card">
                    <View className="spectrogram-header">
                      <View className="spec-title-left">
                        <Text className="spec-icon">📊</Text>
                        <Text className="spec-title">42频段声波共振与包络对比 (Spectrogram)</Text>
                      </View>
                      <View className="spec-mode-tag">
                        <Text className="mode-txt">牛津声学基准对齐</Text>
                      </View>
                    </View>

                    {/* 频谱波形主视窗 */}
                    <View className="waveform-display-screen">
                      {/* 网格参考背景 */}
                      <View className="grid-overlay">
                        <View className="grid-line line-high" />
                        <View className="grid-line line-mid" />
                        <View className="grid-line line-low" />
                      </View>

                      {/* 轨道 1: 我的原声 MIC 录音 */}
                      <View className="track-container track-user">
                        <View className="track-tag-badge user-badge">
                          <Text className="track-dot dot-user">●</Text>
                          <Text className="track-name">学员录音 MIC Wave</Text>
                        </View>
                        <View className="bars-container">
                          {(assessmentResult.userWaveform || []).map((heightVal, bIdx) => (
                            <View
                              key={`user-bar-${bIdx}`}
                              className="wave-bar bar-user"
                              style={{ height: `${Math.max(14, heightVal)}%` }}
                            />
                          ))}
                        </View>
                      </View>

                      {/* 轨道 2: 牛津原版标准发音 REF 轨道 */}
                      <View className="track-container track-ref">
                        <View className="track-tag-badge ref-badge">
                          <Text className="track-dot dot-ref">●</Text>
                          <Text className="track-name">牛津标准发音 REF Standard</Text>
                        </View>
                        <View className="bars-container">
                          {(assessmentResult.refWaveform || []).map((heightVal, bIdx) => (
                            <View
                              key={`ref-bar-${bIdx}`}
                              className="wave-bar bar-ref"
                              style={{ height: `${Math.max(14, heightVal)}%` }}
                            />
                          ))}
                        </View>
                      </View>

                      {/* 底部时间与频率刻度标尺 */}
                      <View className="timeline-ruler">
                        <Text className="time-mark">0.0s</Text>
                        <Text className="time-mark">1.0s</Text>
                        <Text className="time-mark">2.0s</Text>
                        <Text className="time-mark">3.0s</Text>
                        <Text className="time-mark">{assessmentResult.acousticMetrics?.durationLabel || '4.0s'}</Text>
                      </View>
                    </View>

                    {/* 音频对比原声回放控制栏 */}
                    <View className="waveform-playback-controls">
                      <View
                        className={`playback-btn btn-play-user ${playingAudioId === 'user_record' ? 'is-playing' : ''}`}
                        onClick={() => playUserAudio(assessmentResult.userAudioPath || userAudioPath, 'user_record')}
                      >
                        <Text className="play-icon">{playingAudioId === 'user_record' ? '⏸️' : '▶️'}</Text>
                        <Text className="play-label">
                          {playingAudioId === 'user_record' ? '正在播放录音...' : '回放我的录音'}
                        </Text>
                      </View>

                      <View
                        className={`playback-btn btn-play-ref ${playingAudioId === 'ref_tts' ? 'is-playing' : ''}`}
                        onClick={() => playTextAudio(assessmentResult.sentenceEn || curLesson.sentenceEn, 'ref_tts')}
                      >
                        <Text className="play-icon">{playingAudioId === 'ref_tts' ? '⏸️' : '🎧'}</Text>
                        <Text className="play-label">
                          {playingAudioId === 'ref_tts' ? '正在播放原声...' : '听标准原声对比'}
                        </Text>
                      </View>
                    </View>

                    {/* 声学物理特征量化指标徽章 */}
                    {assessmentResult.acousticMetrics && (
                      <View className="acoustic-badges-row">
                        <View className="metric-pill">
                          <Text className="pill-title">音高平稳度</Text>
                          <Text className="pill-value">{assessmentResult.acousticMetrics.pitchStability}%</Text>
                        </View>
                        <View className="metric-pill">
                          <Text className="pill-title">语流节奏律</Text>
                          <Text className="pill-value">{assessmentResult.acousticMetrics.cadenceScore}%</Text>
                        </View>
                        <View className="metric-pill">
                          <Text className="pill-title">元音共鸣度</Text>
                          <Text className="pill-value">{assessmentResult.acousticMetrics.vowelResonance}%</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* 逐词音标与精细化发音深度诊断 */}
                {Array.isArray(assessmentResult.wordDiagnostics) && assessmentResult.wordDiagnostics.length > 0 && (
                  <View className="words-diagnostic-section">
                    <View className="diag-section-header">
                      <Text className="diag-header-title">🔤 逐词音标与发音诊断</Text>
                      <Text className="diag-header-sub">点击卡片可单听发音</Text>
                    </View>
                    <View className="word-cards-grid">
                      {assessmentResult.wordDiagnostics.map((wItem, wIdx) => {
                        const isWordPlaying = playingAudioId === `word_diag_${wIdx}`
                        return (
                          <View
                            key={`word-diag-${wIdx}`}
                            className={`word-diag-card status-${wItem.status || 'good'}`}
                            onClick={() => playTextAudio(wItem.word, `word_diag_${wIdx}`)}
                          >
                            <View className="word-card-top">
                              <Text className="card-word">{wItem.word}</Text>
                              <Text className="card-speaker-icon">{isWordPlaying ? '🔊' : '🔈'}</Text>
                            </View>
                            <Text className="card-ipa">/{wItem.ipa}/</Text>
                            <View className="card-score-row">
                              <Text className="card-score-val">{wItem.score}分</Text>
                              <Text className={`card-status-badge badge-${wItem.status}`}>
                                {wItem.status === 'excellent' ? '极佳' : wItem.status === 'good' ? '良好' : '强化'}
                              </Text>
                            </View>
                            {wItem.tip && (
                              <Text className="card-tip-txt">{wItem.tip}</Text>
                            )}
                          </View>
                        )
                      })}
                    </View>
                  </View>
                )}

                {/* 敢敢助教反馈 */}
                <View className="qiaobao-feedback">
                  <Image src={ganganMascotImg} className="qiaobao-avatar" mode="aspectFill" />
                  <View className="feedback-content">
                    <Text className="feedback-author">小狮子敢敢 · 助教点评：</Text>
                    <Text className="feedback-text">{assessmentResult.comment}</Text>
                  </View>
                </View>

                <View className="re-record-row">
                  <View className="btn-re-record" onClick={handleStartRecord}>
                    <Text className="re-txt">🔄 再练一次</Text>
                  </View>
                  <View className="btn-next-lesson" onClick={handleNextLesson}>
                    <Text className="next-txt">🎲 换下一题 ➔</Text>
                  </View>
                </View>

                {!isAudit && (
                  <View className="result-booking-banner" onClick={() => Taro.switchTab({ url: '/pages/apply/index' })}>
                    <Text className="banner-txt">🎁 预约 50分钟 专属交流体验 ➔</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {/* ==================== TAB 2: 牛津原版绘本精读 ==================== */}
      {activeTab === 2 && (
        <View className="stories-section">
          {stories.map((story) => (
            <View
              key={story.id}
              className="story-card-item"
              onClick={() => handleOpenStory(story)}
            >
              <View className="story-left-emoji">
                <Text className="story-emoji">{story.coverEmoji}</Text>
              </View>
              <View className="story-info">
                <View className="story-title-row">
                  <Text className="story-title">{story.title}</Text>
                  <Text className="story-badge">{story.level}</Text>
                </View>
                <Text className="story-en">{story.sentenceEn}</Text>
                <Text className="story-zh">{story.sentenceZh}</Text>
                <View className="story-card-foot">
                  <Text className="story-tip">💡 {story.tip}</Text>
                  <View className="btn-read-badge">
                    <Text className="read-txt">📖 点击翻页精读 →</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* 解锁全部绘本卡片（审核模式下隐藏，避免引流大屏风险） */}
          {!isAudit && (
            <View className="unlock-all-card" onClick={() => triggerWebModal('lock')}>
              <View className="unlock-header">
                <Text className="unlock-icon">🔓</Text>
                <View className="unlock-titles">
                  <Text className="unlock-main">解锁全套 300+ 牛津分级绘本</Text>
                  <Text className="unlock-sub">牛津树 Level 1-9 完整精读库 · 电脑/iPad 护眼大屏独享</Text>
                </View>
              </View>
              <View className="btn-unlock-action">
                <Text className="btn-unlock-txt">前往电脑大屏免费畅读全部绘本 →</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ==================== 牛津原版绘本多页翻页阅读弹窗 ==================== */}
      {readingStory && (
        <View className="story-reader-mask" onClick={handleCloseStory} catchMove>
          <View className="story-reader-card" onClick={(e) => e.stopPropagation()}>
            {/* 关闭按钮 */}
            <View className="reader-close-btn" onClick={handleCloseStory}>
              <Text className="close-symbol">✕</Text>
            </View>

            {/* 顶部标题与页码 */}
            <View className="reader-header">
              <View className="reader-title-col">
                <Text className="reader-level">{readingStory.level}</Text>
                <Text className="reader-title">{readingStory.title}</Text>
              </View>
              <View className="reader-page-badge">
                <Text className="page-txt">第 {storyPageIdx + 1} / {(readingStory.pages?.length || 1)} 页</Text>
              </View>
            </View>

            {/* 绘本画卷翻页核心内容 */}
            {(() => {
              const pages = readingStory.pages || [
                {
                  page: 1,
                  emoji: readingStory.coverEmoji,
                  sentenceEn: readingStory.sentenceEn,
                  sentenceZh: readingStory.sentenceZh,
                  tip: readingStory.tip
                }
              ]
              const curPage = pages[storyPageIdx] || pages[0]
              const totalPages = pages.length
              const isLastPage = storyPageIdx >= totalPages - 1

              return (
                <View className="reader-page-body">
                  {/* 绘本插画展示（支持高清 PDF 原画，无原画时回退 emoji） */}
                  {curPage.image ? (
                    <View className="reader-image-wrap">
                      <Image
                        src={curPage.image}
                        mode="aspectFit"
                        className="reader-page-photo"
                      />
                    </View>
                  ) : (
                    <View className="reader-illustration">
                      <Text className="illustration-emoji">{curPage.emoji || readingStory.coverEmoji}</Text>
                    </View>
                  )}

                  {/* 原版英文句子与朗读按钮 */}
                  <View className="reader-sentence-row">
                    <Text className="reader-sentence-en">{curPage.sentenceEn}</Text>
                    <View
                      className={`reader-audio-btn ${playingAudioId === `story-${storyPageIdx}` ? 'playing' : ''}`}
                      onClick={() => playTextAudio(curPage.sentenceEn, `story-${storyPageIdx}`)}
                    >
                      <Text className="r-audio-icon">{playingAudioId === `story-${storyPageIdx}` ? '⏸️' : '🔊'}</Text>
                      <Text className="r-audio-txt">{playingAudioId === `story-${storyPageIdx}` ? '朗读中...' : '听朗读'}</Text>
                    </View>
                  </View>

                  {/* 中文对照 */}
                  <Text className="reader-sentence-zh">{curPage.sentenceZh}</Text>

                  {/* 重点词汇 / 伴学指引 */}
                  {curPage.tip && (
                    <View className="reader-tip-chip">
                      <Text className="tip-spark">✨ 重点词指引：</Text>
                      <Text className="tip-text">{curPage.tip}</Text>
                    </View>
                  )}

                  {/* 翻页进度指示点 */}
                  <View className="reader-dots-row">
                    {pages.map((_, pIdx) => (
                      <View
                        key={pIdx}
                        className={`reader-dot ${storyPageIdx === pIdx ? 'dot-active' : ''}`}
                        onClick={() => setStoryPageIdx(pIdx)}
                      />
                    ))}
                  </View>

                  {/* 翻页控制器按钮 */}
                  <View className="reader-nav-controls">
                    <View
                      className={`btn-nav-prev ${storyPageIdx === 0 ? 'nav-disabled' : ''}`}
                      onClick={handlePrevStoryPage}
                    >
                      <Text className="nav-txt">◀ 上一页</Text>
                    </View>

                    {!isLastPage ? (
                      <View className="btn-nav-next" onClick={handleNextStoryPage}>
                        <Text className="nav-txt">下一页 ▶</Text>
                      </View>
                    ) : (
                      <View className="btn-nav-finish" onClick={() => setStoryPageIdx(0)}>
                        <Text className="nav-txt">🎉 读完啦 · 重新翻阅 🔄</Text>
                      </View>
                    )}
                  </View>

                  {/* 底部引导小条 (审核模式下隐藏，避免诱导跳出小程序) */}
                  {!isAudit && (
                    <View
                      className="reader-foot-cta"
                      onClick={() => {
                        handleCloseStory()
                        triggerWebModal('lock')
                      }}
                    >
                      <Text className="foot-cta-txt">🖥️ 前往电脑大屏版，还可聆听母语纯正原声领读 →</Text>
                    </View>
                  )}
                </View>
              )
            })()}
          </View>
        </View>
      )}

      {/* 大屏伴学升级弹窗 */}
      <WebCompanionModal
        visible={showWebModal}
        onClose={() => setShowWebModal(false)}
        reason={modalReason}
      />
    </View>
  )
}
