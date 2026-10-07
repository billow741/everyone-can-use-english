global.wx = {
  getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 667, pixelRatio: 2 }),
  getSystemInfo: (opts) => opts.success && opts.success({ windowWidth: 375, windowHeight: 667, pixelRatio: 2 }),
  canIUse: () => true,
  getAccountInfoSync: () => ({ miniProgram: { appId: 'wx69eb90d6d67b839b' } })
};
global.getCurrentPages = () => [];
global.getApp = () => global.__appInstance;
global.App = (config) => { global.__appConfig = config; };
global.Page = (config) => { global.__pageConfig = config; };
global.Component = (config) => {};

require('./dist/app.js');
console.log('App registered. Inspecting __taroAppConfig:');
console.log(global.wx.__taroAppConfig);
