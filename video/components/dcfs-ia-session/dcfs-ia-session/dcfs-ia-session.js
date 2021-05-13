// video/components/dcfs-ia-session/dcfs-ia-session/dcfs-ia-session.js
import Client from '../../../index'
import log from '../../../log/index'

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    info: {
      type: Object,
      value: null,
      observer: function(newVal, oldVal){
        if (newVal) {
          this.setData({sessionInfoData: newVal})
        }
      }
    },
    videoSize: {
      type: Object,
      value: {
        width: 100,
        height: 200
      },
      observer: function(newVal, oldVal){
        if (newVal) {
          this.setData({videoSizeData: newVal})
        }
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    isCalling: true, // 主叫中
    isConnect: false, //正在通话中标记
    sessionInfoData: null,
    sessionInfo: null,
    videoSizeData: {
      width: 100,
      height: 200
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    initSessionInfo(data) {
      wx.setKeepScreenOn({
        keepScreenOn: true
      })
      //主叫
      this.setData({
        isCalling: true, // 主叫中
        isConnect:false,//是否连接
        //会话信息
        sessionInfo:{
          localAccount:"",
          remoteAccount:"",
          channelId:"",
          sessionType:data.sessionType,
          roomId:"",
          transCode:data.transCode,
          transName:data.transName,
          custom:data.custom,
          // callType:data.callType/
        }
      })
      Client.getInstance().call({
        callType:data.sessionType,
        transCode:data.transCode,
        transName:data.transName,
        businessType:"",
        custom:data.custom, 
      }).catch((error)=>{
          wx.showModal({
            title: '温馨提示',
            content: error.message||"呼叫异常",
            showCancel:false,
            success: (res)=> {
              this._resetData()
            }
          })
        log.error("SE-呼叫错误",error)
        this.triggerEvent('call-error')
      })
    },
    //重置数据
    _resetData() {
      this.setData({
        isCalling: false,
        isConnect: false
      })
    },
    /**
      * 信息监听
    */
    listenNetcallEvent() {
      Client.getInstance()
      .on("reject",this._calleeReject.bind(this))
      .on("cancel",this._calleeCancel.bind(this))
      .on("busy",this._calleeBusy.bind(this))
    },
    removeListen(){
      Client.getInstance().removeEvent("reject")
      Client.getInstance().removeEvent("cancel")
      Client.getInstance().removeEvent("busy")
    },
    /**
     * 用户主动取消
     */
    onCancel(){
      this._resetData()
      this.triggerEvent("hangup")
    },
    /**
     * 用户拒绝
     */
    onReject(){
      this._resetData()
    },
    /**
     * 用户接听
     */
    onAnwser(){},
    /**
     * 视频连接中
     */
    onConnect(){
      this.setData(({isConnect:true,isCalling:false}))
    //   console.log(11111)
    //   this.triggerEvent('Connect', {
        
    // }, {})
    },
    /**
     * 自己加入房间
     */
    onJoinRoom(){
      this.setData(({isConnect:true,isCalling:false}))
    },
    /**
     * 挂断视频
     */
    onHangup(){
      this._resetData()
      this.triggerEvent("hangup")
    },
    /**
     * 对方拒绝
     */
    _calleeReject(){
      this._resetData()
    },
    /**
     * 对方取消
     */
    _calleeCancel(){
      this._resetData()
    },
    /**
     * 多方繁忙
     */
    _calleeBusy(){
      this._resetData()
    },
  },
  observers: {
    'sessionInfoData': function (data) {
      this.initSessionInfo(data)
      this.listenNetcallEvent()
    }
  }
})


