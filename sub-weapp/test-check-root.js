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

require('./dist/common.js');
require('./dist/vendors.js');
require('./dist/taro.js');
require('./dist/runtime.js');

// let's check module 7260
const r = wx.webpackJsonp;
console.log('webpackJsonp length:', r.length);
