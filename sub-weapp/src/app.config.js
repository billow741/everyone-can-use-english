export default {
  pages: [
    'pages/index/index',
    'pages/apply/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'SunnyBridge 阳光桥少儿英语',
    navigationBarTextStyle: 'black'
  },
  permission: {
    'scope.record': {
      desc: '用于少儿英语发音跟读录音与发音评测'
    }
  },
  __usePrivacyCheck__: true,
  tabBar: {
    color: '#8A97A8',
    selectedColor: '#FF6B00',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页推荐',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-active.png'
      },
      {
        pagePath: 'pages/apply/index',
        text: '预约交流',
        iconPath: 'assets/tabbar/apply.png',
        selectedIconPath: 'assets/tabbar/apply-active.png'
      }
    ]
  }
}
