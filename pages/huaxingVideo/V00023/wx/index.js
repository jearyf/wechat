// pages/huaxingVideo/V00023/wx/index.js
const app = getApp()
import Client from '../../../../video/index.js'
Page({

  /**
   * 页面的初始数据
   */
  data: {
    isFocus: false,
    disabled:true,
    username: '',
    result:'',
    consequence:'',
    idNum:'',
    idName:'',
    BizToken: '',
    billId:'',
    QRParams:{
     scene:''
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var self=this
    var obj = wx.getLaunchOptionsSync()
    console.log('初始化的值',obj.query.scene)
    //
      // scene 需要使用 decodeURIComponent 才能获取到生成二维码时传入的 scene
      this.setData({
        'QRParams.scene':obj.query.scene ? decodeURIComponent(obj.query.scene) : null
      })
      console.log(!self.data.QRParams.scene)
      if (self.data.QRParams.scene) {
        var AbillId=self.data.QRParams.scene.split('_')
        var billId=AbillId[1]
        console.log(AbillId)
        if(billId){
          self.setData({billId:billId}) 
          console.log(this.data.billId)
        }else{
          self.scanCode()
        }
      }else{
        self.scanCode()
      }
    //
    console.log(obj)
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },
  /**
   * 生命周期函数--监听页面隐藏
   */
  // onHide: function () {
  //   wx.showModal({
  //     title: '提示',
  //     content: '登陆失败',
  //     success: function (res) {
  //       if (res.confirm) {//这里是点击了确定以后
  //         console.log('用户点击确定')
  //       } else {//这里是点击了取消以后
  //         var pages = getCurrentPages();
  //         var beforePage = pages[pages.length - 2];
  //         beforePage.onLoad(beforePage.options);
  //         wx.navigateBack({
  //           delta: 1,
  //         })   
  //       }
  //     }
  //   })
  // },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },
  //新的
  onFocus: function (e) {
    var that = this;
    that.setData({ isFocus: true });
  },
  setValue: function (e) {
    var that = this;
    that.setData({ username: e.detail.value });
  },

  //旧的
  // usernameInput: function (e) {
  //   this.setData({
  //     username: e.detail.value
  //   })
  // },
  getUserProfile() {
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  //扫码
  scanCode() {
    // 调起扫描功能
    var self=this
    wx.scanCode({
      onlyFromCamera: true,
    }).then(res => {
      console.log('扫码的',res);
      if (res.scanType == 'WX_CODE') {
        self.setData({
          'QRParams.scene' : self.getUrlParam(res.path, 'scene')
        })
        console.log(self.data.QRParams.scene)
        var AbillId=self.data.QRParams.scene.split('_')
        console.log(AbillId)
        var billId=AbillId[1]
        if(billId){
          self.setData({billId:billId})
        }
        console.log(self.data.billId)
        console.log(self.data.QRParams.scene)
        if (!res.path && !this.data.QRParams.scene) {
          self.$client.alert('小程序码无效，参数错误') // 可能是二维码生成环境与小程序环境不一致
          return
        }
      } else {
        self.$client.alert('小程序码无效')
      }
      self.isScanning = false;
    }).catch(err => {
      self.isScanning = false;
      console.log(err)
    })
  },
  //
  //通过正则匹配获取当前页面的url中的参数
  getUrlParam(url, key) {
    var reg = new RegExp("[?&]" + key + "=([^&]+)", "gmi");
    if (reg.test(url)) return RegExp.$1;
    return "";
  },
//验证后六位
  sure: function () {
    wx.showToast({
      title: 'loading...',
      icon: 'loading',
      mask: true,
      duration: 2000
     });
    console.log(this.data.username)
    if (!/\d{5}[\d|X]|\d{6} /.test(this.data.username)) {
      wx.showToast({
        title: '输入不正确，请重新输入',
        icon: 'none',
        duration: 2000
      })
    } else {
      this.getlastSix()
    }
  },

  //请求后六位验证
  getlastSix: function () {
    var self=this
    let data={
      'billId': this.data.billId,
      'lastSix': this.data.username,
    }
    console.log('开始调用后六位验证',data)
    wx.request({
      //pro
      url: 'https://svb.ghbank.com.cn/vs/api/v1/video/trans/corporation/checkid/lastSixCheck',
      //dev
      // url: 'https://svbtest.ghbank.com.cn:9082/vs/api/v1/video/trans/corporation/checkid/lastSixCheck',
      //uat
      // url: 'https://svbtest.ghbank.com.cn/vs/api/v1/video/trans/corporation/checkid/lastSixCheck',
      method: 'GET', 
      data,
      header: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      success(res){
        var reject=res.data.result
          // console.log(reject)
          if(reject){
            var result=reject.split('+')
            if(result.length>1){
                  var consequence=result[0]
                  var idNum=result[1]
                  var idName=result[2]
                  self.setData({consequence:consequence})
                  self.setData({idNum:idNum})
                  self.setData({idName:idName})
            }
          }
        //  console.log(this.data.idName,this.data.idNum,this.data.consequence)
          if (self.data.consequence == 'pass') {
            self.getbiztoken()
            
          } else {
            wx.showToast({
              title: '验证失败，请重新验证',
              icon: 'none',
              duration: 2000
            })
          }
      },fail(err){
        console.log(err)
      } 
    })
  },

  //获取token0
  getbiztoken: async function () {
    console.log('开始获取token')
    let { body } = await wx.rpc('ATS53029', {
      type: 'K',
      RuleId: 1,
      IdCard:this.data.idNum,
      Name:this.data.idName,
      channelCode: 'WMP',
      operation: '1',
      subCode: 'WMP_002',
    });
    const BizToken = body.BizToken;
    this.setData({ BizToken: BizToken })
    this.getVerify()
  },
  //人脸核身
  getVerify: function () {
    console.log('开始调用人脸核身')
    var self=this
    wx.startVerify({
      data: {
        token: self.data.BizToken,
        isCheckId: false
      },
      success: (res) => {
        console.log('人脸核身', res)
        self.getATS53030Res();
      }, fail(err) {
        console.log(err)
        self.geterr()
      }
    })
  },
  //获取图片人脸
  getATS53030Res: async function () {
    var self=this
    let ATS53030Res = await wx.rpc('ATS53030', {
      type: 'K',
      RuleId: 1,
      BizToken: self.data.BizToken
    });
    let DetectInfo = JSON.parse(ATS53030Res.body.DetectInfo);
    console.log(DetectInfo)
    self.getverifyPic(DetectInfo)
  },
  //进行比对特征
  getverifyPic: function (a) {
    var self=this
    wx.request({
      //pro
      url: 'https://svb.ghbank.com.cn/vs/api/v1/video/esb/biometric/verifyPic',
      //dev
      // url: 'https://svbtest.ghbank.com.cn:9082/vs/api/v1/video/esb/biometric/verifyPic',
      //uat
      // url: 'https://svbtest.ghbank.com.cn/vs/api/v1/video/esb/biometric/verifyPic',
      method: 'post', 
      data: {
        //证件号
        'certNum': a.Text.OcrIdCard,
        'engiCd': 'cyface',
        'examineShineTyp': '1',
        'idenTypCd': '0200',
        'intfcCd': 'checkPerson',
        'IpOrgCd': '1111',
        //人脸识别图片
        'pendAuthDoc1': a.BestFrame.BestFrame,
        'ptyName':a.Text.OcrName,
        'zjjylxdm': '0602',
      },
      header: {
        'token':self.data.BizToken,
        'content-type': 'application/x-www-form-urlencoded'
      },
      success (res) {
        console.log('比对特征成功', res)
        let sessionInfo = {
          billId:self.data.billId
         }
         //跳转检测页面
        wx.redirectTo({
          url: '../enviromentPre/index?sessionInfo='+JSON.stringify(sessionInfo),
          success: function (res) {
            console.log('进入成功跳转',res)
          }, fail(err) {
            console.log(err)
          }
        })
      },fail(err){
        console.log(err)
      } 
    })
  },
  //失败跳转
  geterr: function () {
    wx.redirectTo({
      url: '../errmasge/index',
    })
  }
})