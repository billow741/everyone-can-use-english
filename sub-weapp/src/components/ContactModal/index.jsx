import React from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import logoImg from '../../assets/sunblogo1.png'
import qrImg from '../../assets/wechat-qrcode.png'
import './index.scss'

const ONLINE_QR_URL = 'https://www.sunnybridge.qzz.io/assets/wechat-qrcode.png'

export default function ContactModal({ visible, onClose }) {
  if (!visible) return null

  const handlePreviewQR = () => {
    Taro.previewImage({
      current: ONLINE_QR_URL,
      urls: [ONLINE_QR_URL]
    })
  }

  return (
    <View className="contact-modal-overlay" onClick={onClose}>
      <View className="contact-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <View className="contact-modal-close" onClick={onClose}>
          <Text className="close-symbol">✕</Text>
        </View>

        {/* Advisor Header: 明确标明“SunnyBridge 专属交流顾问（人工）” */}
        <View className="contact-modal-header">
          <Image src={logoImg} className="advisor-header-avatar" mode="aspectFit" />
          <View className="advisor-header-info">
            <View className="advisor-name-row">
              <Text className="advisor-name">SunnyBridge 专属交流顾问</Text>
              <Text className="online-badge">人工在线</Text>
            </View>
            <Text className="advisor-desc">真人顾问 1对1 答疑 · 安排 50分钟 交流体验与课件分享</Text>
          </View>
        </View>

        {/* QR Code Card */}
        <View className="qr-card-box">
          <Image
            src={qrImg}
            className="qr-image"
            mode="aspectFit"
            showMenuByLongpress
            onClick={handlePreviewQR}
          />
          <View className="qr-hint-group">
            <Text className="qr-main-hint">👇 长按识别企业微信名片添加顾问</Text>
            <Text className="qr-sub-hint">（微信官方企业名片认证 · 点击二维码可全屏放大）</Text>
          </View>
        </View>

        {/* 快捷全屏放大并长按识别按钮（彻底移除不存在的微信号复制） */}
        <View className="wechat-action-bar" onClick={handlePreviewQR}>
          <Text className="action-btn-icon">🔍</Text>
          <Text className="action-btn-txt">点击放大二维码，长按识别添加</Text>
        </View>

        {/* Benefits list */}
        <View className="contact-benefits">
          <Text className="benefit-item">✓ 真人顾问一对一</Text>
          <Text className="benefit-item">✓ 安排50分钟体验</Text>
          <Text className="benefit-item">✓ 免费获赠原版课件</Text>
        </View>
      </View>
    </View>
  )
}
