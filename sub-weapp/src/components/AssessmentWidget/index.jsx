import React, { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Icon from '../Icon'
import './index.scss'

export default function AssessmentWidget() {
  const [step, setStep] = useState(0) // 0: 封面入口, 1: 年龄, 2: 现状, 3: 诉求, 4: 计算中, 5: 结果页
  const [answers, setAnswers] = useState({ age: '', ageLabel: '', status: '', statusLabel: '', goal: '', goalLabel: '' })
  const [report, setReport] = useState(null)

  const ageOptions = [
    { value: '3-5', label: '3-5 岁', sub: '启蒙敏假期 · 磨耳朵好时期' },
    { value: '6-8', label: '6-8 岁', sub: '幼小衔接/低年级 · 口语习惯养成' },
    { value: '9-11', label: '9-11 岁', sub: '小学中高年级 · 语法与拼读巩固' },
    { value: '12+', label: '12 岁以上', sub: '初中衔接 · 综合表达与应试' }
  ]

  const statusOptions = [
    { value: 'zero', icon: 'mute', label: '零基础，未系统接触过英语', sub: '对英语好奇但不知如何发音' },
    { value: 'shy', icon: 'book', label: '认识不少单词，但不敢开口连成句', sub: '能看懂听懂一些，开口容易卡壳' },
    { value: 'word_only', icon: 'chat', label: '能听懂简单指令，习惯单个词蹦着说', sub: '缺乏完整句子表达与语法组织意识' },
    { value: 'fluent_err', icon: 'sparkle', label: '能简单日常对话，但发音不准或有语法漏洞', sub: '需要纯正母语交流伙伴纠音与拔高' }
  ]

  const goalOptions = [
    { value: 'phonics', icon: 'book', label: '培养兴趣，自然拼读见词能读', sub: '掌握发音规则，自主拼读绘本' },
    { value: 'speaking', icon: 'chat', label: '摆脱表达障碍，自信流利开口', sub: '高频互动表达，建立纯正语感' },
    { value: 'curriculum', icon: 'teacher', label: '牛津进阶交流，百科与综合认知素养', sub: '思维拓展，日常全英文流利表达' },
    { value: 'exam', icon: 'certificate', label: '综合表达培优 (小升初/国际测评)', sub: '长篇阅读理解与综合交流能力' }
  ]

  const handleSelectAge = (item) => {
    setAnswers(prev => ({ ...prev, age: item.value, ageLabel: item.label }))
    setStep(2)
  }

  const handleSelectStatus = (item) => {
    setAnswers(prev => ({ ...prev, status: item.value, statusLabel: item.label }))
    setStep(3)
  }

  const handleSelectGoal = (item) => {
    const nextAnswers = { ...answers, goal: item.value, goalLabel: item.label }
    setAnswers(nextAnswers)
    setStep(4) // 计算中过渡动效

    setTimeout(() => {
      generateReport(nextAnswers)
      setStep(5)
    }, 700)
  }

  const generateReport = (ans) => {
    let rep = {}
    if (ans.age === '3-5' || ans.status === 'zero') {
      rep = {
        levelBadge: 'Pre-A1 启蒙黄金期',
        levelTitle: '自然拼读与语言爆发期',
        scores: { listen: 82, speak: 48, phonics: 55 },
        diagnose: '宝贝处于少儿发音听辨与模仿的黄金窗口！此时避免死记硬背，最适合通过TPR肢体互动和律动儿歌建立字母-声音直觉反应。',
        recommendPlan: 'Stage 1 · 趣味拼读与语感启蒙',
        recommendFocus: 'TPR趣味律动 · 字母发音直觉 · 耐心语感启蒙',
        target: '掌握26个字母发音规则与常见CVC拼读规则单词自主秒拼，轻松读绘本'
      }
    } else if (ans.age === '6-8' || ans.status === 'shy' || ans.status === 'word_only') {
      rep = {
        levelBadge: 'A1 基础应用爆发期',
        levelTitle: '自信交流与情景表达期',
        scores: { listen: 78, speak: 52, phonics: 65 },
        diagnose: '孩子已经储备了一定词汇，但极度缺乏「高频母语交流语境」。唯有专属交流伙伴与深度互动，才能通过充分实战把被动词汇激活为脱口而出的表达！',
        recommendPlan: 'Stage 2 · 牛津 Everybody Up 交流体系',
        recommendFocus: '高频场景互动 · 完整句子输出 · 破冰自信开口',
        target: '掌握高频生活场景完整句子输出，日常对话不再犹豫卡壳'
      }
    } else {
      rep = {
        levelBadge: 'A2 / B1 综合思维期',
        levelTitle: '多元认知与综合表达期',
        scores: { listen: 85, speak: 68, phonics: 75 },
        diagnose: '孩子具备良好的理解能力，需要从碎片化生活日常口语过渡到百科思维与思辨长句表达，同时系统性梳理语法与综合表达。',
        recommendPlan: 'Stage 3 · 综合思辨交流',
        recommendFocus: '百科趣味拓展 · 论述性长句 · 纯正地道表达',
        target: '掌握论述性交流与长篇精读技巧，自信应对校内综合交流活动'
      }
    }
    setReport(rep)
  }

  const handleApplyWithReport = () => {
    if (!report) return
    Taro.setStorageSync('sub_apply_pref', {
      course: report.recommendPlan,
      age: answers.ageLabel,
      level: report.levelBadge
    })
    Taro.switchTab({
      url: '/pages/apply/index'
    })
  }

  const handleReset = () => {
    setStep(1)
    setAnswers({ age: '', ageLabel: '', status: '', statusLabel: '', goal: '', goalLabel: '' })
    setReport(null)
  }

  return (
    <View className="assessment-box">
      {/* 0. 首页初始入口状态 */}
      {step === 0 && (
        <View className="entry-card">
          <View className="entry-top">
            <View className="entry-pill">
              <Text className="pill-icon">🎯</Text>
              <Text className="pill-text">已有 1,820+ 位家长完成自测</Text>
            </View>
            <Text className="entry-title">30秒测测：孩子英语处于欧标哪个阶段？</Text>
            <Text className="entry-desc">对标国际 CEFR 体系 · 诊断开口痛点 · 智能匹配专属交流伙伴</Text>
          </View>
          <View className="entry-action-btn" onClick={() => setStep(1)}>
            <Text className="btn-text">开始 30 秒水平自测 →</Text>
          </View>
        </View>
      )}

      {/* 1. 题目步骤 (1-3步) */}
      {(step === 1 || step === 2 || step === 3) && (
        <View className="quiz-card">
          <View className="quiz-header">
            <View className="quiz-progress-bar">
              <View className="progress-inner" style={{ width: (step / 3 * 100) + '%' }} />
            </View>
            <View className="step-indicator">
              <Text className="step-num">第 {step} 步 / 共 3 步</Text>
              <Text className="step-close" onClick={() => setStep(0)}>✕ 退出</Text>
            </View>
          </View>

          {/* Step 1: 年龄 */}
          {step === 1 && (
            <View className="question-body">
              <Text className="q-title">请问宝贝现在的年龄？</Text>
              <Text className="q-sub">不同年龄段的语言认知规律差异极大</Text>
              <View className="options-grid">
                {ageOptions.map((opt) => (
                  <View key={opt.value} className="option-item" onClick={() => handleSelectAge(opt)}>
                    <Text className="option-label">{opt.label}</Text>
                    <Text className="option-sub">{opt.sub}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Step 2: 现状 */}
          {step === 2 && (
            <View className="question-body">
              <Text className="q-title">孩子目前的英语开口现状是？</Text>
              <Text className="q-sub">帮助定位具体是输入问题还是缺乏实战对话</Text>
              <View className="options-list">
                {statusOptions.map((opt) => (
                  <View key={opt.value} className="option-item-row" onClick={() => handleSelectStatus(opt)}>
                    <View className="opt-icon-box">
                      <Icon name={opt.icon} size={20} color="#FF6B00" />
                    </View>
                    <View className="opt-text-box">
                      <Text className="option-label">{opt.label}</Text>
                      <Text className="option-sub">{opt.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Step 3: 目标 */}
          {step === 3 && (
            <View className="question-body">
              <Text className="q-title">家长当前最看重的提升重点是？</Text>
              <Text className="q-sub">我们将为您提供针对性的交流方案建议</Text>
              <View className="options-list">
                {goalOptions.map((opt) => (
                  <View key={opt.value} className="option-item-row" onClick={() => handleSelectGoal(opt)}>
                    <View className="opt-icon-box">
                      <Icon name={opt.icon} size={20} color="#FF6B00" />
                    </View>
                    <View className="opt-text-box">
                      <Text className="option-label">{opt.label}</Text>
                      <Text className="option-sub">{opt.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* 4. 分析中过度动画 */}
      {step === 4 && (
        <View className="analyzing-card">
          <View className="spinner-dot" />
          <Text className="analyzing-text">智能系统正在分析语言评估模型...</Text>
          <Text className="analyzing-sub">匹配国际 CEFR 标准与专属交流方案</Text>
        </View>
      )}

      {/* 5. 结果自测报告卡 */}
      {step === 5 && report && (
        <View className="report-card">
          {/* Celebratory Particles Animation */}
          <View className="confetti-particles">
            <View className="confetti-dot dot-1" />
            <View className="confetti-dot dot-2" />
            <View className="confetti-dot dot-3" />
            <View className="confetti-dot dot-4" />
            <View className="confetti-dot dot-5" />
          </View>

          <View className="celebrate-banner">
            <Text className="celebrate-icon">🎉</Text>
            <Text className="celebrate-text">太棒了！已生成宝贝专属语言成长模型</Text>
          </View>

          <View className="report-header">
            <View className="report-tag-row">
              <Text className="report-pill">🎯 专属表达自测参考报告</Text>
              <Text className="report-redo" onClick={handleReset}>↻ 重新测评</Text>
            </View>
            <Text className="report-main-title">{report.levelBadge}</Text>
            <Text className="report-sub-title">阶段定位：{report.levelTitle} ({answers.ageLabel})</Text>
          </View>

          {/* 能力三维打分 (含动态进度条与高亮) */}
          <View className="scores-row">
            <View className="score-item">
              <Text className="score-val">{report.scores.listen}分</Text>
              <View className="score-bar-track">
                <View className="score-bar-fill fill-blue" style={{ width: `${report.scores.listen}%` }} />
              </View>
              <Text className="score-label">听力敏锐度</Text>
            </View>
            <View className="score-item item-highlight">
              <Text className="score-val val-primary">{report.scores.speak}分</Text>
              <View className="score-bar-track">
                <View className="score-bar-fill fill-orange" style={{ width: `${report.scores.speak}%` }} />
              </View>
              <Text className="score-label label-primary">开口表达欲</Text>
            </View>
            <View className="score-item">
              <Text className="score-val">{report.scores.phonics}分</Text>
              <View className="score-bar-track">
                <View className="score-bar-fill fill-green" style={{ width: `${report.scores.phonics}%` }} />
              </View>
              <Text className="score-label">拼读规则感</Text>
            </View>
          </View>

          {/* 诊断评语 */}
          <View className="diagnose-box">
            <Text className="diagnose-title">💡 专家诊断意见：</Text>
            <Text className="diagnose-content">{report.diagnose}</Text>
          </View>

          {/* 推荐方案 */}
          <View className="recommend-box">
            <View className="rec-item">
              <Text className="rec-key">📖 建议交流阶段：</Text>
              <Text className="rec-val">{report.recommendPlan}</Text>
            </View>
            <View className="rec-item">
              <Text className="rec-key">🌟 交流重点方向：</Text>
              <Text className="rec-val">{report.recommendFocus}</Text>
            </View>
            <View className="rec-item">
              <Text className="rec-key">🎯 交流提升目标：</Text>
              <Text className="rec-val">{report.target}</Text>
            </View>
          </View>

          {/* 转化按钮 */}
          <View className="report-action-btn" onClick={handleApplyWithReport}>
            <Text className="report-btn-icon">🎁</Text>
            <View className="report-btn-text-group">
              <Text className="report-btn-title">预约英语交流</Text>
              <Text className="report-btn-sub">已为您绑定推荐交流方案，免去重复填写</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
