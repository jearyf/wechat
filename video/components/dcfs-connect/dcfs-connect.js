import Client from '../../index'
import logger from '../../log/index'
var self = null
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    //是否打开摄像头
    isCamera:{
      type:Boolean,
      value:true,
      observer: (newVal) => {
        logger.info("摄像头开关设置value"+newVal)
        // self._stopStream(0).then(() => {
        //   self._reconnectStreamAfter(100)
        // })
      }
    },
    //是否显示控制按钮
    showControl:{
      type:Boolean,
      value:true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    isConnect:false,
    isVideo:true,
    isMuted:false,//是静音
    userlist: [], // 所有用户列表
    loginUser:null,
    duration:"00:00:00",
    // 音视频流重连标记
    streamNeedReconnect: false,
    streamStoped: false
  },
  lifetimes:{
    created(){
      self = this
      this.initialPosition()
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
    //挂断
    onHangup(){
      Client.getInstance().hangup()
      this._stopStream(0)
      clearInterval(this.netcallTimekeeping)
      this._resetStreamState()
      this.triggerEvent('hangup')
    },
    //切换音视频
    onSwitchMode(event){
      //切换到视频
      if(event.detail){
        this.setData({
          isVideo:true,
          isCamera:true
        })
        //音频切换到视频 需要对方同意  在对方同意里面写逻辑
        Client.getInstance()
        .switchAVControl(Client.getInstance().netcallAdapter.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO,this.data.loginUser.cid)
        .then(()=>{
          this._stopStream(0).then(() => {
            this._reconnectStreamAfter(100)
          })
        })
      }else{
        //切换到音频不需要同意  直接处理逻辑
        this.setData({
          isVideo:false,
          isCamera:false,
          showControl:true
        })
        Client.getInstance()
        .switchAVControl(Client.getInstance().netcallAdapter.NETCALL_CONTROL_COMMAND_SWITCH_VIDEO_TO_AUDIO,this.data.loginUser.cid)
        .then(()=>{
          this._stopStream(0).then(() => {
            this._reconnectStreamAfter(100)
          })
        })
      }
    },
    /**
     * 设置是否静音
     */
    onMute(event){
      this.setData({isMuted:event.detail})
    },
    /**
     * 暂停通话
     */
    onPause(event){
      //暂停通话
      if(event.detail){
        //是否关闭麦克风 是否打开摄像头
        this.setData({isCamera:false,isMuted:true},()=>{
          this._stopStream(0).then(() => {
            this._reconnectStreamAfter(100)
          })
        })
      }else{
        //取消暂停通话
        //是否打开摄像头,是否关闭麦克风
        this.setData({isCamera:true,isMuted:false},()=>{
          this._stopStream(0).then(() => {
            this._reconnectStreamAfter(100)
          })
        })
      }
    },
    //前后摄像头切换
    switchCamera(){
      this.livePusherContext.switchCamera({
        success:()=>{
          logger.info("前后摄像头切换成功")
        },
        fail:(err)=>{
          logger.error("前后摄像头切换失败",err)
        }
      })
    },
    //摄像头关闭切换
    toggleCamera(){
      this.setData({isCamera:!this.data.isCamera},()=>{
        this._stopStream(0).then(() => {
          this._reconnectStreamAfter(100)
        })
      })
    },
    //设置小视屏区域的位置
    initialPosition(){
    let systemInfo = wx.getSystemInfoSync()
    let containerSize = {
      width: systemInfo.windowWidth,
      height: systemInfo.windowHeight
    }
      let smallPosition = []
      for (let i = 0; i < 6; i++) {
        smallPosition.push({
          x: containerSize.width-100-30,
          y: 50+130*i+20*i,
          width: 100,
          height: 130
        })
      }
      let largePosition = {
        x: 0,
        y: 0,
        width: containerSize.width,
        height: containerSize.height
      }
      this.setData({
        smallPosition,
        largePosition
      })
    },
    /**
   * 信息监听
   */
  listenNetcallEvent() {
    Client.getInstance()
    .on("screenStart",this._calleeScreenStart.bind(this))
    .on("screenStop",this._calleeScreenStop.bind(this))
    .on("selfJoinRoom",this._selfJoinRoom.bind(this))
    .on("syncDone",this._syncDone.bind(this))
    .on("remoteTrack",this._remoteTrack.bind(this))
    .on("leaveChannel",this._leaveChannel.bind(this))
    .on("videoToAudio",this._videoToAudio.bind(this))
    .on("audioToVideo",this._audioToVideo.bind(this))
    .on("audioToVideoAgree",this._audioToVideoAgree.bind(this))
    .on("netcallError", this._netcallError.bind(this))
    .on("reconnect", this._reconnect.bind(this))
  },
  /**
   * 移除监听
   */
  removeListen(){
    Client.getInstance().removeEvent("screenStart")
    Client.getInstance().removeEvent("screenStop")
    Client.getInstance().removeEvent("selfJoinRoom")
    Client.getInstance().removeEvent("syncDone")
    Client.getInstance().removeEvent("remoteTrack")
    Client.getInstance().removeEvent("leaveChannel")
    Client.getInstance().removeEvent("videoToAudio")
    Client.getInstance().removeEvent("audioToVideo")
    Client.getInstance().removeEvent("audioToVideoAgree")
    Client.getInstance().removeEvent("netcallError")
    Client.getInstance().removeEvent("reconnect")
  },
  onClick(){
    this.setData({
      showControl:!this.data.showControl
    })
  },
  /**
   * 对方开始投屏
   */
  _calleeScreenStart(){},
  /**
   * 坐席结束投屏
   */
  _calleeScreenStop(){},
  /**
   * 同步完成
   */
  _syncDone(data){
    let user = Object.assign({}, data.userlist[0])
    let loginUser = this.data.loginUser
    for(let i = 0; i < this.data.userlist.length; i++){
      const tempUser = this.data.userlist[i]
      if(tempUser.uid === loginUser.uid){
        logger.warn("用户列表中存在当前登录用户")
        return
      }
    }
    this._setUsreList(user)
    //添加到用户列表
    setTimeout(() => {
      this.livePusherContext = wx.createLivePusherContext()
      this._reconnectStreamAfter()
    }, 1000);
    
  },
  /**
   * 自己加入房间
   */
  _selfJoinRoom(data){
    logger.info("加入房间", data)
    //通知父组件变化布局为链接状态
    this.triggerEvent('join',data)
    this.setData({
      cid: data.cid,
      loginUser: {
        uid: data.uid,
        cid: data.cid,
        account: data.account
      },
    })
  },
  /**
   * 用户加入并产生流
   */
  _remoteTrack(data){
    this._setUsreList(data)
    logger.info('有人加入了JoinChannel', data)   //account: "qunch" cid: 52005682939861 uid: 17718941371  主叫时将视频和座席关联  
    if(!this.data.isConnect){
      wx.hideLoading({
        success: (res) => {},
        fail:()=>{}
      })
      this.triggerEvent('connect')
      this._startTimekeeping()
    }
      this.setData({
        isConnect: true, // 正在通话中标记
        isCalling: false,
        beCalling: false,
        streamNeedReconnect: true
      })
    },

    /**
     * 用户离开
     */
    _leaveChannel(data){
        logger.info('有人离开了：', data)
        this._personLeave(Object.assign({}, data))
    },
    /**
     * 视屏转音频
     */
    _videoToAudio(){
      this.setData({
        isCamera:false,
        isVideo:false
      })
      logger.info('从视频切换到音频')
    },
    /**
     * 音频转视频
     */
    _audioToVideo(){
      //切换到音频不需要同意  直接处理逻辑
      this.setData({
        isCamera:true,
        isVideo:true
      })
      Client.getInstance().switchAVControl(Client.getInstance().netcallAdapter.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO_AGREE,this.data.loginUser.cid)
      logger.info('请求从音频切换到视频')
    },
    /**
     * 同意音频转视频
     */
    _audioToVideoAgree(){
      this.setData({
        isCamera:true,
        isVideo:true
      })
      logger.info('对方同意从音频切换到视频')
    },
    //设置用户列表数据
  _setUsreList(list) {
    logger.info("设置用户数据", list)
    let userlist = this.data.userlist
    let loginUser = this.data.loginUser
    logger.info('loginUser.uid', loginUser.uid)
    let isLarge = false //大布局是否显示
    if (list.uid === loginUser.uid) { //自己
      list.layout = 'samll' //小布局
      list.position = this.data.smallPosition[0]
      userlist.push(list)
    } else {      
      userlist.map(item => {
        if (item.layout === 'large') {
          isLarge = true
        }
      })
      if (!isLarge) {
        list.layout = 'large' //大布局
        list.position = this.data.largePosition
        userlist.unshift(list)
      } else {
        list.layout = 'samll' //小布局
        list.position = this.data.smallPosition[userlist.length - 1]
        userlist.push(list)
      }
    }
    this.setData({
      userlist:userlist
    })
  },
    //用户离开
    _personLeave(data) {
      const self = this
      let currUserList = Object.assign([], self.data.userlist)
      let layout = ''
      let currUser = null
      logger.info('有人离开了：', self.data.userlist) 
      self.data.userlist.map((item, index) => {
        if (item.uid === data.uid) {
          layout = item.layout
          currUser = item
          currUserList.splice(index, 1)
        }
      })
      logger.info('有人离开了：', currUserList) 
      if (currUserList.length === 1) { //只剩一个人了就离开房间   
        this.onHangup() 
      } else {
        if (layout === 'large') { //离开人是显示大布局的
          for (let i = 0; i < currUserList.length; i++) {
            if (currUserList[i].uid !== self.data.loginUser.uid) { //不是自己布局
              let user = Object.assign({}, currUserList[i])
              user.layout = 'large'
              user.position = currUser.position
              currUserList.splice(i, 1)
              currUserList.unshift(user)
              break
            }
          }
        }
        this.setData({
          userlist: currUserList
        })
      }
    },
    /**
     * 开始解计时
     */
    _startTimekeeping(){
      if(!this.netcallTimekeeping){
        let count = 0;
        this.netcallTimekeeping = setInterval(()=>{
          count++
          this.setData({
            duration: this._showNum(parseInt(count / 60 / 60))+":"+this._showNum(parseInt(count / 60) % 60)+":"+this._showNum(count % 60)
          })
        },1000)
      }
    },
    _showNum(num) {
      if (num < 10) {
          return '0' + num
      }
      return num
    },
    //开始推流
  _reconnectStreamAfter(duration = 0) {
    clearTimeout(this.reconnectStreamTimer)
    this.reconnectStreamTimer = setTimeout(() => {
      this._reconnectStream()
    }, duration)
  },
  /**
   * 开始推流和拉流
   */
  _reconnectStream() {
    if (this.data.streamNeedReconnect) {
      clearTimeout(this.stopStreamTimer)
      console.log('开始推流')
      this.livePusherContext.start({
        success: () => {
          this.setData({
            streamStoped: false
          })
        },
        complete: () => {
          if (!this.livePlayerMap) {
            this.livePlayerMap = {}
          }
          this.data.userlist.map(user => {
            const uid = `${user.uid}`
            if (user.uid != this.data.loginUser.uid) {
              console.log(`重新播放 ${uid}`)
              if (!this.livePlayerMap[uid]) {
                this.livePlayerMap[uid] = wx.createLivePlayerContext(`dcfsplayer-${user.uid}`, this)
              }
              // console.error(this.livePlayerMap[uid])
              // showToast('text', '开始重连拉流')
              this.livePlayerMap[uid].play()
            }
          })
        }
      })
    }
  },
  /**
   * 停止推流
   */
  _stopStream(duration = 1000) {
    if (this.stopStreamTimer) {
      clearTimeout(this.stopStreamTimer)
    }
    if (this.data.streamStoped) {
      return Promise.resolve()
    }
    console.log('停止推流')
    return new Promise((resolve, reject) => {
      this.stopStreamTimer = setTimeout(() => {
        if (!this.livePusherContext) {
          return
        }
        if (!this.livePlayerMap) {
          this.livePlayerMap = {}
        }
        this.data.userlist.map(user => {
          const uid = `${user.uid}`
          if (user.uid != this.data.loginUser.uid) {
            console.log(`停止拉流 ${uid}`)
            if (!this.livePlayerMap[uid]) {
              this.livePlayerMap[uid] = wx.createLivePlayerContext(`dcfsplayer-${user.uid}`, this)
            }
            this.livePlayerMap[uid].stop()
          }
        })
        this.livePusherContext.stop({
          complete: () => {
            console.log('推流已停止')
            this.setData({
              streamStoped: true
            })
            resolve()
          }
        })
      }, duration)
    })
  },
  //重置数据
  _resetStreamState() {
    clearTimeout(this.stopStreamTimer)
    this.setData({
      streamNeedReconnect: false,
      streamStoped: false
    })
  },
  _netcallError(data) {
    logger.info("dcfs-connect._netcallError",data)
    if (data.code==417) {
      wx.showToast({
        title: '网络异常，请检查网络',
        icon: 'none',
        duration: 3000
      })
      this.onHangup()
    }
  },
  _reconnect(data) {
    wx.showToast({
      title: '网络异常，请检查网络',
      icon: 'none',
      duration: 3000
    })
    logger.info("dcfs-connect._reconnect",data)
    if (data.retryCount>=2) {
      this.onHangup()
    }
  }
  },
})
