global.wx = {
  getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 667 }),
  getSystemInfo: (opts) => opts.success && opts.success({ windowWidth: 375, windowHeight: 667 }),
  canIUse: () => true
};
global.App = (config) => {
  console.log('App initialized successfully');
  global.__appConfig = config;
};
global.Page = (config) => {
  console.log('Page registered:', Object.keys(config));
  global.__pageConfig = config;
};
global.Component = (config) => {
  // console.log('Component registered');
};

try {
  require('./dist/app.js');
  require('./dist/pages/index/index.js');
  console.log('Successfully required app.js and index.js without error!');
} catch (e) {
  console.error('RUNTIME ERROR:', e);
}
