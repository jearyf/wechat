import Client from '../../../index'
import logger from '../../../log/index'
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    //是否显示控制按钮
    showControl:{
      type:Boolean,
      value:true
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
    isConnect:false,
    userlist: [], // 所有用户列表
    loginUser:null,
    duration:"00:00:00",
    // 音视频流重连标记
    streamNeedReconnect: false,
    streamStoped: false,
    videoSizeData: {
      width: 100,
      height: 200
    }
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
    .on("selfJoinRoom",this._selfJoinRoom.bind(this))
    .on("syncDone",this._syncDone.bind(this))
    .on("remoteTrack",this._remoteTrack.bind(this))
    .on("leaveChannel",this._leaveChannel.bind(this))
    .on("netcallError", this._netcallError.bind(this))
    .on("reconnect", this._reconnect.bind(this))
  },
  /**
   * 移除监听
   */
  removeListen(){
    Client.getInstance().removeEvent("selfJoinRoom")
    Client.getInstance().removeEvent("syncDone")
    Client.getInstance().removeEvent("remoteTrack")
    Client.getInstance().removeEvent("leaveChannel")
    Client.getInstance().removeEvent("netcallError")
    Client.getInstance().removeEvent("reconnect")
  },
  /**
   * 同步完成
   */
  _syncDone(data){
    console.log('data=',data)
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
      isConnect: true
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
    //设置用户列表数据
    _setUsreList(data) {
      logger.info("设置用户数据", data)
      let userlist = this.data.userlist
      let loginUser = this.data.loginUser
      logger.info('loginUser.uid', loginUser.uid)
      data.layout = 'small' //小布局
      data.position = {
        x: 0,
        y: 0,
        width: 200,
        height: 300
      }
      userlist.push(data)
      this.setData({
        userlist:userlist
      })
      logger.info('userlist=', this.data.userlist)
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
