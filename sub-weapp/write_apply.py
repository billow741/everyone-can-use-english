import os

content = '''import React, { useState, useEffect } from 'react'
import { View, Text, Input, Textarea, Button, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import logoImg from '../../assets/sunblogo1.webp'
import './index.scss'

function Apply() {
  const router = useRouter()
  const [selectedCourse, setSelectedCourse] = useState('Stage 2：牛津 Everybody Up (5-12岁)')
  const [studentName, setStudentName] = useState('')
  const [age, setAge] = useState('')
  const [phone, setPhone] = useState('')
  const [wechat, setWechat] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (router.params && router.params.course) {
      const c = decodeURIComponent(router.params.course)
      if (c.includes('Phonics') || c.includes('拼读')) {
        setSelectedCourse('Stage 1：自然拼读启蒙 (3-6岁)')
      } else if (c.includes('Everybody') || c.includes('牛津')) {
        setSelectedCourse('Stage 2：牛津 Everybody Up (5-12岁)')
      } else if (c.includes('THiNK') || c.includes('新概念')) {
        setSelectedCourse('Stage 3：剑桥 THiNK / 新概念 (10-15岁)')
      }
    }
  }, [router.params])

  const courseOptions = [
    { id: 'stage1', label: 'Stage 1：自然拼读启蒙 (3-6岁)' },
    { id: 'stage2', label: 'Stage 2：牛津 Everybody Up (5-12岁)' },
    { id: 'stage3', label: 'Stage 3：剑桥 THiNK / 新概念 (10-15岁)' },
    { id: 'speaking', label: '少儿自信口语演讲与分级伴读' },
    { id: 'custom', label: 'VIP 1对1 私人定制方案' }
  ]

  const handleGetPhoneNumber = (e) => {
    if (e.detail && e.detail.errMsg && e.detail.errMsg.includes('ok')) {
      // In production, send e.detail.code to backend to decrypt phone number
      setPhone('138****0000')
      Taro.showToast({
        title: '已成功获取手机号',
        icon: 'success'
      })
    }
  }

  const handleSubmit = () => {
    if (!studentName.trim()) {
      Taro.showToast({ title: '请填写孩子姓名或昵称', icon: 'none' })
      return
    }
    if (!phone.trim()) {
      Taro.showToast({ title: '请填写或授权联系手机号', icon: 'none' })
      return
    }

    setIsSubmitting(true)

    // Simulate API call to CRM
    setTimeout(() => {
      setIsSubmitting(false)
      Taro.showModal({
        title: '🎉 预约成功',
        content: '专属课程顾问将在 10 分钟内致电或微信联系您，为您匹配契合的固定外教并发送试听课表。',
        showCancel: false,
        confirmText: '我知道了',
        success: () => {
          Taro.navigateBack()
        }
      })
    }, 800)
  }

  return (
    <View className="apply-container">
      {/* 1. Header Banner */}
      <View className="apply-header">
        <View className="header-badge">
          <Text className="badge-sparkle">🎁</Text>
          <Text className="badge-text">新学员专享福利</Text>
        </View>
        <Text className="header-title">免费领取 25 分钟体验课</Text>
        <Text className="header-subtitle">牛津原版教材 · 专属固定外教 · 交付多维学情报告</Text>
        
        <View className="guarantee-row">
          <Text className="guarantee-item">✓ 零套路免绑卡</Text>
          <Text className="guarantee-item">✓ 满意后再考虑</Text>
          <Text className="guarantee-item">✓ 免费获赠电子课件</Text>
        </View>
      </View>

      {/* 2. Main Form Card */}
      <View className="form-card">
        {/* Course Level Selection */}
        <View className="form-field">
          <Text className="field-label">
            意向学习阶段 <Text className="required">*</Text>
          </Text>
          <View className="course-chips">
            {courseOptions.map((c) => (
              <View
                key={c.id}
                className={'course-chip ' + (selectedCourse === c.label ? 'chip-active' : '')}
                onClick={() => setSelectedCourse(c.label)}
              >
                <Text className="chip-text">{c.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Student Name */}
        <View className="form-field">
          <Text className="field-label">
            孩子姓名 / 昵称 <Text className="required">*</Text>
          </Text>
          <Input
            className="field-input"
            placeholder="例如：浩浩、Amy"
            placeholderClass="placeholder"
            value={studentName}
            onInput={(e) => setStudentName(e.detail.value)}
          />
        </View>

        {/* Age */}
        <View className="form-field">
          <Text className="field-label">孩子年龄</Text>
          <Input
            className="field-input"
            type="number"
            placeholder="例如：6岁"
            placeholderClass="placeholder"
            value={age}
            onInput={(e) => setAge(e.detail.value)}
          />
        </View>

        {/* Phone */}
        <View className="form-field">
          <Text className="field-label">
            家长手机号 <Text className="required">*</Text>
          </Text>
          <View className="phone-row">
            <Input
              className="field-input phone-input"
              type="number"
              placeholder="用于接收试听课表及开课提醒"
              placeholderClass="placeholder"
              value={phone}
              onInput={(e) => setPhone(e.detail.value)}
            />
            <Button
              className="wechat-phone-btn"
              openType="getPhoneNumber"
              onGetPhoneNumber={handleGetPhoneNumber}
            >
              一键授权
            </Button>
          </View>
        </View>

        {/* WeChat ID */}
        <View className="form-field">
          <Text className="field-label">微信号 (选填)</Text>
          <Input
            className="field-input"
            placeholder="方便顾问直接微信发送外教自我介绍视频"
            placeholderClass="placeholder"
            value={wechat}
            onInput={(e) => setWechat(e.detail.value)}
          />
        </View>

        {/* Message */}
        <View className="form-field">
          <Text className="field-label">孩子的英语基础或诉求 (选填)</Text>
          <Textarea
            className="field-textarea"
            placeholder="例如：平时不敢开口说、想提升发音、准备小升初等~"
            placeholderClass="placeholder"
            value={message}
            onInput={(e) => setMessage(e.detail.value)}
            maxlength={150}
          />
        </View>

        {/* Submit Button */}
        <View className="submit-btn-wrap" onClick={handleSubmit}>
          <View className={'submit-btn ' + (isSubmitting ? 'btn-disabled' : '')}>
            <Text className="submit-text">
              {isSubmitting ? '正在提交预约...' : '🎁 立即免费预约体验课'}
            </Text>
          </View>
        </View>
        <Text className="privacy-tip">🔒 我们严守您的个人信息，绝不向第三方透露</Text>
      </View>

      {/* 3. Enterprise WeChat Live Contact Card */}
      <View className="advisor-card">
        <View className="advisor-left">
          <Image src={logoImg} className="advisor-avatar" mode="aspectFit" />
          <View className="advisor-info">
            <View className="advisor-title-row">
              <Text className="advisor-title">微信官方课程顾问</Text>
              <Text className="advisor-tag">秒回咨询</Text>
            </View>
            <Text className="advisor-desc">不想填表？点击添加顾问，一对一解答孩子学情</Text>
          </View>
        </View>
        <Button openType="contact" className="advisor-action-btn">
          立即咨询
        </Button>
      </View>
    </View>
  )
}

export default Apply
'''

with open('src/pages/apply/index.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated apply/index.jsx successfully!')
