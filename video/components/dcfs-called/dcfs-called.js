import Client from '../../index'
const app = getApp();
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    account:{
      type:String,
      value:""
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    defaultIcon: app.globalData.devImgUrl+'/default-icon.png',
    mineHeadImg: app.globalData.devImgUrl+'/mine-head.png',
  },

  /**
   * 组件的方法列表
   */
  methods: {
    //拒绝
    onReject(){
      Client.getInstance().reject()
      this.triggerEvent('reject')
    },
    //接听
    onAnswer(){
      wx.showLoading({
        title: '连接中。。。',
      })
      Client.getInstance().anwser()
      this.triggerEvent('anwser')
    }
  }
})
