global.wx = {
  getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 667, pixelRatio: 2 }),
  getSystemInfo: (opts) => opts.success && opts.success({ windowWidth: 375, windowHeight: 667, pixelRatio: 2 }),
  canIUse: () => true,
  getAccountInfoSync: () => ({ miniProgram: { appId: 'wx69eb90d6d67b839b' } })
};
global.getCurrentPages = () => [];
global.getApp = () => global.__appInstance;
global.App = (config) => {
  console.log('App initialized');
  global.__appConfig = config;
  global.__appInstance = config;
  if (config.onLaunch) config.onLaunch();
};
global.Page = (config) => {
  console.log('Page registered:', Object.keys(config));
  global.__pageConfig = config;
};
global.Component = (config) => {};

try {
  require('./dist/app.js');
  require('./dist/pages/index/index.js');
  console.log('Successfully executed app.js and index.js!');
  
  // Now simulate onLoad and onReady
  const pageInstance = Object.create(global.__pageConfig);
  pageInstance.setData = (data) => {
    console.log('Page setData called with keys:', Object.keys(data));
    if (data.root) {
      console.log('data.root.cn length:', (data.root.cn || []).length);
      console.log('data.root.cn:', JSON.stringify(data.root.cn).slice(0, 300));
    }
  };
  if (pageInstance.onLoad) pageInstance.onLoad();
  if (pageInstance.onReady) pageInstance.onReady();
} catch (e) {
  console.error('RUNTIME ERROR:', e);
}
