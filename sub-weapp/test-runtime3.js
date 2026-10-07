global.wx = {
  getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 667, pixelRatio: 2 }),
  getSystemInfo: (opts) => opts.success && opts.success({ windowWidth: 375, windowHeight: 667, pixelRatio: 2 }),
  canIUse: () => true,
  getAccountInfoSync: () => ({ miniProgram: { appId: 'wx69eb90d6d67b839b' } })
};
global.getCurrentPages = () => [];
global.getApp = () => global.__appInstance;
global.App = (config) => {
  global.__appConfig = config;
  global.__appInstance = config;
  if (config.onLaunch) config.onLaunch();
};
global.Page = (config) => {
  global.__pageConfig = config;
};
global.Component = (config) => {};

require('./dist/app.js');
require('./dist/pages/index/index.js');

const pageInstance = Object.create(global.__pageConfig);
pageInstance.setData = (data) => {
  console.log('SETDATA CALL:');
  for (let k of Object.keys(data)) {
    console.log(k, '=>', typeof data[k] === 'object' ? JSON.stringify(data[k]).slice(0, 200) : data[k]);
  }
};
if (pageInstance.onLoad) pageInstance.onLoad();
if (pageInstance.onReady) pageInstance.onReady();
