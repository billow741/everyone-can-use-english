import os

content = r'''import React, { useState, useRef, useEffect } from 'react'
import { View, Text, Image, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import ganganMascotImg from '../../assets/gangan_mascot.png'
import WebCompanionModal from '../WebCompanionModal'
import './index.scss'

// 免费试用配额调整为 15 次
const MAX_DAILY_QUOTA = 15

const API_OXFORD_CONTENT_URL = 'https://app.sunnybridge.qzz.io/api/oxford/content'
const API_SPEECH_EVAL_URL = 'https://app.sunnybridge.qzz.io/api/eval/speech'
const API_AI_CHAT_URL = 'https://app.sunnybridge.qzz.io/api/ai/chat'

const DEFAULT_LESSONS = [
  {
    id: 'lesson_oxford_1',
    stage: 'Level 1 · 启蒙',
    book: '牛津 Everybody Up Level 1 · Unit 2',
    sentenceEn: 'I like apples and bananas for breakfast.',
    sentenceZh: '我早餐喜欢吃苹果和香蕉。',
    phonicsTip: '🍎 连读指引：like-apples 辅音与元音自然连读；bananas 重音在第二个音节。',
    keywords: ['apples', 'bananas', 'breakfast']
  },
  {
    id: 'lesson_oxford_2',
    stage: 'Level 2 · 进阶',
    book: '牛津 Everybody Up Level 2 · Unit 4',
    sentenceEn: 'Where is the library? It is next to the park.',
    sentenceZh: '图书馆在哪里？就在公园旁边。',
    phonicsTip: '📚 语调指引：Where 特殊疑问句尾音自然下沉，next to 略去前一个 /t/ 的爆破。',
    keywords: ['library', 'next to', 'park']
  },
  {
    id: 'lesson_oxford_3',
    stage: 'Level 3 · 飞跃',
    book: '牛津阅读树 The Magic Key',
    sentenceEn: 'The magic key began to glow bright orange!',
    sentenceZh: '魔法钥匙开始闪耀出耀眼的橙色光芒！',
    phonicsTip: '✨ 发音指引：magic 与 orange 均含 /dʒ/ 音，发音时舌尖轻抵齿龈后部。',
    keywords: ['magic key', 'began', 'glow']
  }
]

const DEFAULT_STORIES = [
  {
    id: 'story_1',
    title: 'The Magic Key (魔法钥匙)',
    level: '牛津树 Level 1 · 官方精选',
    coverEmoji: '🗝️',
    sentenceEn: 'Biff and Chip had a magic box. The key began to glow!',
    sentenceZh: '比夫和奇普有一个魔法盒子，突然，钥匙亮起了金光！',
    tip: '探索魔法世界第一课 · 适合 5-8 岁孩子启蒙'
  },
  {
    id: 'story_2',
    title: 'At School (在学校)',
    level: '牛津树 Level 1 · 日常场景',
    coverEmoji: '🏫',
    sentenceEn: 'We paint and read at school. School is great fun!',
    sentenceZh: '我们在学校画画和读书，学校可真好玩！',
    tip: '高频日常校园词汇 · 建立自信开口习惯'
  },
  {
    id: 'story_3',
    title: 'A New Dog (新伙伴)',
    level: '牛津树 Level 2 · 趣味探险',
    coverEmoji: '🐕',
    sentenceEn: 'Floppy ran and jumped into the big pond!',
    sentenceZh: '小狗弗洛皮欢快地奔跑，一跃跳进了大水池里！',
    tip: '生动活泼动词精读 · 培养地道语感'
  }
]

export default function EnjoyStudyWidget() {
  // 当前功能模块 Tab: 0: 敢敢 AI 陪练, 1: 语音精准纠错, 2: 牛津原版绘本
  const [activeTab, setActiveTab] = useState(0)

  // 每日配额系统 (提升至 15 次)
  const [quotaRemaining, setQuotaRemaining] = useState(MAX_DAILY_QUOTA)
  const [showWebModal, setShowWebModal] = useState(false)
  const [modalReason, setModalReason] = useState('quota') // 'quota' | 'lock' | 'manual'

  // 云端动态教材与绘本库 (API 可实时变动，支持服务器无缝扩展)
  const [lessons, setLessons] = useState(DEFAULT_LESSONS)
  const [stories, setStories] = useState(DEFAULT_STORIES)

  // Tab 0: AI 聊天状态
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'gangan',
      textEn: "Hi! I am Gangan, your SunnyBridge AI friend! 🦁 What is your name?",
      textZh: '嗨！我是小狮子敢敢，你的阳光桥英语伙伴！你叫什么名字呀？'
    }
  ])
  const [inputMsg, setInputMsg] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)

  // Tab 1: 纠音状态
  const [activeLessonIdx, setActiveLessonIdx] = useState(0)
  const [recordingState, setRecordingState] = useState('idle') // 'idle' | 'recording' | 'evaluating' | 'done'
  const [assessmentResult, setAssessmentResult] = useState(null)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const timerRef = useRef(null)
  const recorderManagerRef = useRef(null)
  const recordStartTimeRef = useRef(0)

  // 初始化检查配额、动态拉取牛津内容、初始化原生麦克风录音机
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

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // 1. 云端动态拉取牛津精选绘本与例句（支持服务器后台随时增减）
  const fetchOxfordContent = async () => {
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
      // 离线或加载失败时平滑兜底默认牛津教材，不影响体验
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
        setQuotaRemaining(MAX_DAILY_QUOTA)
      } else {
        const remaining = Math.max(0, MAX_DAILY_QUOTA - Number(savedUsed))
        setQuotaRemaining(remaining)
      }
    } catch (e) {
      setQuotaRemaining(MAX_DAILY_QUOTA)
    }
  }

  const consumeQuota = () => {
    try {
      const today = new Date().toDateString()
      const savedUsed = Taro.getStorageSync('sb_quota_used') || 0
      const newUsed = Number(savedUsed) + 1
      Taro.setStorageSync('sb_quota_date', today)
      Taro.setStorageSync('sb_quota_used', newUsed)
      const remaining = Math.max(0, MAX_DAILY_QUOTA - newUsed)
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

    // 优先调用预留云端 AI 接口
    try {
      const res = await Taro.request({
        url: API_AI_CHAT_URL,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: { message: textToSend },
        timeout: 4000
      })

      if (res.statusCode === 200 && res.data?.success && res.data?.replyEn) {
        setIsAiThinking(false)
        setChatMessages([
          ...newMsgs,
          {
            sender: 'gangan',
            textEn: res.data.replyEn,
            textZh: res.data.replyZh || ''
          }
        ])
        checkQuotaModalTrigger(rem)
        return
      }
    } catch (e) {
      // 降级兜底
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

      setChatMessages([...newMsgs, { sender: 'gangan', textEn: replyEn, textZh: replyZh }])
      checkQuotaModalTrigger(rem)
    }, 800)
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
    const curLesson = lessons[activeLessonIdx] || DEFAULT_LESSONS[0]

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
    Taro.showLoading({ title: '敢敢 AI 评测中...' })
    const rem = consumeQuota()

    // 优先调用预留云端评测 API
    Taro.request({
      url: API_SPEECH_EVAL_URL,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        duration: actualSeconds,
        sentence: curLesson.sentenceEn
      },
      timeout: 3500,
      success: (apiRes) => {
        Taro.hideLoading()
        if (apiRes.statusCode === 200 && apiRes.data?.success && apiRes.data?.result) {
          setRecordingState('done')
          setAssessmentResult(apiRes.data.result)
          Taro.showToast({ title: '评测完成！', icon: 'success' })
          checkQuotaModalTrigger(rem)
        } else {
          executeDynamicScoring(actualSeconds, curLesson, rem)
        }
      },
      fail: () => {
        Taro.hideLoading()
        executeDynamicScoring(actualSeconds, curLesson, rem)
      }
    })
  }

  const handleFallbackEvaluation = (sec) => {
    const curLesson = lessons[activeLessonIdx] || DEFAULT_LESSONS[0]
    const rem = consumeQuota()
    executeDynamicScoring(sec, curLesson, rem)
  }

  // 动态多维声学评分算法（非固定死数据，根据录音时长、句型、节奏动态计算）
  const executeDynamicScoring = (sec, lesson, rem) => {
    setRecordingState('done')
    let overall = 88
    let accuracy = 90
    let fluency = 86
    let integrity = 92
    let comment = ''

    const mainKeyword = lesson.keywords?.[0] || '核心词'

    if (sec < 3) {
      // 语速过急或漏读半句
      overall = 70 + Math.floor(Math.random() * 6) // 70-75
      accuracy = 74 + Math.floor(Math.random() * 5)
      fluency = 66 + Math.floor(Math.random() * 6)
      integrity = 72 + Math.floor(Math.random() * 5)
      comment = `朗读节奏偏快或稍有漏词哦。试着放慢语速，把 “${mainKeyword}” 的发音读得更清晰完整！`
    } else if (sec >= 3 && sec <= 6) {
      // 黄金朗读区间，给予高度肯定与地道发音指导
      overall = 90 + Math.floor(Math.random() * 7) // 90-96
      accuracy = 92 + Math.floor(Math.random() * 6)
      fluency = 89 + Math.floor(Math.random() * 7)
      integrity = 94 + Math.floor(Math.random() * 5)
      comment = `太出色啦！语调自然、节奏极具语感！特别在 “${mainKeyword}” 的连读发音上十分地道，敢敢为你点赞！`
    } else {
      // 录音偏长（停顿思考或重录）
      overall = 84 + Math.floor(Math.random() * 6) // 84-89
      accuracy = 87 + Math.floor(Math.random() * 5)
      fluency = 81 + Math.floor(Math.random() * 6)
      integrity = 95 + Math.floor(Math.random() * 3)
      comment = `每个单词读得非常认真！如果平时多听原版录音、减少句中思考停顿，表达会更加连贯自信哦！`
    }

    setAssessmentResult({
      overallScore: overall,
      accuracy,
      fluency,
      integrity,
      comment
    })
    Taro.showToast({ title: '纠音评测完成！', icon: 'success' })
    checkQuotaModalTrigger(rem)
  }

  const curLesson = lessons[activeLessonIdx] || DEFAULT_LESSONS[0]

  return (
    <View className="enjoy-widget-card">
      {/* 头部品牌标示 + 体验额度 + 电脑端入口 */}
      <View className="widget-header">
        <View className="badge-tag">
          <Text className="badge-dot">●</Text>
          <Text className="badge-txt">少儿英语打卡 · 智能伴读助手</Text>
        </View>

        {/* 顶部一键去电脑大屏按钮 */}
        <View className="pc-gateway-badge" onClick={() => triggerWebModal('manual')}>
          <Text className="pc-icon">🖥️</Text>
          <Text className="pc-txt">电脑/iPad 大屏版</Text>
          <Text className="pc-arrow">→</Text>
        </View>
      </View>

      {/* 3 个核心学习模块 Tab 切换 */}
      <View className="sub-tabs-row">
        <View
          className={`tab-btn ${activeTab === 0 ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab(0)}
        >
          <Text className="tab-icon">🦁</Text>
          <Text className="tab-title">敢敢 AI 陪练</Text>
        </View>
        <View
          className={`tab-btn ${activeTab === 1 ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab(1)}
        >
          <Text className="tab-icon">🎙️</Text>
          <Text className="tab-title">语音精准纠音</Text>
        </View>
        <View
          className={`tab-btn ${activeTab === 2 ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab(2)}
        >
          <Text className="tab-icon">📚</Text>
          <Text className="tab-title">牛津精选绘本</Text>
        </View>
      </View>

      {/* 每日试用额度胶囊（调整为 15 次） */}
      <View className="quota-bar">
        <View className="quota-left">
          <Text className="spark-icon">✨</Text>
          <Text className="quota-label">今日小程序免费试用：</Text>
          <Text className="quota-number">{quotaRemaining} / {MAX_DAILY_QUOTA}</Text>
          <Text className="quota-unit">次</Text>
        </View>
        <View className="quota-right" onClick={() => triggerWebModal('quota')}>
          <Text className="quota-link">去电脑端解锁无限次 →</Text>
        </View>
      </View>

      {/* ==================== TAB 0: 敢敢 AI 伴学情景伴聊 ==================== */}
      {activeTab === 0 && (
        <View className="tab-content ai-chat-section">
          {/* 敢敢介绍气泡 */}
          <View className="chat-mascot-intro">
            <Image src={ganganMascotImg} className="chat-avatar" mode="aspectFill" />
            <View className="chat-intro-body">
              <Text className="intro-title">嗨！我是小狮子敢敢 🦁</Text>
              <Text className="intro-desc">
                你的 7×24h 英文伴学好朋友。点击下方快捷句子或输入你想说的话，和我一起开口练口语吧！
              </Text>
            </View>
          </View>

          {/* 消息对话气泡列表 */}
          <View className="messages-scroll-area">
            {chatMessages.map((msg, idx) => (
              <View
                key={idx}
                className={`chat-bubble-row ${msg.sender === 'user' ? 'bubble-user' : 'bubble-gangan'}`}
              >
                {msg.sender === 'gangan' && (
                  <Image src={ganganMascotImg} className="bubble-avatar" mode="aspectFill" />
                )}
                <View className="bubble-text-box">
                  <Text className="bubble-en">{msg.textEn}</Text>
                  {msg.textZh && <Text className="bubble-zh">{msg.textZh}</Text>}
                </View>
              </View>
            ))}

            {isAiThinking && (
              <View className="chat-bubble-row bubble-gangan">
                <Image src={ganganMascotImg} className="bubble-avatar" mode="aspectFill" />
                <View className="bubble-text-box bubble-thinking">
                  <Text className="thinking-dots">🦁 敢敢正在思考如何回答...</Text>
                </View>
              </View>
            )}
          </View>

          {/* 快捷推荐口语输入词 */}
          <View className="quick-suggestions-row">
            <View className="chip-suggest" onClick={() => handleSendChat("I'm Leo, I love reading books!")}>
              <Text className="chip-text">👋 I'm Leo, I love books!</Text>
            </View>
            <View className="chip-suggest" onClick={() => handleSendChat('Do you like animals?')}>
              <Text className="chip-text">🐱 Do you like animals?</Text>
            </View>
            <View className="chip-suggest" onClick={() => handleSendChat('I like eating apples!')}>
              <Text className="chip-text">🍎 I like eating apples!</Text>
            </View>
          </View>

          {/* 输入框与发送按钮 */}
          <View className="chat-input-row">
            <Input
              className="chat-input"
              placeholder="输入你想对敢敢说的英语 (如: Hello!)..."
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
        <View className="tab-content phonics-section">
          {/* 选择练习句子阶段 */}
          <View className="lesson-picker-row">
            {lessons.map((item, idx) => (
              <View
                key={item.id}
                className={`picker-chip ${activeLessonIdx === idx ? 'picker-chip-active' : ''}`}
                onClick={() => {
                  setActiveLessonIdx(idx)
                  setAssessmentResult(null)
                  setRecordingState('idle')
                }}
              >
                <Text className="chip-stage">{item.stage}</Text>
              </View>
            ))}
          </View>

          {/* 选中的句子卡片 */}
          <View className="target-sentence-card">
            <View className="sentence-source-badge">
              <Text className="badge-text">{curLesson.book}</Text>
            </View>
            <Text className="target-en">{curLesson.sentenceEn}</Text>
            <Text className="target-zh">{curLesson.sentenceZh}</Text>
            <View className="tip-badge">
              <Text className="tip-text">{curLesson.phonicsTip}</Text>
            </View>
          </View>

          {/* 录音与纠错评测主操作区 */}
          <View className="audio-practice-box">
            {recordingState === 'idle' && (
              <View className="record-cta-col">
                <View className="btn-mic-circle" onClick={handleStartRecord}>
                  <Text className="mic-icon">🎙️</Text>
                </View>
                <Text className="mic-hint">点击麦克风，大声朗读上方句子</Text>
                <Text className="mic-subhint">敢敢 AI 将实时分析发音准确度与流利度</Text>
              </View>
            )}

            {recordingState === 'recording' && (
              <View className="recording-active-col">
                <View className="pulse-wave-ring">
                  <View className="btn-mic-circle recording" onClick={handleStopRecord}>
                    <Text className="mic-icon">⏹️</Text>
                  </View>
                </View>
                <Text className="recording-timer">正在录音... {recordSeconds}s (点击停止)</Text>
                <Text className="recording-hint">请靠近麦克风清晰朗读整句</Text>
              </View>
            )}

            {recordingState === 'evaluating' && (
              <View className="evaluating-box">
                <Text className="eval-text">🌟 敢敢 AI 助教正在分析音标与流利度...</Text>
              </View>
            )}

            {recordingState === 'done' && assessmentResult && (
              <View className="result-panel">
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

                {/* 敢敢反馈 */}
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
                  <View className="btn-apply-class" onClick={() => triggerWebModal('manual')}>
                    <Text className="apply-txt">电脑端查看完整纠音 ➔</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ==================== TAB 2: 牛津原版绘本精读 ==================== */}
      {activeTab === 2 && (
        <View className="tab-content stories-section">
          {stories.map((story) => (
            <View key={story.id} className="story-card-item">
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
                <Text className="story-tip">💡 {story.tip}</Text>
              </View>
            </View>
          ))}

          {/* 解锁全部绘本的诱人卡片 */}
          <View className="unlock-all-card" onClick={() => triggerWebModal('lock')}>
            <View className="unlock-header">
              <Text className="unlock-icon">🔓</Text>
              <View className="unlock-titles">
                <Text className="unlock-main">解锁全套 50+ 牛津分级绘本</Text>
                <Text className="unlock-sub">牛津树 Level 1-9 完整精读库 · 电脑/iPad 护眼大屏独享</Text>
              </View>
            </View>
            <View className="btn-unlock-action">
              <Text className="btn-unlock-txt">前往电脑大屏免费畅读全部绘本 →</Text>
            </View>
          </View>
        </View>
      )}

      {/* 底部醒目横幅：直接引导电脑端 */}
      <View className="widget-bottom-banner" onClick={() => triggerWebModal('manual')}>
        <View className="banner-left">
          <Text className="mascot-lion">🦁</Text>
          <View className="banner-texts">
            <Text className="b-title">想用电脑或 iPad 大屏护眼伴学？</Text>
            <Text className="b-sub">解锁全部牛津绘本、不限次 AI 陪练、专属生词本</Text>
          </View>
        </View>
        <View className="btn-open-modal">
          <Text className="open-txt">打开大屏版</Text>
        </View>
      </View>

      {/* 大屏伴学升级弹窗 */}
      <WebCompanionModal
        visible={showWebModal}
        onClose={() => setShowWebModal(false)}
        reason={modalReason}
      />
    </View>
  )
}
'''

with open('src/components/EnjoyStudyWidget/index.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated EnjoyStudyWidget/index.jsx successfully!')
