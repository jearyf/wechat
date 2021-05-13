import log from '../../log/index'
import OcrAdapter from '../../ocr/ocrAdapter'
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    idCardName:{
      type:String,
      value:""
    },
    idCardNumber:{
      type:String,
      value:""
    },
    living: {
      type: Function,
      value: function(){}
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    isRecording:false,
    downNum:5,
    randomToken:{}//获取随机码对象
  },
  lifetimes:{
    attached(){
      this.getRandomNumber()
    },
    detached(){
      if(this.startTimerout){
        clearInterval(this.startTimerout)
        this.startTimerout = null
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onCameraError(e){
      console.error(">>>>>>>",e)
    },
    onInitDone(e){
      console.log(">>>>>>>",e)
    },
    //录制
    onRecord(){
      this.setData({isRecording:true})
      //录制中  就停止
      // if(this.data.isRecording){
      //   clearInterval(this.startTimerout)
      //   this.setData({isRecording:false,downNum:5})
      //   this.stopRecord()
      // }else{
      wx.showLoading({
        title: '加载中。。。',
        mask: true
      })
      let downNum = this.data.downNum
      //开始录制
      this.startTimerout = setInterval(()=>{
        //倒计时结束 停止录制
        if(this.data.downNum < 2){
          this.setData({downNum:0},()=>{
            this.setData({isRecording:false,downNum:5})
            this.stopRecord()
          })
          clearInterval(this.startTimerout)
          this.startTimerout = null 
        }else{
          this.setData({downNum:downNum--})
        }
      },1000)
      setTimeout(() => {
        this.setData({isRecording:true},()=>{
          wx.hideLoading()
        })
        this.startRecord()
      }, 1000);
      // }
        
    },
    //开始录制
    startRecord(){
      this.cameraContext = wx.createCameraContext()
      this.cameraContext.startRecord()
    },
    //停止录制
    stopRecord(){
      wx.showLoading({
        title: '视频生成中。。。',
        mask: true
      })
      this.cameraContext.stopRecord({
        compressed:true,
        success:(res)=>{
          wx.hideLoading()
          this.uploadVideo(res.tempVideoPath)
        },
        fail:(err)=>{
          this.setData({isRecording:false})
          wx.hideLoading()
          log.error("录制文件失败",err)
        }
      })
    },
    getRandomNumber(){
      wx.showLoading({
        title: '获取参数',
        mask: true
      })
      OcrAdapter.getLivingRandomToken().then((res)=>{
        wx.hideLoading()
        this.setData({
          randomToken:res.data
        })
      }).catch((err)=>{
        wx.hideLoading()
        log.error("获取数字失败",err)
      })
    },
    //上传文件
    uploadVideo(path){
      console.log(path)
      wx.showLoading({
        title: '检测中....',
        mask: true
      })
      let formData = Object.assign({
        idCardName:this.data.idCardName,
        idCardNumber:this.data.idCardNumber
      },this.data.randomToken)
      OcrAdapter.livingVerify(path,formData).then((result)=>{
        wx.hideLoading()
        if(result.statusCode===200){
          //检测成功
          console.log(result)
          var data = JSON.parse(result.data)
          if(data.status==="000000"){
            this.triggerEvent("living",result.data)
          }else{
            this.triggerEvent("living",result.data)
          }
        }else{
          this.setData({isRecording:false})
          log.error("识别服务器异常",result)
        }
      }).catch((err)=>{
        wx.hideLoading()
        this.setData({isRecording:false})
        log.error("上传文件失败",err)
      })
    }
  }
})
