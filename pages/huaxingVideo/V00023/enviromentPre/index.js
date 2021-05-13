// index.js
// 获取应用实例
const app = getApp()
import Client from '../../../../video/index.js'
Page({
  data: {
    billId:'',
    sessionInfo:null,
    setNet:"",
    setCam:false,
    setRec:false,
    showbut:true,
    networkType:'',
    customItem: '全部',
    NetworkType:'',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: false,
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName') // 如需尝试获取用户信息可改为false
  },
  // 事件处理函数
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  //进入页面时-
  onLoad(options) {
    this.setData({sessionInfo: JSON.parse(options.sessionInfo)})
    this.setData({billId: this.data.sessionInfo.billId})
    console.log('检测页面的',this.data.billId)
    this.getUserProfile()
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    //自动检测权限
    this.redetectEnviroment()
    // this.redetectEnviroment()
  },
  onReady: function () {
    
  },
  onShow: function() {
    wx.hideHomeButton()
    },
  // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
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
  bindSpeedChange: function (e) {
    console.log('picker发送选择改变，携带值为', e.detail.value)
    this.setData({
      //arrayMul: e.detail.value.value
      speedStatus : this.data.arrayMul[0][e.detail.value[0]],
      voiceType : this.data.arrayMul[1][e.detail.value[1]]
    })
  },
  //双录检测
  redetectEnviroment: function(){
    // console.log('picker发送选择改变，携带值为')
    var self = this
    //网络状态
    wx.getNetworkType({
      success (res) {
        self.setData({
          NetworkType:res.networkType
        })
        console.log('网络状态',res)
        if (res.networkType == 'none' || res.networkType == '2g') {
             self.setData({setNet:false})
        } else{
          self.setData({setNet:true})
        }
      }
    })
    //权限设置 
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.camera']==true) {
          self.setData({setCam:true})
        }else{   
          wx.authorize({
            scope:'scope.camera',
            success () {
              self.setData({setCam:true})
            },fail(){
              self.setData({setCam:false})
            }
          })
        }
        if (res.authSetting['scope.record']!==true) {
          wx.authorize({
            scope:'scope.record',
            success () {
              self.setData({setRec:true})
            },fail(){
              self.setData({setRec:false})
            }
          })
        }else{   
          self.setData({setRec:true})
        }
      },fail(res){
        // self.redetectEnviroment()
        console.log("设置失败")
      }
    })
  },
  //二次检测
  openConfirm: function () {
    var self=this
    if(this.data.setCam==false||this.data.setRec==false){
      var self=this
      wx.showModal({
        content: '检测到您有权限未打开，是否去设置打开？',
        confirmText: "确认",
        cancelText: "取消",
        success: function (res) {
          console.log(res);
          //点击“确认”时打开设置页面
          if (res.confirm) {
            console.log('用户点击确认')
            wx.openSetting({
                success: (res) => { 
                self.redetectEnviroment()
                }
              })
            } else {
              console.log('用户点击取消')
            }
          }
        });
    }else{
     this.redetectEnviroment()
    }
  },
//登录网易并呼叫
  loginIm:function(){
    var self=this
    wx.showToast({
      title: 'loading...',
      icon: 'loading',
      mask: true,
      duration: 3000
     });
    if(this.data.setCam==false || this.data.setRec==false || this.data.setNet==false){
      wx.showToast({
        title: '未满足开启条件，请重新检测',
        icon: 'none',
        duration: 1000
      })
    }else{
        let options = {
          caller: '18700000001',
          customerId: '18700000001',
          customerName: '李四',
          mobile: '18700000001',
          customerOrgId: ""
        }
        Client.getInstance().login(options).then(async(reult) => {
        //  var tokenValue = wx.getStorageSync('tokenValue')
        //  console.log('token',tokenValue)
        let sessionInfo = {
          transCode: "V05001",
          transName: "交易名称",
          callerName:"李四",
          sessionType:2,
          robot:2,
          // billId:"202104250060"
          billId:self.data.billId
         }
         //跳转双录页面
          await wx.redirectTo({
            url: '../willingnessVeriffication/index?sessionInfo='+JSON.stringify(sessionInfo),
            events: {
              // 为指定事件添加一个监听器，获取被打开页面传送到当前页面的数据
              acceptDataFromOpenedPage: function(data) {
                console.log('123111111',data)
              },
              someEvent: function(data) {
                console.log(data)
              }
          
            },
          })
        }).catch((err) => {
        console.error("登录失败",err)
        wx.showModal({
          title: '提示',
          content: '登陆失败',
          success: function (res) {
            if (res.confirm) {//这里是点击了确定以后
              console.log('用户点击确定')
            } else {//这里是点击了取消以后
              var pages = getCurrentPages();
              var beforePage = pages[pages.length - 2];
              beforePage.onLoad(beforePage.options);
              wx.navigateBack({
                delta: 1,
              })   
            }
          }
        })
        })
    }
  },
})
