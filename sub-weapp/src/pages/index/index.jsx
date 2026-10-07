import React, { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import logoImg from '../../assets/sunblogo1.png'
import ganganMascotImg from '../../assets/gangan_mascot.png'
import ContactModal from '../../components/ContactModal'
import EnjoyStudyWidget from '../../components/EnjoyStudyWidget'
import WebCompanionModal from '../../components/WebCompanionModal'
import { useAppConfig } from '../../services/configService'
import './index.scss'

function Index() {
  const [showContactModal, setShowContactModal] = useState(false)
  const [showWebModal, setShowWebModal] = useState(false)
  const appConfig = useAppConfig()

  // 微信小程序分享卡片配置（支持从云端动态控制标题与封面）
  Taro.useShareAppMessage(() => {
    return {
      title: appConfig.appMeta?.shareTitle || '🦁 阳光桥 SunnyBridge · 电脑/iPad 专属护眼大屏伴学平台',
      path: '/pages/index/index',
      imageUrl: appConfig.appMeta?.shareImageUrl || 'https://app.sunnybridge.qzz.io/assets/qiaobao_sunny240.png'
    }
  })

  // 微信小程序扫码授权网页登录 (支持太阳码scene、小程序链接ticket、外部扫码q参数)
  Taro.useLoad((options) => {
    let ticket = ''
    if (options) {
      if (options.scene) {
        ticket = decodeURIComponent(options.scene).replace(/^ticket=/, '')
      } else if (options.ticket) {
        ticket = options.ticket
      } else if (options.q) {
        try {
          const qUrl = decodeURIComponent(options.q)
          const m = qUrl.match(/[?&]scene=([^&]+)/) || qUrl.match(/[?&]ticket=([^&]+)/)
          if (m) ticket = m[1]
        } catch (e) {}
      }
    }
    if (ticket) {
      handleWebAuthPrompt(ticket)
    }
  })

  // 主动调用微信扫一扫，扫描电脑大屏上的太阳码/二维码直接登录
  const handleScanWebQr = () => {
    Taro.scanCode({
      scanType: ['qrCode', 'wxCode'],
      success: (scanRes) => {
        let ticket = ''
        const raw = scanRes.result || ''
        if (raw.includes('ticket=')) {
          const m = raw.match(/ticket=([a-zA-Z0-9]+)/)
          if (m) ticket = m[1]
        } else if (/^[a-zA-Z0-9]{8,32}$/.test(raw)) {
          ticket = raw
        } else if (scanRes.path) {
          try {
            const p = decodeURIComponent(scanRes.path)
            const m = p.match(/[?&]scene=([^&]+)/) || p.match(/[?&]ticket=([^&]+)/)
            if (m) ticket = m[1]
          } catch (e) {}
        }

        if (ticket) {
          handleWebAuthPrompt(ticket)
        } else {
          Taro.showToast({ title: '未识别到伴学登录二维码', icon: 'none' })
        }
      },
      fail: (err) => {
        if (err && err.errMsg && !err.errMsg.includes('cancel')) {
          Taro.showToast({ title: '扫码未成功，请重试', icon: 'none' })
        }
      }
    })
  }

  const handleWebAuthPrompt = (ticket) => {
    // 优先读取本地设置的学员真实姓名或英文名，未设置时默认以学号展示
    const storedName = Taro.getStorageSync('student_name') || ''
    const fallbackName = `微信学员_${ticket.slice(-4).toUpperCase()}`
    const displayName = storedName.trim() || fallbackName

    Taro.showModal({
      title: '🦁 SunnyBridge 伴学授权',
      content: `检测到您正在登录电脑/iPad 伴学大屏端。\n\n授权学员：${displayName}\n\n是否确认立即同步登录？`,
      confirmText: '确认登录',
      cancelText: '取消',
      confirmColor: '#FF6B00',
      success: (modalRes) => {
        if (modalRes.confirm) {
          Taro.showLoading({ title: '正在同步登录...', mask: true })
          Taro.login({
            success: (loginRes) => {
              Taro.request({
                url: 'https://app.sunnybridge.qzz.io/api/auth/wechat/confirm',
                method: 'POST',
                header: { 'Content-Type': 'application/json' },
                data: {
                  ticket: ticket,
                  code: loginRes.code,
                  nickname: displayName
                },
                success: (authRes) => {
                  Taro.hideLoading()
                  if (authRes.statusCode === 200 && authRes.data?.status === 'SUCCESS') {
                    Taro.showToast({ title: '🎉 电脑大屏已同步登录！', icon: 'success', duration: 3000 })
                  } else {
                    Taro.showToast({ title: '授权已超时或失效，请刷新重试', icon: 'none', duration: 3000 })
                  }
                },
                fail: () => {
                  Taro.hideLoading()
                  Taro.showToast({ title: '网络连接超时，请重试', icon: 'none' })
                }
              })
            },
            fail: () => {
              Taro.hideLoading()
              Taro.showToast({ title: '微信登录凭证获取失败', icon: 'none' })
            }
          })
        }
      }
    })
  }

  const navigateToCompanion = () => {
    setShowWebModal(true)
  }

  const navigateToApply = () => {
    Taro.switchTab({
      url: '/pages/apply/index'
    })
  }

  return (
    <View className="page-container-clean">
      {/* 1. 顶部清爽品牌 Bar (含直接扫码登录电脑伴学入口) */}
      <View className="clean-brand-header">
        <View className="brand-left">
          <Image src={logoImg} className="brand-logo" mode="aspectFit" />
          <View className="brand-text-col">
            <Text className="brand-title">{appConfig.appMeta?.appName || 'SunnyBridge 阳光桥'}</Text>
            <Text className="brand-subtitle">{appConfig.appMeta?.appSubtitle || '少儿趣味英语 · 智能伴读打卡工具'}</Text>
          </View>
        </View>

        {!appConfig.auditMode && (
          <View className="brand-scan-btn" onClick={handleScanWebQr}>
            <Text className="scan-icon">🖥️</Text>
            <Text className="scan-txt">扫码登电脑端</Text>
          </View>
        )}
      </View>

      {/* 2. 敢敢轻量伴学问候卡 */}
      <View className="mascot-greeting-card">
        <View className="greeting-main">
          <Image src={ganganMascotImg} className="mascot-avatar" mode="aspectFill" />
          <View className="greeting-dialogue">
            <View className="g-tag">
              <Text className="g-tag-txt">{appConfig.appMeta?.mascotTitle || '🦁 伴学小向导 · 敢敢'}</Text>
            </View>
            <Text className="g-speech">
              {appConfig.auditMode 
                ? '“Hi there! 今天想和我聊英语，还是精读经典少儿趣味绘本？”'
                : (appConfig.appMeta?.mascotGreeting || '“Hi there! 今天想和我聊英语，还是精读牛津原版绘本？”')}
            </Text>
          </View>
        </View>

        {/* 快捷跳转气泡（对齐上次过审截图） */}
        <View className="greeting-pills">
          <View className="pill-item" onClick={navigateToApply}>
            <Text className="pill-emoji">🎁</Text>
            <Text className="pill-txt">预约 50分钟 交流</Text>
          </View>
          <View className="pill-item" onClick={() => setShowContactModal(true)}>
            <Text className="pill-emoji">💬</Text>
            <Text className="pill-txt">联系专属顾问</Text>
          </View>
        </View>
      </View>

      {/* 3. 核心功能体验区：SunnyBridge 课后 AI 伴学体验馆 */}
      <EnjoyStudyWidget />

      {/* 4. 专属交流体验卡 (对齐上次过审截图) */}
      {(appConfig.promotionCard?.enabled !== false) && (
        <View className="tutor-experience-card">
          <View className="card-badge-row">
            <View className="privilege-badge">
              <Text className="badge-spark">{appConfig.promotionCard?.badgeIcon || '🎁'}</Text>
              <Text className="badge-name">{appConfig.promotionCard?.badgeName || '新用户交流特权'}</Text>
            </View>
            <Text className="slots-tip">{appConfig.promotionCard?.slotsTip || '今日开放预约中'}</Text>
          </View>

          <Text className="card-heading">{appConfig.promotionCard?.heading || '预约 50分钟 少儿英语交流体验'}</Text>
          <Text className="card-subheading">
            {appConfig.promotionCard?.subheading || '专属交流伙伴 · 牛津原版体系深度互动 · 日常配合敢敢智能纠错'}
          </Text>

          {/* 4 大品质保障 (动态遍历云端保障列表) */}
          <View className="guarantee-row">
            {(appConfig.promotionCard?.guarantees || []).map((g, gIdx) => (
              <View key={gIdx} className="g-item">
                <Text className="g-icon">{g.icon}</Text>
                <Text className="g-label">{g.label}</Text>
              </View>
            ))}
          </View>

          {/* 立即预约按钮 */}
          <View className="btn-book-now" onClick={navigateToApply}>
            <Text className="btn-book-text">{appConfig.promotionCard?.buttonText || '立即预约交流体验 →'}</Text>
          </View>
        </View>
      )}

      {/* 6. 底部留白以防遮挡 */}
      <View className="bottom-space-filler" />

      {/* 伴学助手微信名片弹窗 */}
      <ContactModal visible={showContactModal} onClose={() => setShowContactModal(false)} />

      {/* 大屏伴学升级弹窗 */}
      <WebCompanionModal
        visible={showWebModal}
        onClose={() => setShowWebModal(false)}
        onScan={handleScanWebQr}
        reason="manual"
      />
    </View>
  )
}

export default Index
