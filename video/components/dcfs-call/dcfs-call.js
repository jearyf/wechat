import Client from '../../index'
const app = getApp();
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    
  },

  /**
   * 组件的初始数据
   */
  data: {
    defaultIcon: app.globalData.devImgUrl+'/default-icon.png',
    mineHeadImg: app.globalData.devImgUrl+'/mine-head.png',
    hintMsg:"正在排队等待中。。。",
    isOvertime:false,// 是否超时 包括匹配超时  和 呼叫超时
  },

  lifetimes:{
    created(){
      this.listenNetcallEvent()
    },
    detached(){
      this.removeListen()
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 取消
     * @param {} flag  // 挂断类型 1未分配主动挂断，2未分配超时挂断，3已分配主动挂断，4已分配超时挂断
     */
    onCancel(){
      Client.getInstance().cancel(this.data.isOvertime)
      this.triggerEvent('cancel')
    },
    /**
   * 信息监听
   */
  listenNetcallEvent() {
    Client.getInstance()
    .on("timeoutTip",this._timeoutTip.bind(this))
    .on("timeoutHangup",this._timeoutHangup.bind(this))
    .on("timeoutConn",this._timeoutConn.bind(this))
    .on("callTimeout",this._callTimeout.bind(this))
  },
  /**
   * 移除监听
   */
  removeListen(){
    Client.getInstance().removeEvent("timeoutTip")
    Client.getInstance().removeEvent("timeoutHangup")
    Client.getInstance().removeEvent("timeoutConn")
    Client.getInstance().removeEvent("callTimeout")
  },
  /**
   * 超时提醒
   */
  _timeoutTip(){
    this.setData({
      hintMsg:"当前等待人数较多\n请选择稍后再拨或继续等待",
      isOvertime:false
    })
  },
  /**
   * 超时挂断
   */
  _timeoutHangup(){
    this.setData({
      isOvertime:true
    },()=>{
      this.onCancel()
    })
  },
  /**
   * 超时链接
   */
  _timeoutConn(){
    this.setData({
      isOvertime:true
    },()=>{
      this.onCancel()
    })
  },
  /**
   * 呼叫超时
   */
  _callTimeout(){
    this.setData({
      isOvertime:true
    },()=>{
      this.onCancel()
    })
  },
  }
})
