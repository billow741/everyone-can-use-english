import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'

export const API_BASE_URL = 'https://app.sunnybridge.qzz.io'
export const API_CONFIG_URL = `${API_BASE_URL}/api/v1/config/app`

// 客户端内置骨架兜底配置（保证离线或首屏 0ms 瞬间渲染，杜绝白屏与等待）
export const DEFAULT_APP_CONFIG = {
  version: '1.0.0',
  auditMode: true,
  appMeta: {
    appName: 'SunnyBridge 阳光桥',
    appSubtitle: '少儿趣味英语 · 智能伴读打卡工具',
    brandLogo: 'https://app.sunnybridge.qzz.io/assets/qiaobao_sunny240.png',
    mascotName: '敢敢',
    mascotTitle: '🦁 伴学小向导 · 敢敢',
    mascotGreeting: '“Hi there! 今天想和我聊英语，还是精读牛津原版绘本？”',
    shareTitle: '🦁 阳光桥 SunnyBridge · 电脑/iPad 专属护眼大屏伴学平台',
    shareImageUrl: 'https://app.sunnybridge.qzz.io/assets/qiaobao_sunny240.png'
  },
  quotaConfig: {
    maxDailyQuota: 15,
    quotaBarText: '今日试用体验：{remaining} / {max} 次 · 直连云端',
    quotaActionText: '前往电脑大屏完整体验 →',
    quotaExhaustedTitle: '今日 15 次体验已完成 🎉',
    quotaExhaustedDesc: '推荐前往电脑或 iPad 大屏端，享受无限制沉浸式纯正英语伴读！'
  },
  chatConfig: {
    enabled: true,
    tabTitle: '敢敢口语伴读',
    tabEmoji: '🦁',
    initialAiMessage: {
      en: 'Hi! I am Gangan, your SunnyBridge learning friend! 🦁 What is your name?',
      zh: '嗨！我是小狮子敢敢，你的阳光桥英语伴读伙伴！你叫什么名字呀？'
    },
    inputPlaceholder: '输入你想对敢敢说的英语 (如 Hello!)...',
    quickPrompts: []
  },
  evalConfig: {
    enabled: true,
    tabTitle: '语音精准纠音',
    tabEmoji: '🎙️',
    indicatorBadge: '☁️ SunnyBridge 云端 AI 精准评测',
    showSpectrogram: true,
    showDiagnostics: true
  },
  storyConfig: {
    enabled: true,
    tabTitle: '牛津精选绘本',
    tabEmoji: '📚'
  },
  promotionCard: {
    enabled: true,
    badgeIcon: '🎁',
    badgeName: '新用户交流特权',
    slotsTip: '今日开放预约中',
    heading: '预约 50分钟 少儿英语交流体验',
    subheading: '专属交流伙伴 · 牛津原版体系深度互动 · 日常配合敢敢智能纠错',
    guarantees: [
      { icon: '🤝', label: '专属交流伙伴' },
      { icon: '⏱️', label: '50分钟深度交流' },
      { icon: '📚', label: '纯正语感打磨' },
      { icon: '🌍', label: '自信流利表达' }
    ],
    buttonText: '立即预约交流体验 →',
    targetUrl: '/pages/apply/index'
  },
  contactConfig: {
    consultantTitle: '专属少儿英语伴学顾问',
    wechatId: 'SunnyBridge_Helper'
  }
}

// 内存中活跃配置单例
let memoryConfig = null
const listeners = new Set()

export const getInitialConfig = () => {
  if (memoryConfig) return memoryConfig
  try {
    const cached = Taro.getStorageSync('sunny_app_config')
    if (cached && typeof cached === 'object') {
      memoryConfig = { ...DEFAULT_APP_CONFIG, ...cached }
      return memoryConfig
    }
  } catch (e) {}
  memoryConfig = DEFAULT_APP_CONFIG
  return memoryConfig
}

export const fetchRemoteConfig = async () => {
  try {
    const res = await Taro.request({
      url: API_CONFIG_URL,
      method: 'GET',
      timeout: 5000
    })
    if (res.statusCode === 200 && res.data?.config) {
      const merged = { ...DEFAULT_APP_CONFIG, ...res.data.config }
      memoryConfig = merged
      try {
        Taro.setStorageSync('sunny_app_config', merged)
      } catch (e) {}
      listeners.forEach((fn) => {
        try {
          fn(merged)
        } catch (err) {}
      })
      return merged
    }
  } catch (e) {
    // 弱网或无网静默使用当前缓存，不中断体验
  }
  return memoryConfig || DEFAULT_APP_CONFIG
}

// React Hook: 在任何组件或页面中订阅全动态配置
export const useAppConfig = () => {
  const [config, setConfig] = useState(getInitialConfig())

  useEffect(() => {
    const handler = (newCfg) => setConfig(newCfg)
    listeners.add(handler)
    // 挂载时触发静默后台刷新
    fetchRemoteConfig()
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return config
}
