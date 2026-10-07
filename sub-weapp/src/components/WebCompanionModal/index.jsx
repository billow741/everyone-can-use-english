import React from 'react'
import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import ganganMascotImg from '../../assets/gangan_mascot.png'
import './index.scss'

const WEB_COMPANION_URL = 'https://app.sunnybridge.qzz.io'

export default function WebCompanionModal({ visible, onClose, onScan, reason = 'quota' }) {
  if (!visible) return null

  const handleScan = () => {
    onClose && onClose()
    if (onScan) {
      setTimeout(() => {
        onScan()
      }, 100)
    }
  }

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

  const getTitle = () => {
    if (reason === 'quota') return '今日小程序试用已达上限'
    if (reason === 'lock') return '进入电脑 / iPad 大屏完整阅读'
    return '开启电脑 / iPad 护眼大屏伴学'
  }

  const getSubtitle = () => {
    if (reason === 'quota') return '手机屏幕小容易引起视疲劳，前往电脑大屏畅享更丰富互动！'
    if (reason === 'lock') return '更多分级绘本与完整原声伴读已在电脑大屏端完整支持！'
    return '大屏护眼 · 原版高清绘本 · 敢敢实时陪伴打卡'
  }

  return (
    <View className="web-companion-modal-mask" onClick={onClose} catchMove>
      <View className="web-companion-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* 关闭按钮 */}
        <View className="modal-close-btn" onClick={onClose}>
          <Text className="close-symbol">✕</Text>
        </View>

        {/* 顶部吉祥物与光环 */}
        <View className="modal-header-hero">
          <View className="mascot-avatar-wrap">
            <Image src={ganganMascotImg} className="mascot-img" mode="aspectFill" />
            <View className="badge-gangan">
              <Text className="badge-text">敢敢伴学助手</Text>
            </View>
          </View>
          <Text className="modal-title">{getTitle()}</Text>
          <Text className="modal-subtitle">{getSubtitle()}</Text>
        </View>

        {/* 电脑大屏专属 4 大优势卡片 */}
        <View className="privileges-box">
          <View className="privilege-item">
            <Text className="p-icon">🖥️</Text>
            <View className="p-info">
              <Text className="p-title">护眼大屏沉浸体验</Text>
              <Text className="p-desc">保护孩子视力，iPad / Mac / Windows 全端浏览器自适应</Text>
            </View>
          </View>

          <View className="privilege-item">
            <Text className="p-icon">📚</Text>
            <View className="p-info">
              <Text className="p-title">全套牛津分级经典绘本</Text>
              <Text className="p-desc">原版高清图文、逐句母语标准原声精听精读</Text>
            </View>
          </View>

          <View className="privilege-item">
            <Text className="p-icon">💬</Text>
            <View className="p-info">
              <Text className="p-title">敢敢智能伴学体系</Text>
              <Text className="p-desc">日常高频主题口语交流，正式学员专属畅享深度伴学打卡</Text>
            </View>
          </View>

          <View className="privilege-item">
            <Text className="p-icon">☁️</Text>
            <View className="p-info">
              <Text className="p-title">生词本与跟读报告跨端同步</Text>
              <Text className="p-desc">手机与电脑云端同步打卡记录，清晰掌握学习进展</Text>
            </View>
          </View>
        </View>

        {/* 网址展示框（纯展示专属网址） */}
        <View className="url-display-box">
          <View className="url-left">
            <Text className="url-label">电脑/iPad 专属网页地址：</Text>
            <Text className="url-text">{WEB_COMPANION_URL}</Text>
          </View>
        </View>

        {/* 行动按钮群 */}
        <View className="modal-actions">
          {onScan && (
            <View className="btn-primary-scan" onClick={handleScan}>
              <Text className="btn-icon">🖥️</Text>
              <Text className="btn-txt">扫一扫电脑屏幕直接登录</Text>
            </View>
          )}

          <View className="btn-primary-copy" onClick={handleCopyUrl}>
            <Text className="btn-icon">📋</Text>
            <Text className="btn-txt">一键复制网址，浏览器打开</Text>
          </View>

          <Button
            className="btn-share-card"
            openType="share"
          >
            <Text className="share-icon">💌</Text>
            <Text className="share-txt">转发给微信好友 / 文件传输助手</Text>
          </Button>

          <View className="btn-advisor-link">
            <Text className="link-txt">💡 电脑端免安装任何客户端，浏览器直接打开即可学习</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
