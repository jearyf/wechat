// index.js
// 获取应用实例
const recorderManager = wx.getRecorderManager()
// const innerAudioContext = wx.createInnerAudioContext()
import Client from '../../../../video/index.js'
Page({
  data: {
    toview:'',
    leftAreaId:'',
    sessionInfo: null,
    videoSize: {
      width: 130,
      height: 190
    },
    innerAudioContext: null,
    src: '',
    //话术数组
    tempFilePath: '',
    answer: [],
    timer:'',
    lastVarbal: '',
    verbalId: '',
    ces:'',
    innerAudiotime:'',
    // answ:'是的',
    verbalDetailId: '',
    dataInfo: {
      //订单号
      billId: '',
      // //话术回答
      answer: '',
      sessionId: '',
      // //话术明细id
      verbalDetailId: '',
      // //当前所属话术id
      verbalId: '',
    },
    three:'3',
    innerAudioContext:null,
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: false,
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName'),
    config: {
      x: 30,
      y: 30,
      width: 130,
      height: 200
    },
    showModal: false,
    time: false,
    isShowwSubmitBtn: false,
    // 如需尝试获取用户信息可改为false
  },
  // 事件处理函数
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },

  onLoad: function  (options) {
    var self=this
    var t
    console.log('查找sessionId的测试', options)
    
    this.setData({sessionInfo:JSON.parse(options.sessionInfo)})
    this.setData({'dataInfo.billId': this.data.sessionInfo.billId})
    console.log('双路页面的订单号',this.data.sessionInfo.billId)
    console.log('双路页面的订单号',options.sessionInfo)
    // console.log(this.data.dataInfo)
    var timer=setTimeout(()=>{
      var content= wx.getStorageSync('contentvalue')
      console.log('获取到的sessionId',content.payload.sessionId)
      this.setData({'dataInfo.sessionId': content.payload.sessionId})
      console.log('获得sessionId后的',this.data.dataInfo)
     //调用请求话术接口
      this.getVer() 
    },6000)
    // this.data.innerAudioContext = wx.createInnerAudioContext();
    // this.data.innerAudioContext.autoplay = true;
    // this.data.innerAudioContext.src = '../intelligentAgent/callRemiding.mp3';
    // this.data.innerAudioContext.loop = true;
    // this.data.innerAudioContext.play();


  let innerAudioContext = wx.createInnerAudioContext()
  this.setData({innerAudioContext})

    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    //录音监听
    recorderManager.onStart((res) => {
      console.log('开始录音')
      // this.setData({ five: true })
      // this.setData({ five: true })
      this.setData({
        innerAudiotime:setInterval(()=>{
          var three=this.data.three
          this.setData({
            three:three-1
          })
        },1000)
      })
       setTimeout(()=>{
        this.stop()
      },4000)
    });
    recorderManager.onStop((res) => {
      clearInterval(this.data.innerAudiotime )
      this.setData({
        three:3
      })
      console.log('停止录音', res.tempFilePath)
      const tempFilePath = res.tempFilePath
       this.getup(tempFilePath) 
  })

  //语音播报监听
  this.data.innerAudioContext.onPlay(() => {
    console.log('开始播放')
  });
  this.data.innerAudioContext.onEnded((res) => {
    this.start() 
  })
  this.data.innerAudioContext.onError(res => { 
    console.log(res.errCode)
    console.log(res.errMsg)
  });
  this.data.innerAudioContext.onStop((res) => {
    console.log('停止播放!');
    self.TTSS(self.data.lastVarbal)
    self.data.innerAudioContext.destroy(); 
  })
  this.data.innerAudioContext.onPause((res) => {
    console.log('暂停播放!');
    wx.onAudioInterruptionEnd(()=>{
      console.log('onPause监听到可以播放语音')
      self.TTSS(self.data.lastVarbal)

    })
    // self.data.innerAudioContext.destroy(); 
    // self.TTSS(self.data.lastVarbal)
  })
  },
  onHide: function () {
    console.log('退出了')
  },
  onReady: function () {
  },
  onShow: function() {
  },
  //请求话术
  getVer: function () {
    var self = this
    let config = {
      method: 'GET',
      url: '/api/v1/video/trans/corporation/verbal/getVerbal',
      data: self.data.dataInfo,
    }
    Client.getInstance().request(config).then(async(res) => {
      if (res.data.resultCode === 1) {
        self.setData({ lastVarbal: res.data.verbal })
        var arr = self.data.answer
        arr.push({ key: res.data.verbal, value: 0 });
        self.setData({
          answer: arr
        }),
        self.setData({toview:'t'.concat(self.data.answer.length-1)})
        self.setData({leftAreaId:'t'.concat(self.data.answer.length-1)})
        self.setData({ verbalId: res.data.verbalId })
        self.setData({ verbalDetailId: res.data.verbalDetailId })
        self.TTSS(self.data.lastVarbal)
        console.log('tttttx',self.data.toview)
        // console.log('第一次请求话术后的设置', this.data.dataInfo)
      } else if (res.data.resultCode === 2 || res.data.resultStatus === 'FINISH') {
        self.setData({ isShowwSubmitBtn: true })
      } else if (res.data.resultCode === 3) {
        await self.setData({ lastVarbal: res.data.verbal })
        self.TTSS(self.data.lastVarbal)
        var arr = self.data.answer
        arr.push({ key: res.data.verbal, value: 0 });
        self.setData({
          answer: arr
        }),
        self.setData({toview:'t'.concat(self.data.answer.length-1)})
        self.setData({leftAreaId:'t'.concat(self.data.answer.length-1)})
        self.setData({ verbalId: res.data.verbalId })
        self.setData({ verbalDetailId: res.data.verbalDetailId })
      }
    })
  },

  //语音播报
  TTSS: function (text) {
    var tts = new Promise(async(resolve, reject) => {
      var self = this
      let config = {
        method: 'POST',
        url: '/api/v1/video/tts/audio/getAudioUrl',
        data: {
          'text': text
        },
      }
      //转成语音
      await Client.getInstance().request(config).then(async(res) => {
        console.log(res)
        var tab = res.data
        //pro
        var api = 'https://svb.ghbank.com.cn/vs/api/v1/video/tts/audio/getAudioFile/' + tab
        //dev
        // var api = 'https://svbtest.ghbank.com.cn:9082/vs/api/v1/video/tts/audio/getAudioFile/' + tab
        //uat
        // var api = 'https://svbtest.ghbank.com.cn/vs/api/v1/video/tts/audio/getAudioFile/' + tab
        self.setData({ src: api })
        await this.downfile()
      })
    })
    return tts
  },
  //下载语音话术
  downfile: function () {
    var self=this
    // innerAudioContext.autoplay = true;
    const res = wx.getSystemInfoSync()
    let syt = res.system.replace(/[^a-z]+/ig, '')
    console.log(syt)
    var tokenValue = wx.getStorageSync('tokenValue')
    wx.downloadFile({
      url: this.data.src,
      header: { 'token': tokenValue },
      success(res) {
        console.log(res)
        if (res.statusCode === 200) {
          
          self.data.innerAudioContext.src = res.tempFilePath
          self.data.innerAudioContext.play()
          wx.onAudioInterruptionEnd(()=>{
            console.log('监听到可以播放语音')
            wx.showToast({
              title: '异常...',
              icon: 'loading',
              mask: true,
              duration: 3000
             });
             wx.redirectTo({
              url: '../errmasge/index',
            })
          })
              
        }
      }
    })
  },
  //获取音频
  start: function() {
    const options = {
      // duration: 4000,
      //指定录音的时长，单位 ms
      sampleRate: 16000,//采样率
      format: 'wav',//音频格式，有效值 aac/mp3
      numberOfChannels: 1,//录音通道数
      encodeBitRate: 64000,//编码码率
      frameSize: '50',//指定帧大小，单位 KB
    }
    recorderManager.start(options);
    this.setData({ five: true })
    //   //错误回调
    recorderManager.onError((res) => {
      console.log(res);
    })
  },
  //停止录音
  stop: function () {
    recorderManager.stop();
    console.log('停止录音')
    this.setData({ five: false })
    this.setData({ time: true })
  },
  //上传录音
  getup:function(tempFilePath){
    var self=this
       let config = {
        filePath: tempFilePath,
        url: '/api/v1/video/iflytek/asr/asrAudioUpload',
        name: 'file',
        header: {
          'content-type': 'multipart/form-data'
        },
      }
      Client.getInstance().uploadFile(config).then((res) => {
        console.log(res.data)
        console.log(JSON.parse(res.data))
        var target = JSON.parse(res.data)
        console.log(target.targetFileName)
        let config = {
          method: 'POST',
          url: '/api/v1/video/iflytek/asr/asrDiscernByFilePath',
          header: {
            'content-type': 'application/x-www-form-urlencoded'
          },
          data: {
            filePath: target.targetFileName,
          },
        }
        console.log('我是请求参数', config)
        Client.getInstance().request(config).then(async(res) => {
          self.setData({ time: false })
          if (res.data.discernText) {
            var text = res.data.discernText
            console.log('截取后的值', text)
            var arr = self.data.answer
            arr.push({ key: text, value: 1 });
             self.setData({
              answer: arr,
            }),
            self.setData({toview:'t'.concat(self.data.answer.length-1)})
            self.setData({rightAreaId:'t'.concat(self.data.answer.length-1)})
              self.setData({
                'dataInfo.answer': text
              })
            console.log('修改后的dataInfo', self.data.dataInfo)
            self.setData({ 'dataInfo.verbalId': self.data.verbalId })
            self.setData({ 'dataInfo.verbalDetailId': self.data.verbalDetailId })
            self.getVer()
          } else {
            var noh = res.data.discernText
            var arr = self.data.answer
            arr.push({ key: noh, value: 1 });
             self.setData({
              answer: arr,
            }),
            self.setData({toview:'t'.concat(self.data.answer.length-1)})
            self.setData({rightAreaId:'t'.concat(self.data.answer.length-1)})
              self.setData({
                'dataInfo.answer': noh
              })
              var arr = self.data.answer
              arr.push({ key:'回答为空。'+this.data.lastVarbal, value: 0 });
              self.setData({
                answer: arr
              }),
              self.setData({toview:'t'.concat(self.data.answer.length-1)})
              self.setData({leftAreaId:'t'.concat(self.data.answer.length-1)})
            self.TTSS('回答为空。'+this.data.lastVarbal)
          }
        }).catch((err)=>{console.log(err)})
      });
  },
  //话术滚动
  // pageScrollToBottom:function(){
  //   var self=this
  //   wx.createSelectorQuery().select('#scrollpage').boundingClientRect(function(rect){
  //     console.log('滚动了',rect)
  //     self.setData({scrollTop:rect.height})
  //       // console.log(rect.height);
  //     console.log('scrolltop456465',self.data.scrollTop)
  //   }).exec()
  // },
    /**
   * 呼叫异常
   */
  callError() {
    wx.navigateBack({
      delta: 1,
    })
  },
    /**
   *  挂断
   */
  hangUp() {
      Client.getInstance().logout();
      wx.redirectTo({
        url: '../success/index',
        success: function (res) {
          console.log('成功跳转',res)
        }, fail(err) {
          console.log('失败',err)
        }
      })
  },
  // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
  getUserProfile(e) {
    var self = this
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        self.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  getUserInfo(e) {
    // 不推荐使用getUserInfo获取用户信息，预计自2021年4月13日起，getUserInfo将不再弹出弹窗，并直接返回匿名的用户个人信息
    console.log(e)
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },
  //提交双录
  sumitResult() {
    this.setData({ showModal: true })
    Client.getInstance().hangup()
  },
  //关闭双录
  closel() {
    this.hangUp()
    // wx.redirectTo({
    //   url: '../success/index',
    //   success: function (res) {
    //     console.log('成功跳转',res)
    //   }, fail(err) {
    //     console.log('失败',err)
    //   }
    // })
    // <web-view src="../success/index"></web-view>
  }
})
