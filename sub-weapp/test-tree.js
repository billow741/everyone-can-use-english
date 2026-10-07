
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
let capturedData = null;
pageInstance.setData = (data) => {
  capturedData = data;
};
if (pageInstance.onLoad) pageInstance.onLoad();
if (pageInstance.onReady) pageInstance.onReady();

function inspectNode(node, depth = 0) {
  const indent = ' '.repeat(depth * 2);
  const textVal = node.v || (node.children ? node.children : '');
  console.log(indent + 'nn:' + node.nn + ' cl:' + (node.cl || '') + ' text:' + textVal);
  if (node.cn) {
    for (let c of node.cn) inspectNode(c, depth + 1);
  }
}

if (capturedData && capturedData['root.cn']) {
  console.log('TREE COUNT:', capturedData['root.cn'].length);
  for (let n of capturedData['root.cn']) {
    inspectNode(n);
  }
}
