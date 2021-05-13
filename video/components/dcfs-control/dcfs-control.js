import Client from '../../index'
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    isVideo:{
      type:Boolean,
      value:true
    },
    isHidden:{
      type:Boolean,
      value:false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    isMuted:false,
    isPause:false,
    isMsgChat:false
  },
  
  /**
   * 组件的方法列表
   */
  methods: {
    //静音
    onMute(){
      this.setData({
        isMuted:!this.data.isMuted
      })
      this.triggerEvent('muted',this.data.isMuted)
    },
    //暂停
    onPause(){
      this.setData({
        isPause:!this.data.isPause
      })
      this.triggerEvent('pause',this.data.isPause)
    },
    //聊天
    onMsg(){
      this.setData({
        isMsgChat:!this.data.isMsgChat
      })
    },
    //切换模式
    onSwitchMode(){
      this.setData({
        isVideo:!this.data.isVideo
      },()=>{
        this.triggerEvent('switchMode',this.data.isVideo)
      })
      
    },
    //挂断
    onHangup(){
      this.triggerEvent('hangup')
    },
    //有消息来了
    onMessage(event){
      this.setData({
        isMsgChat:true
      })
    }
  }
})
