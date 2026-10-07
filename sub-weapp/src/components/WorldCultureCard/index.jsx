import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const CULTURE_TOPICS = [
  {
    id: 'lunchbox',
    icon: '🥪',
    tabName: '神秘午餐盒',
    title: '欧美小学生的 Lunchbox 里装些什么？',
    subtitle: '不止是美味美食，还有藏在盒盖里的温情暗号',
    fact: '经典标配是香甜的花生酱果酱三明治 (PB&J) 配一盒切片苹果与小彩虹胡萝卜。很多欧美爸爸妈妈还会在餐盒里悄悄塞一张手写小纸条：“You are awesome, have fun!”，给孩子一整天的暖心鼓励！',
    words: [
      { en: 'Lunchbox', zh: '午餐便当盒' },
      { en: 'Snack time', zh: '课间加餐时光' },
      { en: 'Kind note', zh: '手写鼓励便签' }
    ]
  },
  {
    id: 'showntell',
    icon: '🎒',
    tabName: 'Show & Tell',
    title: '什么是欧美课堂风靡的「Show & Tell」？',
    subtitle: '带上最爱的宝藏，站上讲台成为自信小讲师',
    fact: '每周一次的 Show and Tell 是孩子最期盼的环节！小朋友会从家里带一件自己最珍视的宝贝（亲手拼的乐高、海边捡的奇异贝壳），用生动自然的句子分享：“This is my treasure...” 从小锻炼公众表达与叙事魅力！',
    words: [
      { en: 'Show & Tell', zh: '实物分享表达课' },
      { en: 'Treasure', zh: '珍爱的小宝藏' },
      { en: 'Share story', zh: '大声自信讲故事' }
    ]
  },
  {
    id: 'bus',
    icon: '🚌',
    tabName: '伦敦双层车',
    title: '伦敦标志性红色双层巴士的「叮叮」暗号',
    subtitle: '坐在二层看世界，下车前要按响神秘小按钮',
    fact: '伦敦标志性的 Double-decker 红巴士有两层楼高！坐在顶层第一排就像在开过山车。如果想在下一站下车，只要轻轻按一下柱子上的红纽，清脆的“Ding Ding!”声就会通知司机叔叔停靠站台。',
    words: [
      { en: 'Double-decker', zh: '双层大巴士' },
      { en: 'Ring the bell', zh: '按响下车铃' },
      { en: 'Next stop', zh: '下一站抵达' }
    ]
  }
]

export default function WorldCultureCard({ onExploreClick }) {
  const [topics, setTopics] = useState(CULTURE_TOPICS)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    // 从 D1 数据库拉取最新世界文化漫游卡
    Taro.request({
      url: 'https://api.sunnybridge.qzz.io/api/v1/content/public',
      method: 'GET'
    }).then((res) => {
      if (res.statusCode === 200 && res.data?.data?.culture_bites?.length) {
        setTopics(res.data.data.culture_bites)
      }
    }).catch(() => {
      // 离线时平滑保底使用内置库
    })
  }, [])

  const current = topics[activeTab] || topics[0] || CULTURE_TOPICS[0]

  const handleSelectTab = (idx) => {
    setActiveTab(idx)
    if (Taro.vibrateShort) {
      Taro.vibrateShort({ type: 'light' })
    }
  }

  return (
    <View className="world-culture-container">
      {/* Header */}
      <View className="culture-header">
        <View className="culture-badge">
          <Text className="badge-icon">🌍</Text>
          <Text className="badge-text">世界文化奇趣漫游 · 跨国小视野</Text>
        </View>
        <Text className="culture-sub-tag">真实生活体验</Text>
      </View>

      {/* Tabs */}
      <View className="culture-tabs-bar">
        {topics.map((item, idx) => (
          <View
            key={item.id}
            className={'culture-tab-pill ' + (activeTab === idx ? 'tab-pill-active' : '')}
            onClick={() => handleSelectTab(idx)}
          >
            <Text className="tab-icon">{item.icon}</Text>
            <Text className="tab-name">{item.tabName}</Text>
          </View>
        ))}
      </View>

      {/* 3D Story Card */}
      <View className="culture-content-card">
        <View className="story-title-row">
          <Text className="story-icon-3d">{current.icon}</Text>
          <View className="story-title-group">
            <Text className="story-main-title">{current.title}</Text>
            <Text className="story-sub-title">{current.subtitle}</Text>
          </View>
        </View>

        <Text className="story-fact-text">{current.fact}</Text>

        {/* Culture Micro Vocab Chips */}
        <View className="vocab-chips-row">
          <Text className="vocab-label">✨ 文化趣词：</Text>
          {current.words.map((w, idx) => (
            <View key={idx} className="vocab-chip">
              <Text className="chip-en">{w.en}</Text>
              <Text className="chip-zh">{w.zh}</Text>
            </View>
          ))}
        </View>

        {/* Interactive Bottom Hook */}
        <View className="culture-action-hook" onClick={onExploreClick}>
          <View className="hook-left">
            <Text className="hook-title">想和专属伙伴畅聊更多世界趣事？</Text>
            <Text className="hook-sub">50分钟沉浸交流 · 激发真实表达欲</Text>
          </View>
          <View className="hook-btn">
            <Text className="hook-btn-text">预约体验 →</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
