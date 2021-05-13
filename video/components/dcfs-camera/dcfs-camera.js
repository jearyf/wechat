// components/dcfs-camera/dcfs-camera.js
import Adapter from '../../ocr/ocrAdapter'
import {deepMerge} from '../../util'
import log from '../../log/index'
const app =wx.getSystemInfoSync();
Component({
  /**
   * 组件的属性列表1
   */
  properties: {
    mode:{
      type:String,
      value: "IDCardFront" //IDCard:识别完正面自动到反面  IDCardBack:身份证反面  IDCardFront:身份证正面  BankCard:银行卡
    },
    batchId:{
      type:String,
      value:new Date().getTime()+""
    },
    agentId:{
      type:String,
      value:""
    },
    cancel: {
      type: Function,
      value: function(){}
    },
    affirm:{
      type: Function,
      value: function () { }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    isShowCamera:true,//是否显示拍照界面
    isIDFront:false,
    isIDBack:false,
    isBankCard:false,
    isCrop:false,//是否显示剪切画面
    idCardInfo:{},//mode为：IDCard临时储存临时身份证识别信息
    photoPath:"",
    screenSize:{
      width:wx.getSystemInfoSync().windowWidth,
      height:wx.getSystemInfoSync().windowHeight
    },
    crop:{//设置剪切区域大小s
      x: app.width * 0.05,
      y: app.height * 0.2,
      width: app.width * 0.92,
      height: app.height * 0.4
    }
  },
  attached: function () {
    this.setTakeMode()
    this.setTakeMaskDistrict()
    
  },
  /**
   * 组件的方法列表
   */
  methods: {
    onCameraError:function(){
      
    },
    //拍摄照片
    onTakePhoto:function(){
      wx.showLoading({
        title: '数据处理中...',
        icon: 'loading'
      })
      const ctx = wx.createCameraContext()
      ctx.takePhoto({
        quality: 'high',
        success: (res) => {
          this.cropToImages(res.tempImagePath);
        },
        fail:(e)=>{
          log.error("拍照拿取图片失败",e)
          wx.hideLoading()
        }
      })
    },
    //剪切照片
    cropToImages: function (path) {
      this.canvas = wx.createCanvasContext("image-canvas", this)
      //过渡页面中，图片的路径坐标和大小
      this.canvas.drawImage(path, 0, 0, this.data.screenSize.width, this.data.screenSize.height)
      this.canvas.draw(false, ()=>{
        wx.canvasToTempFilePath({ //裁剪对参数
          canvasId: "image-canvas",
          quality:1,
          x: this.data.crop.x, //画布x轴起点
          y: this.data.crop.y, //画布y轴起点
          width: this.data.crop.width, //画布宽度
          height: this.data.crop.height, //画布高度
          destWidth: this.data.crop.width*1.5, //输出图片宽度
          destHeight: this.data.crop.height*1.5, //输出图片高度
          fileType:"jpg",
          success: (res) => {
            wx.hideLoading()
            this.setData({
              photoPath: res.tempFilePath,
              isShowCamera:false,
              isCrop:true
            })
          },
          fail: (e) => {
            log.error("canvas转文件失败",e)
            wx.hideLoading()
          }
        },this)
      })
    },
    //设置拍摄类型
    setTakeMode: function () {
      if (this.data.mode == "IDCard") {
        //身份证正反面同事识别
        this.setData({
          isIDFront: true
        })
      }else if (this.data.mode == "IDCardFront") {
        //身份证正面
        this.setData({
          isIDFront: true
        })
      } else if (this.data.mode == "IDCardBack") {
        //身份证反面
        this.setData({
          isIDBack: true,
        })
      } else if (this.data.mode == "BankCard") {
        //身份证反面
        this.setData({
          isBankCard: true,
        })
      }
    },
    //设置拍摄区域大小
    setTakeMaskDistrict: function () {
      let totalTopHeight = (wx.getMenuButtonBoundingClientRect().bottom + wx.getMenuButtonBoundingClientRect().top) - (wx.getSystemInfoSync().statusBarHeight)
      let width = this.data.screenSize.width
      let height = this.data.screenSize.height
      let takeWidth = width
      let takeHeight = width*0.6
      let x = 10
      let y = (height-takeHeight)/3
      this.setData({
        crop: {//设置剪切区域大小
          x: x,
          y: y,
          width: takeWidth-10,
          height: takeHeight
        }
      })
      log.info("剪切位置信息",this.data.crop)
    },
    //确定按钮
    onConfirm:function(){
      let path = this.data.photoPath
      wx.showLoading({
        title:"识别中..."
      })
      wx.compressImage({
        src: path,
        quality:50,
        success: (ress)=>{
          wx.getFileSystemManager().readFile({
            filePath: ress.tempFilePath,
            encoding: 'base64',
            success: (res) => {
              this.ocrDiscern(res.data)
            },
            fail: (errMsg) => {
              log.error("文件转base64错误", errMsg)
            }
          })
        }
      })
    },
    //取消按钮
    onCancel: function (event){
      if (this.data.isShowCamera){//取消拍摄照片
        this.triggerEvent("cancel")
      } else {//重新拍摄照片
        this.setData({
          isShowCamera:true,
          photoPath:'',
          isCrop:false
        })
      }
    },
    //ocr识别
    ocrDiscern:function(base64){
      log.info("发送请求")
      //上传参数
      let params = {content: base64,batchId: this.data.batchId,name:  "",type: "", view: true}
      //结果
      let result = {}
      if (this.data.isIDFront) {
        //上传身份真面
        params.name = (new Date()).getMilliseconds()+"icfront.jpg",
        params.type = "1"
        Adapter.uploadBase64(params).then((res)=>{
          log.info("上传身份证正面返回结果",res.data)
          result.identityFront = res.data.data;
          // result.identityFront.base64 = base64
          Adapter.ocrIdCard("FRONT",res.data.data.viewUrl).then((res)=>{
            log.info("识别身份证正面成功",result)
            //上传省份证上头像
            if(result&&res.data.status==="000000"){
              if(res.data.front){
                result = deepMerge(result,res.data.front)
                params.content = res.data.front.photo
                params.type = "5"
                params.name = (new Date()).getMilliseconds()+"head.jpg"
                Adapter.uploadBase64(params).then((res)=>{
                  wx.hideLoading()
                  log.info("上传身份证头像成功",res.data)
                  result.headImg = res.data.data;
                  result.photo = ""
                  this.handlerResult(result)
                }).catch((err) => {
                  // wx.hideLoading()
                  wx.showToast({
                    title: '上传头像图片失败',
                    icon:"none"
                  })
                  log.error("上传头像图片失败",err)
                })
              } else {
                wx.showToast({
                  title: '识别身份证正面失败',
                  icon:"none"
                })
              }
            }else{
              // wx.hideLoading()
              wx.showToast({
                title: '识别身份证正面失败',
                icon:"none"
              })
              log.error("识别身份证正面失败",res.data)
            }
          }).catch((err) => {
            wx.hideLoading()
            wx.showToast({
              title: '识别身份证正面失败',
              icon:"none"
            })
            // wx.hideLoading()
            log.error("识别身份证正面失败",err)
          })
        }).catch((err) => {
          wx.hideLoading()
          log.error("上传正面图片失败",err)
          wx.showToast({
            title: '上传正面图片失败',
            icon:"none"
          })
        })
      } else if (this.data.isIDBack) {
          //上传省份证背面
          params.name = (new Date()).getMilliseconds()+"icback.jpg",
          params.type = "2"
          Adapter.uploadBase64(params).then((res) => {
            log.info("上传身份证反面成功",res.data)
            result.identityReverse = res.data.data;
            // result.identityReverse.base64 = base64
            Adapter.ocrIdCard("BACK",res.data.data.viewUrl).then((res)=>{
              wx.hideLoading()
              if(result,res.data.status==="000000"){
                log.info("识别身份证反面成功",res.data)
                result = deepMerge(result,res.data.back)
                this.handlerResult(result)
              }else{
                wx.showToast({
                  title: '识别身份证反面失败',
                  icon:"none"
                })
                log.error("识别身份证反面失败",res.data)
              }
            }).catch((err) => {
              wx.hideLoading()
              wx.showToast({
                title: '识别反面失败',
                icon:"none"
              })
              log.error("识别反面失败",err)
            })
          }).catch((err) => {
            wx.hideLoading()
            wx.showToast({
              title: '上传反面图片失败',
              icon:"none"
            })
            log.error("上传反面图片失败",err)
          })
      } else if (this.data.isBankCard) {
        params.name = (new Date()).getMilliseconds()+"bank.jpg",
        params.type = "7"
        Adapter.uploadBase64(params).then((res) => {
          log.info("上传银行卡成功",res.data)
          result.bankImgUrl = res.data.data
          // result.bankImgUrl.base64 = base64
          Adapter.ocrBankCard(res.data.data.viewUrl).then((res)=>{
            wx.hideLoading()
            if(result,res.data.status==="000000"){
              result = deepMerge(result,res.data)
              log.info("识别银行卡成功",res.data)
              this.handlerResult(result)
            }else{
              wx.showToast({
                title: '识别银行卡失败status='+res.data.status,
                icon:"none"
              })
              log.error("识别银行卡失败",res.data)
            }
          }).catch((err) => {
            log.error("银行卡识别失败",err)
            wx.hideLoading()
          })
        }).catch((err) => {
          log.error("上传银行卡图片失败",err)
          wx.hideLoading()
        })
      }else{
        wx.hideLoading()
      }
    },
    //识别结果返回
    handlerResult(result){
      if(this.data.mode==="IDCard"){
        let idCardInfo = {}
        //身份证正反面连续识别
        if(this.data.isIDFront){
          //如果是正面识别完了就开始识别反面
          idCardInfo = deepMerge(idCardInfo,result)
          this.setData({
            isShowCamera:true,
            photoPath:'',
            isIDFront:false,
            isIDBack:true,
            isCrop:false,
            idCardInfo:idCardInfo
          })
        }else if(this.data.isIDBack){
          //反面识别完成就直接返回结果
          idCardInfo = deepMerge(this.data.idCardInfo,result)
          log.info("身份证识别结果mode="+this.data.mode,idCardInfo)
          this.triggerEvent("affirm", idCardInfo)
        }
      }else{
        //其他直接返回结果
        log.info("识别结果mode="+this.data.mode,result)
        this.triggerEvent("affirm", result)
      }
    }
  }
})
