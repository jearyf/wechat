// video/components/dcfs-audio/dcfs-audio-ios.js
const app = getApp();
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    account:{
      type:String,
      value:"heclb"
    },
    timer:{
      type:String,
      value:"00:00:00"
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    homeFaceConfirm: app.globalData.devImgUrl+'/home-faceConfirm.png',
    defaultIcon: app.globalData.devImgUrl+'/default-icon.png'
  },

  /**
   * 组件的方法列表
   */
  methods: {

  }
})
