import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import globeImg from '../../assets/pixar_globe.jpg'
import './index.scss'

const DAILY_QUOTES = [
  {
    id: 'spark_001',
    theme: '今日探险金句',
    en: 'Every small step makes a big adventure!',
    zh: '每一次大胆开口，都是通往广阔世界的奇妙探险！',
    tip: '💡 语感小贴士：small-step 与 big-adventure 连读自然连贯，不要刻意停顿哦。',
    soundDesc: '美式纯正原声 · 节奏欢快'
  },
  {
    id: 'spark_002',
    theme: '勇敢表达力量',
    en: 'Mistakes are proof that you are trying!',
    zh: '说错一点不可怕，这是勇敢尝试最酷的印记！',
    tip: '💡 肢体引导：表达 trying 时配上大拇指 👍，孩子记忆会更加深刻。',
    soundDesc: '温柔鼓励语调 · 亲和耐心'
  },
  {
    id: 'spark_003',
    theme: '自信语感积累',
    en: 'Practice brings progress, not just perfection!',
    zh: '每天多开口说一点，自信和纯正语感自然水到渠成！',
    tip: '💡 发音细节：practice 与 progress 的首音节轻重抑扬顿挫，极富律动感。',
    soundDesc: '自然对话语境 · 地道表达'
  }
]

export default function DailySparkCard() {
  const [quotes, setQuotes] = useState(DAILY_QUOTES)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const audioCtxRef = useRef(null)

  useEffect(() => {
    // 允许静音模式下播放声音（iOS 手机静音开关兼容）
    if (Taro.setInnerAudioOption) {
      Taro.setInnerAudioOption({
        obeyMuteSwitch: false,
        mixWithOtherAudio: false
      })
    }

    const ctx = Taro.createInnerAudioContext()
    ctx.onPlay(() => {
      setIsPlaying(true)
    })
    ctx.onEnded(() => {
      setIsPlaying(false)
    })
    ctx.onStop(() => {
      setIsPlaying(false)
    })
    ctx.onError((err) => {
      console.warn('[Audio] playback error:', err)
      setIsPlaying(false)
    })
    audioCtxRef.current = ctx

    // 从云端后台拉取最新动态库，并按日期自动轮转
    Taro.request({
      url: 'https://app.sunnybridge.qzz.io/api/v1/content/public',
      method: 'GET'
    }).then((res) => {
      if (res.statusCode === 200 && res.data?.data?.daily_sparks?.length) {
        const list = res.data.data.daily_sparks
        setQuotes(list)
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
        setCurrentIdx(dayOfYear % list.length)
      }
    }).catch(() => {
      // 离线时平滑保底使用内置库
    })

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.destroy()
      }
    }
  }, [])

  const quote = quotes[currentIdx] || quotes[0] || DAILY_QUOTES[0]

  const getAudioSrc = (q) => {
    if (q.audioUrl && q.audioUrl.startsWith('http')) {
      return q.audioUrl
    }
    const idStr = String(q.id).includes('spark_')
      ? q.id
      : `spark_${String(q.id).padStart(3, '0')}`
    return `https://api.sunnybridge.qzz.io/api/v1/content/audio/${idStr}.mp3`
  }

  const handleNext = () => {
    if (audioCtxRef.current) {
      audioCtxRef.current.stop()
    }
    setIsPlaying(false)
    setShowTip(false)
    setCurrentIdx((prev) => (prev + 1) % quotes.length)
    if (Taro.vibrateShort) {
      Taro.vibrateShort({ type: 'light' })
    }
  }

  const handlePlayAudio = () => {
    if (!audioCtxRef.current) return

    if (isPlaying) {
      audioCtxRef.current.stop()
      setIsPlaying(false)
      return
    }

    const src = getAudioSrc(quote)
    audioCtxRef.current.src = src
    audioCtxRef.current.play()

    if (Taro.vibrateShort) {
      Taro.vibrateShort({ type: 'medium' })
    }
  }

  return (
    <View className="daily-spark-container">
      {/* 3D Pixar Badge Header */}
      <View className="spark-header">
        <View className="spark-badge">
          <Text className="spark-badge-dot">🌟</Text>
          <Text className="spark-badge-text">每日原版磨耳朵 · 3D 有声卡</Text>
        </View>
        <View className="spark-refresh-btn" onClick={handleNext}>
          <Text className="refresh-icon">🔄</Text>
          <Text className="refresh-text">换一句</Text>
        </View>
      </View>

      {/* Main 3D Card */}
      <View className="spark-card">
        {/* Globe 3D Character Avatar & Audio Bubble */}
        <View className="spark-character-row">
          <View className="globe-avatar-wrap">
            <Image src={globeImg} className="globe-3d-img" mode="aspectFill" />
            <View className="globe-glow-ring" />
          </View>

          <View className="speech-bubble-3d">
            <View className="bubble-tag-row">
              <Text className="bubble-theme-tag">{quote.theme}</Text>
              <Text className="bubble-sound-info">{quote.soundDesc}</Text>
            </View>
            <Text className="bubble-en-text">"{quote.en}"</Text>
            <Text className="bubble-zh-text">{quote.zh}</Text>
          </View>
        </View>

        {/* Audio Player Action Bar */}
        <View className="audio-action-bar">
          <View
            className={'play-3d-btn ' + (isPlaying ? 'btn-playing' : '')}
            onClick={handlePlayAudio}
          >
            <Text className="play-icon">{isPlaying ? '⏸️' : '▶️'}</Text>
            <Text className="play-label">
              {isPlaying ? '正在沉浸播放中...' : '点击收听纯正原音'}
            </Text>
            {isPlaying && (
              <View className="audio-wave">
                <View className="wave-bar bar-1" />
                <View className="wave-bar bar-2" />
                <View className="wave-bar bar-3" />
                <View className="wave-bar bar-4" />
              </View>
            )}
          </View>

          <View
            className={'tips-toggle-btn ' + (showTip ? 'tips-active' : '')}
            onClick={() => setShowTip(!showTip)}
          >
            <Text className="tips-icon">💡</Text>
            <Text className="tips-label">{showTip ? '收起要点' : '发音秘诀'}</Text>
          </View>
        </View>

        {/* Expandable Pronunciation Secret Tip */}
        {showTip && (
          <View className="pronounce-tip-box">
            <Text className="tip-title">🎯 专属母语交流秘诀：</Text>
            <Text className="tip-desc">{quote.tip}</Text>
          </View>
        )}
      </View>
    </View>
  )
}
