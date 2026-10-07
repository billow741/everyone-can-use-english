import React from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import './index.scss'

export default function PolicyModal({ visible, type, onClose }) {
  if (!visible) return null

  const isPrivacy = type === 'privacy'

  return (
    <View className="policy-modal-mask" onClick={onClose} catchMove>
      <View className="policy-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* 顶部标题与关闭 */}
        <View className="policy-modal-header">
          <Text className="header-title">
            {isPrivacy ? '《隐私政策与个人信息保护声明》' : '《用户服务协议》'}
          </Text>
          <View className="btn-close" onClick={onClose}>
            <Text className="close-symbol">✕</Text>
          </View>
        </View>

        {/* 协议正文滚动区 */}
        <ScrollView scrollY className="policy-scroll-body">
          {isPrivacy ? (
            <View className="policy-content">
              <Text className="update-time">更新及生效日期：2026年10月</Text>

              <View className="policy-sec">
                <Text className="sec-heading">引言与合规承诺</Text>
                <Text className="sec-p">
                  SuBEngFi 小程序（以下简称“我们”或“本小程序”）高度重视用户的个人隐私与信息安全。根据《中华人民共和国个人信息保护法》及《微信小程序平台运营规范》，特制定本隐私政策，详细说明我们如何处理和保护您的个人信息。
                </Text>
              </View>

              <View className="policy-sec highlight-sec">
                <Text className="sec-heading">一、重要声明：绝不收集账户密码与账号</Text>
                <Text className="sec-p">
                  本小程序严格遵守平台合规要求，<Text className="strong-text">绝不在任何场景下索取、收集或存储用户的微信密码、微信账号、QQ账号、银行卡号、身份证号等个人敏感凭证信息</Text>。
                </Text>
              </View>

              <View className="policy-sec">
                <Text className="sec-heading">二、我们收集的信息及具体用途</Text>
                <Text className="sec-p">
                  为了实现 50分钟 英语交流体验的预约与伴学服务，我们仅收集实现功能所必需的最少信息：
                </Text>
                <Text className="sec-li">
                  1. <Text className="strong-text">联系手机号</Text>：在您主动填写并点击同意后收集，<Text className="strong-text">仅用于向您发送 50分钟 英语交流预约确认通知、时间安排及课后学习资料</Text>，绝不用于任何未经授权的第三方骚扰推广。
                </Text>
                <Text className="sec-li">
                  2. <Text className="strong-text">孩子姓名 / 昵称</Text>：仅用于交流伙伴称呼及课前定制化交流准备。您可填写英文名或小名，无需提供真实户籍姓名。
                </Text>
                <Text className="sec-li">
                  3. <Text className="strong-text">麦克风权限</Text>：仅在您主动使用口语跟读与发音评测功能时使用，用于录制单句发音音频以进行准确度评测打分，评测完成即释放，不作额外留存。
                </Text>
              </View>

              <View className="policy-sec">
                <Text className="sec-heading">三、信息的存储与安全保障</Text>
                <Text className="sec-p">
                  1. 我们采用工业标准的 SSL/TLS 加密传输协议，确保您的信息在传输过程中不被截获。
                </Text>
                <Text className="sec-p">
                  2. 信息仅存储于受严格访问控制的安全加密数据库，仅授权负责沟通交流的顾问查阅。绝不向任何第三方出租、出售或泄露。
                </Text>
              </View>

              <View className="policy-sec">
                <Text className="sec-heading">四、您的权利与信息删除途径</Text>
                <Text className="sec-p">
                  您对您提交的个人信息享有充分的知情权与决定权。如您需要撤回授权、更正或注销/删除此前填写的手机号等预约信息，可随时通过小程序内的“联系顾问”或微信客服进行申请，我们将在 24 小时内核实并彻底删除您的相关记录。
                </Text>
              </View>
            </View>
          ) : (
            <View className="policy-content">
              <Text className="update-time">更新及生效日期：2026年10月</Text>

              <View className="policy-sec">
                <Text className="sec-heading">一、协议的主体与范围</Text>
                <Text className="sec-p">
                  本协议是用户（以下简称“您”）与 SuBEngFi 小程序开发者之间关于使用本小程序各项服务所订立的协议。当您勾选同意或使用本小程序服务时，即表示您已充分理解并同意遵守本协议。
                </Text>
              </View>

              <View className="policy-sec">
                <Text className="sec-heading">二、服务内容与使用守则</Text>
                <Text className="sec-p">
                  1. 本小程序提供英语日常跟读发音评测、牛津原版绘本分级阅读展示及 50分钟 英语交流体验预约登记等学习辅助工具服务。
                </Text>
                <Text className="sec-p">
                  2. 用户在预约交流体验时，须保证所填写的手机号等联系信息为本人真实有效的信息，以便顺利接收专属交流伙伴的课前时间沟通与学习资料安排。
                </Text>
                <Text className="sec-p">
                  3. 本小程序内的所有教学资源、分级读物及评测系统仅供用户个人学习体验，严禁用于任何商业翻录或非法传播。
                </Text>
              </View>

              <View className="policy-sec">
                <Text className="sec-heading">三、未成年人保护提示</Text>
                <Text className="sec-p">
                  若您是未成年人的监护人，请在指导和监督下协助未成年人使用本小程序。预约交流服务须由具备完全民事行为能力的法定监护人操作确认。
                </Text>
              </View>

              <View className="policy-sec">
                <Text className="sec-heading">四、免责与协议修改</Text>
                <Text className="sec-p">
                  因网络不可抗力或电信服务异常导致的预约通知延迟，我们将全力协助沟通解决。我们保留依法对本协议条款进行合理更新的权利，更新后将在小程序内予以公示。
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* 底部确认按钮 */}
        <View className="policy-modal-foot">
          <View className="btn-policy-agree" onClick={onClose}>
            <Text className="agree-txt">我已阅读并知悉</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
