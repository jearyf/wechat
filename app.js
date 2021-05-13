// app.js

App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
    // 注册腾讯云人脸识别控件
    // const Verify = require('../video_wechat/verify_mpsdk/main');
    const Verify = require('/verify_mpsdk/main');
    Verify.init();
  },
  globalData: {
    videoContainerSize:wx.getSystemInfoSync(),
  }
})
