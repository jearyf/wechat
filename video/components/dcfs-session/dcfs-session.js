import Client from '../../index'
import log from '../../log/index'
Page({

  /**
   * 页面的初始数据
   */
  data: {
    isConnect: false, //正在通话中标记
    isCalling: false, // 主叫中
    beCalling: false, // 被叫中
    isShowBusi:false,//是否显示交易
    isReattachBusi:false,//是否重新加载交易界面
    isShowOcr:false,//是否展示ocr是被界面
    isCamera:true,//是否开启摄像头
    busiData:{},//交易信息
    bridgeData:[],//H5界面返回信息
    mode:"IDCardFront",//身份证正面或者反面  IDCardBack/IDCardFront
    idCardData:{},//身份证识别信息
    verbalTips:'',//话术提示
    //会话信息
    sessionInfo:{
      localAccount:"",
      remoteAccount:"",
      channelId:"",
      sessionType:2,
      roomId:"",
      transCode:"",
      transName:""
    },
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    log.info("收到传输数据",options)
    if(!this.data.isConnect){
      this.setSessionInfo(options)
      this.listenNetcallEvent()
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    if(this.data.isReattachBusi){
      this.setData({isShowBusi:false},()=>{
        this.setData({isShowBusi:true,isReattachBusi:false},()=>{
          this.data.bridgeData.map(item=>{
            // this._bridgeEvent(JSON.parse(item))
          })
        })
      })
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    //如果是链接状态
    if(this.data.isConnect){
      Client.getInstance().hangup()
    }else if(this.data.isCalling){
      Client.getInstance().cancel(false)
    }
    this.removeListen()
  },
  /**
   * 设置会话信息
   */
  setSessionInfo(options){
    if(null==options.sessionInfo){
      return
    }
    wx.setKeepScreenOn({
      keepScreenOn: true
    })
    let sessionInfo = JSON.parse(options.sessionInfo)
    //被叫
    if(options.beCalling){
      this.setData({
        isCalling: false, // 主叫中
        beCalling: true, // 被叫中
        isConnect:false,//是否连接
        //会话信息
        sessionInfo:{
          localAccount:"",
          remoteAccount:sessionInfo.callee[0],
          channelId:sessionInfo.sessionId,
          sessionType:sessionInfo.sessionType,
          roomId:sessionInfo.roomId,
          transCode:sessionInfo.transCode,
          transName:sessionInfo.transName,
          custom:sessionInfo.custom
        }
      })
    }else{
      //主叫
      this.setData({
        isCalling: true, // 主叫中
        beCalling: false, // 被叫中
        isConnect:false,//是否连接
        //会话信息
        sessionInfo:{
          localAccount:"",
          remoteAccount:"",
          channelId:"",
          sessionType:sessionInfo.sessionType,
          roomId:"",
          transCode:sessionInfo.transCode,
          transName:sessionInfo.transName,
          custom:sessionInfo.custom
        }
      })
      Client.getInstance().call({
        callType:sessionInfo.sessionType,
        transCode:sessionInfo.transCode,
        transName:sessionInfo.transName,
        businessType:"",
        custom:sessionInfo.custom
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
      })
    }
  },

  /**
   * 信息监听
   */
  listenNetcallEvent() {
    Client.getInstance()
    .on("reject",this._calleeReject.bind(this))
    .on("cancel",this._calleeCancel.bind(this))
    .on("busy",this._calleeBusy.bind(this))
    .on("faceLiveness",this._faceLiveness.bind(this))
    .on("verbalTips",this._verbalTips.bind(this))
    .on("busiClosePage",this._busiClosePage.bind(this))
    .on("busiPushPage",this._busiPushPage.bind(this))
    .on("busiPushData",this._busiPushData.bind(this))
  },
  removeListen(){
    Client.getInstance().removeEvent("reject")
    Client.getInstance().removeEvent("cancel")
    Client.getInstance().removeEvent("busy")
    Client.getInstance().removeEvent("faceLiveness")
    Client.getInstance().removeEvent("verbalTips")
    Client.getInstance().removeEvent("busiClosePage")
    Client.getInstance().removeEvent("busiPushPage")
    Client.getInstance().removeEvent("busiPushData")
  },
  /**
  /**
  /**
  /**
  /**
   * 用户主动取消
   */
  onCancel(){
    this._resetData()
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
    this.setData(({isConnect:true,isCalling:false,beCalling:false}))
    // setTimeout(() => {
    //   this.setData({
    //     isShowBusi:true,
    //     busiData:{
    //       url:"http://139.199.253.47:10080/client/mobile/index.html#/identity?busiData="+encodeURIComponent(JSON.stringify({list:15}))
    //     }
    //   })
    // }, 5000);
  },
  /**
   * 自己加入房间
   */
  onJoinRoom(){
    if(this.data.beCalling){
      this.setData(({isConnect:true,isCalling:false,beCalling:false}))
    }
  },
  /**
   * 挂断视频
   */
  onHangup(){
    this._resetData()
  },
  /**
   * 取消识别
   */
  onCancelCameraHandler(){
    this.setData({
      isShowBusi:true,
      isShowOcr:false,
      isCamera:true
    })
  },
  /**
   * 识别结果回调
   * @param {*} event 
   */
  onCameraResultHandler(event){
    let result = event.detail
    // log.info("ocr识别结果信息",result,typeof(result))
    console.log("result=",result,typeof(result))
    let data = this.data.busiData;
    if(this.data.mode==="BankCard"){
      data.url = data.url+"&bankCardData="+encodeURIComponent(JSON.stringify(result))
      console.log(data.url)
    }else{
      let newIdCarInfo =  Object.assign(this.data.idCardData, result)
      data.url = data.url+"&idCardData="+encodeURIComponent(JSON.stringify(newIdCarInfo))
      this.setData({idCardData:newIdCarInfo})
    }
    // log.info("ocr识别后重组的交易数据",data)
    this.setData({
      isShowBusi:true,
      isShowOcr:false,
      isCamera:true,
      busiData:data
    })
  },
  /**
   * 关闭话术
   */
  onCloseVerbal(){
    this.setData({
      verbalTips:''
    })
  },
  /**
   * 小程序跟webview绑定信息通信
   */
  onBindmessage(e){
    const { data } = e.detail;
    log.info("webview返回的信息",data)
    if (Array.isArray(data)) {
      this.setData({
        bridgeData:data
      })
      data.map(item=>{
        this._bridgeEvent(JSON.parse(item))
      })
    }
  },
  /**
   * H5推送过来的信息
   * @param {*} data 
   */
  _bridgeEvent(data){
    let busiData = this.data.busiData
    switch(data.header.action){
      case "BRIDGE_CLOSE_PAGE"://关闭交易界面
        wx.setNavigationBarTitle({title: '视频银行',})
        this.setData({isShowBusi:false})
        break
      case "BRIDGE_SEND_DATA"://发送数据
        this.setData({isShowBusi:true})
        busiData.content = data.payload
        this._sendMassage(busiData)
        break
      case "BRIDGE_SEND_CLOSE"://关闭界面并发送数据
        wx.setNavigationBarTitle({title: '视频银行',})
        this.setData({isShowBusi:false})
        busiData.content = data.payload
        this._sendMassage(busiData)
        break
      case "BRIDGE_SEND_BASE64"://上传base图片并发给坐席
        if(Array.isArray(data.payload)){
          data.payload.map((item)=>{
            Client.getInstance().request({
              method:"POST",
              url: '/api/v1/video/file/upload/image',
              data: {
                batchId: busiData.batchId,
                content: item.base64,
                name: (new Date()).getMilliseconds() + '.jpeg',
                type: item.type
              }
            }).then((result)=>{
              busiData.content = result.data
              this._sendMassage(busiData)
            }).catch((err)=>{
              log.error("上传图片失败",err)
            })
            
          })
        }
        break
      case "BRIDGE_OCR_IC"://银行卡识别
      this.setData({
        isShowBusi:false,
        isCamera:false
      },()=>{
        this.setData({
          isShowOcr:true,
          mode:"BankCard"
        })
      })
        break
      case "BRIDGE_OCR_ID"://身份证识别
        this.setData({
          isShowBusi:false,
          isCamera:false
        },()=>{
          setTimeout(()=>{
            this.setData({
              isShowOcr:true,
              mode:data.payload.mode
            })
          },1000)
        })
        break
      case "BRIDGE_BIOASSAY"://活体检测
        break
      case "BRIDGE_REQUEST"://请求数据
        Client.getInstance().request(data.payload).then((res)=>{
          let data = this.data.busiData;
          data.url = data.url+"?requstResult="+encodeURIComponent(JSON.stringify(res.data))
          this.setData({
            isShowBusi:true,
            busiData:data
          })
        }).catch((e)=>{
          log.error("请求失败",e)
        })
        break
    }
  },
  //给坐席推送结果消息
  _sendMassage(busiData){
    log.info("发送给坐席的信息",busiData)
    busiData.url = ""
    let result = {header: {type: "BUSI",action: "BUSI_PUSH_DATA"},payload: busiData}
    Client.getInstance().sendSystemMessage(busiData.agentId,result)
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
 //活体检测
 _faceLiveness(data){},
 //话术提示
 _verbalTips(data){
   this.setData({
    verbalTips:data.tips
   })
 },
 //关闭页面
 _busiClosePage(data){
   this.setData({isShowBusi:false})
 },
 //推送页面
 _busiPushPage(data){
 if(this.data.isShowBusi){
    this.setData({
      isShowBusi:false,
      busiData:''
    })
  }
  log.info("收到坐席推送过来页面的信息",data)
  if (typeof(data)=='string') {
    let objData = JSON.parse(data)
    objData.url = objData.url+"?busiData="+encodeURIComponent(data)
    this.setData({
      isShowBusi:true,
      busiData:objData
    })
  }else {
    data.url = data.url+"?busiData="+encodeURIComponent(JSON.stringify(data))
    this.setData({
      isShowBusi:true,
      busiData:data
    })
  }
 },
 //推送数据
 _busiPushData(data){
  log.info("收到坐席推送过来的信息-不带页面",data)
  let newBusiData = this.data.busiData
  let index = newBusiData.url.indexOf("&addData=")
  if (index>0) {
    newBusiData.url = newBusiData.url.substring(0,index)
  }
  if (typeof(data)=='string') {
    newBusiData.url = newBusiData.url+"&addData="+encodeURIComponent(data)
  }else {
    newBusiData.url = newBusiData.url+"&addData="+encodeURIComponent(JSON.stringify(data))
  }
  this.setData({
    isShowBusi:true,
    busiData:newBusiData
  })
 },
 //重置数据
_resetData() {
  this.setData({
    beCalling: false,
    isCalling: false,
    isConnect: false, // 通话中的标记复位
    userlist: []
  },()=>{
    wx.navigateBack(1)
  })
},
})