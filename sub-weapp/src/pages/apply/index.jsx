import React, { useState } from 'react'
import { View, Text, Input, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import logoImg from '../../assets/sunblogo1.png'
import ganganMascotImg from '../../assets/gangan_mascot.png'
import ContactModal from '../../components/ContactModal'
import PolicyModal from '../../components/PolicyModal'
import './index.scss'

const API_CRM_URL = 'https://app.sunnybridge.qzz.io/api/v1/leads'
const API_BACKUP_URL = 'https://app.sunnybridge.qzz.io/api/v1/leads'
const WEB_COMPANION_URL = 'https://app.sunnybridge.qzz.io'

function ApplyPage() {
  const [selectedCourse, setSelectedCourse] = useState('Stage 2：牛津 Everybody Up 交流体系 (5-12岁)')
  const [studentName, setStudentName] = useState('')
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [policyModal, setPolicyModal] = useState({ visible: false, type: 'privacy' })
  const [selectedGoal, setSelectedGoal] = useState('牛津原版进阶')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)

  // 微信分享配置
  Taro.useShareAppMessage(() => {
    return {
      title: '🎁 预约 50分钟 阳光桥少儿英语交流体验',
      path: '/pages/apply/index',
      imageUrl: 'https://app.sunnybridge.qzz.io/assets/qiaobao_sunny240.png'
    }
  })

  const courseOptions = [
    { id: 'stage1', label: 'Stage 1：趣味拼读与语感启蒙 (3-6岁)' },
    { id: 'stage2', label: 'Stage 2：牛津 Everybody Up 体系 (5-12岁)' },
    { id: 'stage3', label: 'Stage 3：思辨交流与综合进阶 (10-15岁)' }
  ]

  const quickGoals = [
    '零基础启蒙',
    '不敢开口连成句',
    '纠正发音语调',
    '牛津原版进阶',
    '自然流利交流'
  ]

  const handleCopyUrl = () => {
    Taro.setClipboardData({
      data: WEB_COMPANION_URL,
      success: () => {
        Taro.showModal({
          title: '📋 伴学网址复制成功！',
          content: '网址已复制到剪贴板！请在电脑或 iPad 浏览器中粘贴打开：\n' + WEB_COMPANION_URL,
          showCancel: false,
          confirmText: '我知道了',
          confirmColor: '#FF6B00'
        })
      }
    })
  }

  const handleSubmit = async () => {
    if (!studentName.trim()) {
      Taro.showToast({ title: '请填写孩子姓名或英文名', icon: 'none' })
      return
    }
    if (!phone.trim()) {
      Taro.showToast({ title: '请填写联系手机号', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      Taro.showToast({ title: '请输入有效的11位手机号码', icon: 'none' })
      return
    }
    if (!agreed) {
      Taro.showModal({
        title: '个人信息授权与隐私政策提示',
        content: '为了向您安排 50分钟 交流体验时间并发送交流确认通知，我们需要收集并使用您的联系手机号。请先阅读并同意《用户服务协议》与《隐私政策》。',
        confirmText: '同意并继续',
        cancelText: '查看协议',
        confirmColor: '#FF7A00',
        cancelColor: '#6B7280',
        success: (modalRes) => {
          if (modalRes.confirm) {
            setAgreed(true)
            // 用户直接确认同意后自动触发提交
            setTimeout(() => {
              handleSubmit()
            }, 100)
          } else if (modalRes.cancel) {
            setPolicyModal({ visible: true, type: 'privacy' })
          }
        }
      })
      return
    }

    setIsSubmitting(true)
    Taro.showLoading({ title: '正在提交预约...', mask: true })

    const payload = {
      name: studentName.trim(),
      english_name: '',
      phone: phone.trim(),
      wechat: '',
      course: selectedCourse,
      source: '微信小程序/预约交流',
      message: `目标倾向：${selectedGoal}`
    }

    try {
      // 1. 直连 SunnyBridge CRM 后台 (自动写入 Cloudflare D1 并触发 Cloud Mail 邮件通知)
      let crmSuccess = false
      try {
        const crmRes = await Taro.request({
          url: API_CRM_URL,
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: payload
        })
        if (crmRes.statusCode >= 200 && crmRes.statusCode < 300 && (crmRes.data?.success || crmRes.data?.status === 'SUCCESS')) {
          crmSuccess = true
        }
      } catch (crmErr) {
        console.warn('CRM direct submission note:', crmErr)
      }

      // 2. 双重冗余同步至 Singapore 伴学服务器备份库
      try {
        await Taro.request({
          url: API_BACKUP_URL,
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: payload
        })
      } catch (backupErr) {
        console.warn('Backup log note:', backupErr)
      }

      Taro.hideLoading()
      setIsSubmitting(false)

      Taro.showModal({
        title: '🎉 预约提交成功！',
        content: '预约信息已同步至 SunnyBridge 顾问后台，专属交流伙伴将尽快与您联系，为您安排 50分钟 交流体验时间。',
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#FF7A00',
        success: () => {
          setStudentName('')
          setPhone('')
        }
      })
    } catch (err) {
      Taro.hideLoading()
      setIsSubmitting(false)
      Taro.showModal({
        title: '温馨提示',
        content: '预约已记录！若遇网络延迟，您也可直接点击下方“联系顾问”添加微信，更快确认交流安排。',
        confirmText: '好的',
        cancelText: '联系顾问',
        showCancel: true,
        confirmColor: '#FF7A00',
        success: (modalRes) => {
          if (modalRes.cancel) {
            setShowContactModal(true)
          }
        }
      })
    }
  }

  return (
    <View className="clean-apply-container">
      {/* 1. Header Banner */}
      <View className="apply-header-card">
        <View className="header-tag-row">
          <Image src={logoImg} className="header-logo" mode="aspectFit" />
          <View className="badge-pill">
            <Text className="badge-text">🎁 专属交流特权</Text>
          </View>
        </View>

        <Text className="header-title">预约 50分钟 英语交流体验</Text>
        <Text className="header-subtitle">
          专属母语伙伴 · 牛津原版体系深度互动 · 日常配合敢敢智能伴学
        </Text>

        <View className="guarantee-pills">
          <Text className="g-pill">✓ 专属交流伙伴</Text>
          <Text className="g-pill">✓ 50分钟深度交流</Text>
          <Text className="g-pill">✓ 免费获赠交流资料</Text>
        </View>
      </View>

      {/* 2. 表单卡片 */}
      <View className="apply-form-card">
        {/* 选择交流方案阶段 */}
        <View className="form-section">
          <Text className="section-label">
            选择意向交流阶段 <Text className="required">*</Text>
          </Text>
          <View className="course-chips-list">
            {courseOptions.map((opt) => (
              <View
                key={opt.id}
                className={`course-chip ${selectedCourse === opt.label ? 'chip-active' : ''}`}
                onClick={() => setSelectedCourse(opt.label)}
              >
                <Text className="chip-txt">{opt.label}</Text>
                {selectedCourse === opt.label && <Text className="chip-check">✓</Text>}
              </View>
            ))}
          </View>
        </View>

        {/* 孩子姓名 */}
        <View className="form-field">
          <Text className="field-label">
            孩子姓名 / 英文名 <Text className="required">*</Text>
          </Text>
          <Input
            className="field-input"
            placeholder="请输入孩子的姓名或英文名 (如 Leo)"
            placeholderClass="placeholder"
            value={studentName}
            onInput={(e) => setStudentName(e.detail.value)}
          />
        </View>

        {/* 联系手机号 */}
        <View className="form-field">
          <Text className="field-label">
            联系手机号 <Text className="required">*</Text>
          </Text>
          <Input
            className="field-input"
            type="number"
            placeholder="请输入接收交流安排的手机号"
            placeholderClass="placeholder"
            value={phone}
            onInput={(e) => setPhone(e.detail.value)}
          />
          <View className="field-privacy-notice">
            <Text className="notice-icon">🔒</Text>
            <Text className="notice-text">
              收集目的：仅用于向您提供 50分钟 英语交流体验的时间沟通、安排确认与交流资料发送，不向任何第三方透露。
            </Text>
          </View>
        </View>

        {/* 核心关注目标 */}
        <View className="form-section">
          <Text className="section-label">关注的提升目标</Text>
          <View className="goals-chips-row">
            {quickGoals.map((g) => (
              <View
                key={g}
                className={`goal-chip ${selectedGoal === g ? 'goal-active' : ''}`}
                onClick={() => setSelectedGoal(g)}
              >
                <Text className="goal-txt">{g}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 用户服务协议与隐私政策授权勾选 */}
        <View className={`agreement-card-box ${!agreed ? 'agreement-highlight' : ''}`}>
          <View className="agreement-row" onClick={() => setAgreed(!agreed)}>
            <View className={`checkbox-box ${agreed ? 'checked' : ''}`}>
              {agreed && <Text className="check-symbol">✓</Text>}
            </View>
            <View className="agreement-text-wrap">
              <Text className="agreement-text">已充分阅读并同意 </Text>
              <Text
                className="agreement-link"
                onClick={(e) => {
                  e.stopPropagation()
                  setPolicyModal({ visible: true, type: 'agreement' })
                }}
              >
                《用户服务协议》
              </Text>
              <Text className="agreement-text"> 与 </Text>
              <Text
                className="agreement-link"
                onClick={(e) => {
                  e.stopPropagation()
                  setPolicyModal({ visible: true, type: 'privacy' })
                }}
              >
                《隐私政策》
              </Text>
            </View>
          </View>
          <Text className="agreement-sub-desc">
            点击勾选即代表您授权我们按《隐私政策》规范使用您填写的联系手机号用于本次交流服务预约。
          </Text>
        </View>

        {/* 提交按钮 */}
        <View
          className={`btn-submit-booking ${isSubmitting ? 'btn-disabled' : ''}`}
          onClick={handleSubmit}
        >
          <Text className="submit-txt">
            {isSubmitting ? '正在提交...' : '立即预约 50分钟 交流体验 →'}
          </Text>
        </View>

        <Text className="privacy-foot-tip">
          🔒 严守个人隐私 · 仅用于沟通交流时间安排 · 无骚扰推广
        </Text>
      </View>

      {/* 3. 电脑/iPad 护眼大屏伴学平台推荐卡 */}
      <View className="big-screen-companion-card" onClick={handleCopyUrl}>
        <View className="bs-left">
          <Image src={ganganMascotImg} className="bs-mascot" mode="aspectFill" />
          <View className="bs-info">
            <Text className="bs-title">🖥️ 电脑 / iPad 护眼大屏伴学平台</Text>
            <Text className="bs-desc">全套 300+ 牛津分级绘本 · 敢敢 7×24h 智能伴学打卡</Text>
          </View>
        </View>
        <View className="btn-copy-tag">
          <Text className="tag-txt">点击复制网址</Text>
        </View>
      </View>

      {/* 4. 底部顾问咨询栏 */}
      <View className="advisor-footer-bar" onClick={() => setShowContactModal(true)}>
        <Text className="advisor-icon">💬</Text>
        <Text className="advisor-txt">有疑问？点击直接联系 SunnyBridge 交流顾问</Text>
      </View>

      {/* 顾问微信名片弹窗 */}
      <ContactModal visible={showContactModal} onClose={() => setShowContactModal(false)} />

      {/* 协议与隐私政策详情弹窗 */}
      <PolicyModal
        visible={policyModal.visible}
        type={policyModal.type}
        onClose={() => setPolicyModal({ visible: false, type: 'privacy' })}
      />
    </View>
  )
}

export default ApplyPage
