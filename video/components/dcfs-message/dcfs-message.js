import Client from '../../index'
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    isHidden:{
      type:Boolean,
      value:true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    inputVal:"",
    placeholder:"说点什么。。。",
    chatList:[],
    scrollTop: 0,
    inputFocus:false
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
  openKeyboard(){
    this.setData({
      inputFocus:true
    })
  },
  //发送点击监听
  sendClick: function(e) {
    if(this.data.inputVal){
      Client.getInstance().sendTeamChatTextMessage(this.data.inputVal)
      this._setChatMsg("我",this.data.inputVal)
      this.setData({inputVal:""})
    }
  },
  //监听消息
  listenNetcallEvent(){ 
    Client.getInstance().on("chatTeamMessage",this._chatTeamMessage.bind(this))
  },
  removeListen(){
    Client.getInstance().removeEvent("chatTeamMessage")
  },
  //收到聊天消息
  _chatTeamMessage(msg){
    console.log(">>>>>>>>>>",msg)
    if(null==msg){return}
    let sender = msg.header.from
    let chatMsg = msg.payload.content
    this._setChatMsg(sender,chatMsg)
    this.triggerEvent('message',chatMsg)
  },
  _setChatMsg(sender,text){
    console.log(sender,text)
    let chatList = this.data.chatList;
    chatList.push({
      key:sender,
      value:text
    })
    var that = this;
    this.setData({chatList},()=>{
      console.log('chatList',chatList)
      let platform = wx.getSystemInfoSync().platform
      if (platform=='android') {
        wx.createSelectorQuery().in(that).select('.dcfs-message-item').boundingClientRect(function (rect) {
          console.log('rect',rect)
          var toTop = (that.data.chatList.length*rect.height+(rect.height*10));
          that.setData({scrollTop:toTop});
        }).exec();
      }
    })
  }
  }
})
