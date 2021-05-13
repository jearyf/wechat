export default {
  // ---------- 公共参数区 ----------
  debug:true,
  // SDK使用模式：1-客户使用，2-座席使用
  useMode: 1,
  // 渠道：1-移动外派, 2-智能柜台,3-行员APP,4-手机银行,5-微信公众号,6-微信小程序,7-座席
  channelType: 6,
  // 渠道设备: 1-web端,2-安卓端,3-ios端,4-微信小程序端
  terminalType: 4,
  // 默认交易码
  defaultTransCode: 'V00001',
  // 默认交易名称
  defaultTransName: '业务咨询',
  // 等待超时配置用户主呼方呼叫后根据以下两个参数设定是否需要有超时提示(提醒用户)
  // 等待超时标识，1-不超时，2-自定义
  waitRemindFlag: 2,
  // 等待超时时间，单位：秒
  waitRemindTimeout: 90,
  // 等待超时配置用户主呼方呼叫后根据以下两个参数设定是否需要有超时提示
  // 等待超时标识，1-不超时，2-自定义
  waitFlag: 2,
  // 等待超时时间，单位：秒
  waitTimeout: 90,
  // 主呼方发出呼叫邀请后，在指定的时间内如果未获取到服务端返回的结果通知则主呼方产生超时挂断事件
  // 呼叫超时标识，1-不超时，2-自定义
  callFlag: 2,
  // 呼叫超时时间，单位：秒
  callTimeout: 60,
  // 主呼方接收到服务端的结果通知并向对方发出邀请，对方在指定的时间内未回应(接通、拒绝、繁忙)消息，则产生已分配超时挂断事件
  // 音视频连接超时标识，1-不超时，2-自定义
  connectFlag:2,
  // 音视频连接超时时间，单位：秒
  connectTimeout:10,
  // 服务URL配置
  server: {
    config: {
      // 服务调用异常时重试次数
      retry: 3,
      // 重试时间间隔，单位：秒
      retryInternal: 3,
      timeout: 60000,
      // dev
    //  baseURL: 'https://svbtest.ghbank.com.cn:9082/vs'
    //uat
    //  baseURL: 'https://svbtest.ghbank.com.cn/vs'
    //prod
      baseURL: 'https://svb.ghbank.com.cn/vs'
      
      //baseURL: 'https://smartbank.video/dev/vs'
      // baseURL: 'https://callcenter.hhbank.com:9999/vs'
      // baseURL: 'http://139.199.253.47:10080/vs'
      // baseURL: 'https://tvideo.hhbank.mobi:10081/vs', //测试环境
      // baseURL: 'http://10.1.13.161:8080/vs'
    },
    // 获取参数服务URL
    paramUrl: '/api/v1/video/bps/params/sdk',
    // 呼叫URL
    callUrl: '/api/v1/video/call',
    // 取消URL
    cancelUrl: '/api/v1/video/call/hangup',
    // 拒绝URL
    rejectUrl: '/api/v1/video/call/refuse',
    // 接听
    answerUrl: '/api/v1/video/call/connected',
    // 挂断
    hangupUrl: '/api/v1/video/call/end',
    // 邀请
    inviteUrl: '/api/v1/video/call/invite',
    // 转接
    transferUrl: '/api/v1/video/call/transfer',
    //刷新token
    refreshToken:'/api/v1/video/tokens/refresh',
    //根据交易码查询交易参数详情
    transParamsUrl: '/api/v1/video/trans/params',
    secondAccountsCommitUrl: '/api/v1/video/trans/second-accounts'
  },
  appConfig: {
    appKey: 'dGVzdC1pZDI=',//d2NoYXQ= 
 
    appSecret: '1cab0e270f3743e1872b85420f7f3893'
    // appSecret: '7f72cf29d1c5'
  },

  // ---------- IM参数区 ----------
  im: {
    // 是否开启debug模式
    debug: true,
    // 音视频平台的应用账号
    //dev
    // appKey: 'c3bb57a7bab993d93728d63106cffa49',
    // appSecret: '7f72cf29d1c5',

    //uat
    // appKey: '459f2fef1acd1455b23d2e46bf3e8ec5',
    // appSecret: '475c2c911e06',
    //prod
    appKey: 'a940517043f5cf480e6e6575f898a828',
    appSecret: '5f16cb9e6ea5',

    token:"360e33fa47ee062781d8c727b4de7c1c",
    account:"18700000001",
    // 私有化部署所需的配置，可通过管理后台配置并下载相应的js文件，将相应内容引入配置
  
  
     //prod
    privateConf:{"lbs_web": "https://svb.ghbank.com.cn:2443/lbs/webconf.jsp","link_web": "https://svb.ghbank.com.cn:2443","link_ssl_web": true,"nos_uploader_web": "https://svb.ghbank.com.cn:2443","https_enabled": true,"nos_downloader": "svb.ghbank.com.cn:2443/{bucket}/{object}","nos_accelerate": "","nos_accelerate_host": "","nt_server": "","kibana_server": "https://svb.ghbank.com.cn:38781/statistic/realtime/sdkinfo","statistic_server": "https://svbt.ghbank.com.cn:38781/statistic/realtime/sdkFunctioninfo","report_global_server": "https://svb.ghbank.com.cn:38781/statics/report/realtime/global"}
    // //dev
    // privateConf:{"lbs_web": "https://svbtest.ghbank.com.cn:2443/lbs/webconf.jsp","link_web": "https://svbtest.ghbank.com.cn:2443","link_ssl_web": true,"nos_uploader_web": "https://svbtest.ghbank.com.cn:2443","https_enabled": true,"nos_downloader": "svbtest.ghbank.com.cn:2443/{bucket}/{object}","nos_accelerate": "","nos_accelerate_host": "","nt_server": "","kibana_server": "https://svbtest.ghbank.com.cn:38781/statistic/realtime/sdkinfo","statistic_server": "https://svbtest.ghbank.com.cn:38781/statistic/realtime/sdkFunctioninfo","report_global_server": "https://svbtest.ghbank.com.cn:38781/statics/report/realtime/global"}

   
  },

  // ---------- 音视频参数区 ----------
  netCall: {
    // 是否开启debug模式
    debug: true,
    // 传输的视频分辨率
    // 480x320:0,(Netcall.CHAT_VIDEO_QUALITY_NORMAL)
    // 176x144:1,(Netcall.CHAT_VIDEO_QUALITY_LOW)
    // 352x288:2,(Netcall.CHAT_VIDEO_QUALITY_MEDIUM)
    // 480x320:3,(Netcall.CHAT_VIDEO_QUALITY_HIGH)
    // 640x480:4,(Netcall.CHAT_VIDEO_QUALITY_480P)
    // 960x540:5,(Netcall.CHAT_VIDEO_QUALITY_540P)
    // 1080x720:6,(Netcall.CHAT_VIDEO_QUALITY_720P)
    // 1920x1080:7,(Netcall.CHAT_VIDEO_QUALITY_1080P)
    videoQuality: 6,
    // 视频通话帧率，实际帧率因画面采集频率和机器性能限制可能达不到期望值
    // 15帧:0,(Netcall.CHAT_VIDEO_FRAME_RATE_NORMAL)
    // 5帧: 1,(Netcall.CHAT_VIDEO_FRAME_RATE_5)
    // 10帧: 2,(Netcall.CHAT_VIDEO_FRAME_RATE_10)
    // 15帧: 3, (Netcall.CHAT_VIDEO_FRAME_RATE_15)
    // 20帧: 4, (Netcall.CHAT_VIDEO_FRAME_RATE_20)
    // 25帧: 5, (Netcall.CHAT_VIDEO_FRAME_RATE_25)
    videoFrameRate: 5,
    // 高清语音开关, false-关闭，true-打开
    highAudio: false,
    // 视频录制开关, 默认关闭
    recordVideo: true,
    // 音频录制开关, 默认关闭
    recordAudio: true,
    // 录制模式，0 表示参与混合录制并且录制单人文件，1 表示只参与混合录制，2 表示只录制单人文件，默认 0
    recordType: 0,
    // 是否是主讲人
    isHostSpeaker: true
  },

  // 互动白板配置
  whiteBoard: {
    // 服务端白板录制开关
    record: true
  }
}
