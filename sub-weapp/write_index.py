import os

content = '''import React, { useState } from 'react'
import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import logoImg from '../../assets/sunblogo1.webp'
import teacher1Img from '../../assets/teacher-1.webp'
import teacher2Img from '../../assets/teacher-2.webp'
import './index.scss'

function Index() {
  const [activeCourseTab, setActiveCourseTab] = useState(0)

  const navigateToApply = (defaultCourse = '') => {
    const query = defaultCourse ? '?course=' + encodeURIComponent(defaultCourse) : ''
    Taro.navigateTo({
      url: '/pages/apply/index' + query
    })
  }

  const courses = [
    {
      stage: 'Stage 1',
      title: '自然拼读 Phonics',
      age: '3-6岁 零基础/初学',
      highlights: ['26个字母发音规则', 'CVC单词秒拼读', '见词能读·听音能写', '趣味律动童谣'],
      target: '建立字母-声音直觉反应，自主拼读基础绘本'
    },
    {
      stage: 'Stage 2',
      title: '牛津 Everybody Up',
      age: '5-12岁 幼小进阶',
      highlights: ['全球权威牛津原版', 'CLIL跨学科通识', '高频生活场景对话', '全英文思维训练'],
      target: '无缝对标欧标CEFR Pre-A1至A2，日常自信流利表达'
    },
    {
      stage: 'Stage 3',
      title: '剑桥 THiNK / 新概念',
      age: '10-15岁 进阶升学',
      highlights: ['KET/PET考级定向衔接', '初中语法体系化梳理', '思辨长篇阅读理解', '议论文精准写作'],
      target: '轻松应对校内小升初/中考与综合英语等级考'
    }
  ]

  const painPoints = [
    {
      icon: '🤐',
      pain: '单词背不少，开口不敢说',
      desc: '脑中频繁英汉翻译，语速一快立刻卡壳',
      solution: 'TPR全英文直觉浸泡，建立条件反射'
    },
    {
      icon: '🏫',
      pain: '大班课老师顾不过来',
      desc: '一节课单独开口不足2分钟，全程当“听众”',
      solution: '1对1专属高频轮转，每节课开口上百次'
    },
    {
      icon: '🔄',
      pain: '频繁换外教，孩子没安全感',
      desc: '每次都换新面孔，前十分钟都在重复自我介绍',
      solution: '专属固定外教，熟悉性格定制专属步调'
    },
    {
      icon: '⏳',
      pain: '25分钟太短，刚热身就下课',
      desc: '设备调试寒暄几分钟，新知识刚讲完即匆忙掐断',
      solution: '坚持50分钟黄金闭环，当堂消化吸收'
    }
  ]

  const reviews = [
    {
      name: '陈女士 (浩浩妈妈)',
      info: '孩子 5岁 · 自然拼读第3个月',
      content: '跟着 Teacher AMC 学拼读后，看到绘本上的新词自己就会拼，成就感爆棚！固定老师真的有耐心，孩子每周都数着时间盼着上课。'
    },
    {
      name: '刘先生 (依依爸爸)',
      info: '孩子 8岁 · Everybody Up L2',
      content: '之前在别的平台每次抢老师心累，换了固定外教后，老师特别懂她的性格。50分钟节奏很扎实，孩子现在敢主动用长句子和我英文对话了。'
    }
  ]

  return (
    <View className="page-container">
      {/* 1. Header & Hero Section */}
      <View className="hero-section">
        {/* Brand Bar */}
        <View className="brand-bar">
          <Image src={logoImg} className="brand-logo" mode="aspectFit" />
          <View className="brand-text">
            <Text className="brand-name">SunnyBridge 阳光桥少儿英语</Text>
            <Text className="brand-slogan">Bridging Smiles. Building Futures.</Text>
          </View>
        </View>

        {/* Price Anchor */}
        <View className="price-pill">
          <View className="pulse-dot" />
          <Text className="pill-text">1对1专属固定外教 · 118元 / 50分钟</Text>
        </View>

        {/* Hero Title */}
        <View className="hero-headline">
          <Text className="headline-text">让孩子从不敢开口</Text>
          <Text className="headline-highlight">到自信流利表达</Text>
        </View>

        <Text className="hero-subtext">
          资深菲律宾专业外教 · 温柔耐心与TPR肢体引导 · 50分钟高频沉浸交流，帮孩子打磨出地道纯正语感
        </Text>

        {/* Trust Badges */}
        <View className="trust-grid">
          <View className="trust-badge">
            <Text className="badge-icon">👩‍🏫</Text>
            <Text className="badge-title">1对1专属固定外教</Text>
            <Text className="badge-sub">无需抢课 · 懂孩子</Text>
          </View>
          <View className="trust-badge">
            <Text className="badge-icon">⏱️</Text>
            <Text className="badge-title">50分钟黄金闭环</Text>
            <Text className="badge-sub">学练测评 · 当堂吸收</Text>
          </View>
          <View className="trust-badge">
            <Text className="badge-icon">📖</Text>
            <Text className="badge-title">牛津原版经典教材</Text>
            <Text className="badge-sub">Everybody Up 权威</Text>
          </View>
          <View className="trust-badge">
            <Text className="badge-icon">🎓</Text>
            <Text className="badge-title">500+ 家庭长效信赖</Text>
            <Text className="badge-sub">98% 家长好评率</Text>
          </View>
        </View>
      </View>

      {/* 2. Core Pain Points & Solutions */}
      <View className="module-card">
        <View className="module-header">
          <Text className="module-tag">Core Pain Points</Text>
          <Text className="module-title">为什么孩子开口难？<Text className="text-primary">我们科学破解</Text></Text>
        </View>

        <View className="pain-list">
          {painPoints.map((item, idx) => (
            <View key={idx} className="pain-card">
              <View className="pain-top">
                <Text className="pain-icon">{item.icon}</Text>
                <View className="pain-text">
                  <Text className="pain-problem">{item.pain}</Text>
                  <Text className="pain-desc">{item.desc}</Text>
                </View>
              </View>
              <View className="solution-tag">
                <Text className="solution-icon">✨</Text>
                <Text className="solution-text">{item.solution}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 3. 50-Min vs 25-Min Comparison */}
      <View className="module-card highlight-card">
        <View className="module-header">
          <Text className="module-tag">Scientific Methodology</Text>
          <Text className="module-title">为什么坚守 <Text className="text-primary">50分钟</Text> 黄金闭环？</Text>
          <Text className="module-desc">语言习得必须经历「输入 → 理解 → 高频输出 → 纠偏」的完整闭环。</Text>
        </View>

        <View className="compare-box">
          {/* 25 Min Mode */}
          <View className="compare-item compare-bad">
            <View className="compare-item-header">
              <Text className="compare-title">⚠️ 市面常见 25 分钟模式</Text>
              <Text className="compare-status status-bad">浅层碎片化</Text>
            </View>
            <View className="timeline-bar">
              <View className="bar-seg seg-gray" style={{ width: '25%' }}><Text className="seg-label">寒暄 5m</Text></View>
              <View className="bar-seg seg-orange-light" style={{ width: '55%' }}><Text className="seg-label">单向灌输 15m</Text></View>
              <View className="bar-seg seg-red" style={{ width: '20%' }}><Text className="seg-label">断 5m</Text></View>
            </View>
            <Text className="compare-verdict verdict-bad">❌ 痛点：孩子刚放松进入状态就下课，没有充足时间纠音与深度复盘。</Text>
          </View>

          {/* 50 Min Mode */}
          <View className="compare-item compare-good">
            <View className="compare-item-header">
              <Text className="compare-title">🌟 SunnyBridge 50 分钟闭环</Text>
              <Text className="compare-status status-good">深度浸泡 · 脱口而出</Text>
            </View>
            <View className="timeline-bar">
              <View className="bar-seg seg-warm" style={{ width: '12%' }}><Text className="seg-label">激活 5m</Text></View>
              <View className="bar-seg seg-blue" style={{ width: '28%' }}><Text className="seg-label">输入 15m</Text></View>
              <View className="bar-seg seg-green" style={{ width: '40%' }}><Text className="seg-label">实战互动 20m</Text></View>
              <View className="bar-seg seg-purple" style={{ width: '20%' }}><Text className="seg-label">复盘 10m</Text></View>
            </View>
            <Text className="compare-verdict verdict-good">✅ 优势：充足的20分钟1对1自由输出与游戏互动，新句型当堂形成肌肉记忆！</Text>
          </View>
        </View>
      </View>

      {/* 4. Course Curriculum Stages */}
      <View className="module-card">
        <View className="module-header">
          <Text className="module-tag">Curriculum</Text>
          <Text className="module-title">阶梯式<Text className="text-primary">精品课程体系</Text></Text>
          <Text className="module-desc">从趣味拼读启蒙到初中高分升学，科学规划成长路径</Text>
        </View>

        {/* Stage Tabs */}
        <View className="course-tabs">
          {courses.map((c, i) => (
            <View
              key={i}
              className={'course-tab-item ' + (activeCourseTab === i ? 'tab-active' : '')}
              onClick={() => setActiveCourseTab(i)}
            >
              <Text className="tab-stage">{c.stage}</Text>
              <Text className="tab-name">{c.title}</Text>
            </View>
          ))}
        </View>

        {/* Selected Course Card */}
        <View className="course-detail-card">
          <View className="course-detail-top">
            <View>
              <Text className="course-detail-title">{courses[activeCourseTab].title}</Text>
              <Text className="course-detail-age">{courses[activeCourseTab].age}</Text>
            </View>
            <View className="course-price-badge">
              <Text className="price-num">118元</Text>
              <Text className="price-unit">/50分钟</Text>
            </View>
          </View>

          <View className="course-highlights-grid">
            {courses[activeCourseTab].highlights.map((h, hi) => (
              <View key={hi} className="highlight-pill">
                <Text className="highlight-dot">✓</Text>
                <Text className="highlight-text">{h}</Text>
              </View>
            ))}
          </View>

          <View className="course-target-box">
            <Text className="target-label">🎯 阶段目标：</Text>
            <Text className="target-content">{courses[activeCourseTab].target}</Text>
          </View>

          <View 
            className="course-book-btn"
            onClick={() => navigateToApply(courses[activeCourseTab].title)}
          >
            <Text className="book-btn-text">预约该阶段 25分钟试听课 →</Text>
          </View>
        </View>
      </View>

      {/* 5. Teachers Showcase */}
      <View className="module-card">
        <View className="module-header">
          <Text className="module-tag">Our Faculty</Text>
          <Text className="module-title">持证资深<Text className="text-primary">专业外教</Text></Text>
          <Text className="module-desc">100% 持有国际 TESOL/TEFL 认证，纯正美式口音，耐心亲和</Text>
        </View>

        <View className="teachers-grid">
          {/* Teacher 1 */}
          <View className="teacher-item">
            <Image src={teacher1Img} className="teacher-avatar" mode="aspectFill" />
            <View className="teacher-info">
              <View className="teacher-name-row">
                <Text className="teacher-name">Teacher AMC</Text>
                <Text className="teacher-cert">TESOL 国际认证</Text>
              </View>
              <Text className="teacher-exp">8年少儿英语教龄 · 英语教育学士</Text>
              <Text className="teacher-quote">“用欢快儿歌与TPR互动，帮孩子找回敢于开口的天赋与快乐！”</Text>
              <View className="teacher-tags">
                <Text className="tag-pill">120+在读学员</Text>
                <Text className="tag-pill">擅长自然拼读</Text>
                <Text className="tag-pill">启蒙耐心导师</Text>
              </View>
            </View>
          </View>

          {/* Teacher 2 */}
          <View className="teacher-item">
            <Image src={teacher2Img} className="teacher-avatar" mode="aspectFill" />
            <View className="teacher-info">
              <View className="teacher-name-row">
                <Text className="teacher-name">Teacher Jennifer</Text>
                <Text className="teacher-cert">TEFL 国际认证</Text>
              </View>
              <Text className="teacher-exp">12年少儿教龄 · 教育学硕士</Text>
              <Text className="teacher-quote">“启发式跨学科提问，让孩子不仅会说英语，更具备批判性英语思维。”</Text>
              <View className="teacher-tags">
                <Text className="tag-pill">100+在读学员</Text>
                <Text className="tag-pill">牛津EU全阶主讲</Text>
                <Text className="tag-pill">97%家长高分好评</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 6. Parent Word of Mouth */}
      <View className="module-card">
        <View className="module-header">
          <Text className="module-tag">Real Feedback</Text>
          <Text className="module-title">500+ 家庭的<Text className="text-primary">真实信赖</Text></Text>
        </View>

        <View className="reviews-list">
          {reviews.map((r, ri) => (
            <View key={ri} className="review-card">
              <View className="stars">⭐⭐⭐⭐⭐</View>
              <Text className="review-content">“{r.content}”</Text>
              <View className="review-author-row">
                <Text className="author-name">{r.name}</Text>
                <Text className="author-tag">{r.info}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 7. Bottom Spacer for Floating Bar */}
      <View className="bottom-bar-spacer" />

      {/* 8. Floating Action Bar */}
      <View className="floating-action-bar">
        {/* Contact Advisor Button */}
        <View className="action-advisor">
          <Button openType="contact" className="advisor-btn">
            <Text className="advisor-icon">💬</Text>
            <Text className="advisor-label">企微咨询</Text>
          </Button>
        </View>

        {/* Primary CTA */}
        <View className="action-main" onClick={() => navigateToApply()}>
          <View className="main-cta-btn">
            <Text className="cta-icon">🎁</Text>
            <View className="cta-text-group">
              <Text className="cta-primary-title">免费预约 25 分钟体验课</Text>
              <Text className="cta-subtitle">10分钟内安排专属固定外教试听</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export default Index
'''

with open('src/pages/index/index.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated index.jsx successfully!')
