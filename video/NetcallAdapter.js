import NIM from './libs/NIM_Web_NIM_miniapp_v8.2.0.js'
import Netcall from './libs/NIM_Web_Netcall_miniapp_v8.2.0.js'
import EventEmitter from './events/index'
import log from './log/index'
import NetcallEvent from './NetcallEvent'
NIM.use(Netcall)
/**
 * 网易IM适配器
 *
 * @class NetCallAdapter
 * @extends EventEmitter
 * @since 1.0.0
 * @author jiazw
 * @author heclb
 * {@link https://dev.yunxin.163.com/docs/product/IM即时通讯/SDK开发集成/Web开发集成|网易IM即时通讯}
 */
export default class NetCallAdapter extends EventEmitter {
  /**
   * 构造函数
   *
   * @constructs
   * @param {Object} options 参数配置
   */
  constructor (options) {
    super()
    this.options = options
    this.netcall = Netcall.getInstance({
      debug: options.debug,
      kickLast: options.kickLast || false,
      mirror: options.mirror == null ? true : options.mirror,
      mirrorRemote: options.mirrorRemote || false,
      container: options.container,
      remoteContainer: options.remoteContainer,
      chromeId: options.chromeId,
      nim: options.nim
    })
    this._initConstant()
    this._bindNetcallEvent()
  }

  /**
   * 获取音视频适配器单例对象
   *
   * @param {Object} options 参数配置
   * @returns {NetCallAdapter} 音视频适配器
   */
  static getInstance (options) {
    if (!this.instance) {
      this.instance = new NetCallAdapter(options)
    }
    return this.instance
  }

  /**
   * 销毁音视频适配器对象
   */
  static destroy () {
    this.instance = null
  }

  /**
   * 初始化常量
   */
  _initConstant () {
    this.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_ON = this.netcall.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_ON
    this.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_OFF = this.netcall.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_OFF
    this.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_ON = this.netcall.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_ON
    this.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_OFF = this.netcall.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_OFF
    this.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO = this.netcall.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO
    this.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO_AGREE = this.netcall.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO_AGREE
    this.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO_REJECT = this.netcall.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO_REJECT
    this.NETCALL_CONTROL_COMMAND_SWITCH_VIDEO_TO_AUDIO = this.netcall.NETCALL_CONTROL_COMMAND_SWITCH_VIDEO_TO_AUDIO
    this.NETCALL_CONTROL_COMMAND_BUSY = this.netcall.NETCALL_CONTROL_COMMAND_BUSY
    this.NETCALL_CONTROL_COMMAND_SELF_CAMERA_INVALID = this.netcall.NETCALL_CONTROL_COMMAND_SELF_CAMERA_INVALID
    this.NETCALL_CONTROL_COMMAND_START_NOTIFY_RECEIVED = this.netcall.NETCALL_CONTROL_COMMAND_START_NOTIFY_RECEIVED
    this.NETCALL_CONTROL_COMMAND_NOTIFY_RECORD_START = this.netcall.NETCALL_CONTROL_COMMAND_NOTIFY_RECORD_START
    this.NETCALL_CONTROL_COMMAND_NOTIFY_RECORD_STOP = this.netcall.NETCALL_CONTROL_COMMAND_NOTIFY_RECORD_STOP
  }

  /**
   * 绑定网易呼叫事件
   */
  _bindNetcallEvent () {
    //同步完成通知
    this.netcall.on('syncDone', (data) => {
      log.info('NC-同步完成',data)
      this.netcall._imController._mainStatus.isCaller = true
      this.emit(NetcallEvent.syncDone, data)
    })
    // data:{account:IM账号信息,cid:当前通话的唯一 id 值,uid:IM账号对应的用户ID}
    this.netcall.on('clientLeave', (data) => {
      log.info('NC-用户离开',data)
      this.emit(NetcallEvent.leaveChannel, data)
    })
    // 有人加入了（已经加入房间，可以获取流） data:{account:主叫 account,type:主叫发起的通话类型（音频还是视频）,cid:此通通话的唯一 ID 值，开发者可用于判断是否是同一通呼叫}
    this.netcall.on('clientJoin', (data) => {
      log.info('NC-用户加入',data)
      this.emit(NetcallEvent.remoteTrack, data)
    })
    // data:{timetag:时间戳,cid:当前通话的唯一 id 值,type:通话类型：音频、视频，accepted:其他端做出的应答：接受、拒绝,fromClientType:从什么类型的终端做出的应答：IOS、Android 等}
    this.netcall.on('callerAckSync', (data) => {
      log.info('NC--callerAckSync',data)
      this.emit(NetcallEvent.callerAckSync, data)
    })
    // data:{account:被叫账号,cid:当前通话的唯一 id 值,command:https://dev.yunxin.163.com/docs/product/%E9%9F%B3%E8%A7%86%E9%A2%91%E9%80%9A%E8%AF%9D/SDK%E5%BC%80%E5%8F%91%E9%9B%86%E6%88%90/Web%E5%BC%80%E5%8F%91%E9%9B%86%E6%88%90/%E6%80%BB%E4%BD%93%E5%8F%82%E6%95%B0%E8%AF%B4%E6%98%8E?#ControlType}
    this.netcall.on('control', (data) => {
      log.log('NC音视频控制消息', data)
      console.log(data)
      switch (data.command) {
        case this.NETCALL_CONTROL_COMMAND_SWITCH_VIDEO_TO_AUDIO: // 视频切换到音频
          this.emit(NetcallEvent.videoToAudio)
          break
        case this.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO: // 音频切换到视频
          this.emit(NetcallEvent.audioToVideo)
          break
        case this.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO_AGREE: // 对方同意音频切换到视频
          this.emit(NetcallEvent.audioToVideoAgree)
          break
        case this.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_ON: // 对方打开了摄像头
          break
        case this.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_OFF: // 对方关闭了摄像头
          break
        case this.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_ON: // 对方打开了音频
          break
        case this.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_OFF: // 对方关闭了音频
          break
        case this.NETCALL_CONTROL_COMMAND_BUSY: // 占线
          break
      }
    })
    this.netcall.on('error', (error) => {
      log.error('NC出错了', error)
      this.emit('netcallError', error)
    })
    this.netcall.on('open', (data) => {
      log.info('NC--socket建立成功', data)
    })
    this.netcall.on('willreconnect', (data) => {
      log.info('NC-将要重连', data)
      // 直播通道准备重连
      this.emit('willreconnect', data)
    })
    this.netcall.on('audioVolumn', (data) => {
      log.info('NC- 房间里所有人员音量大小', data)
      // 监听房间中所有人的音量
      this.emit('audioVolumn', data)
    })
  }

  /**
   * 网络探测
   *
   * @param {Integer} [detectTime=20] 探测的时间，[建议 15s 以上]
   * @param {Boolean} [fromDevice=true] 探测源使用摄像头，设置为 true
   * @returns {Promise} Promise实例
   */
  detectNetworkStatus (detectTime, fromDevice) {
    log.info('NC- 开始网络探测',detectTime)
    return this.netcall.detectNetworkStatus({
      detectTime: detectTime | 20,
      fromDevice: fromDevice | true
    })
  }

  /**
   * 开启混频功能
   *
   * @returns {Promise} Promise实例
   */
  startMixVideo () {
    return this.netcall.setMixConf({
      enableMixVideo: true,
      videoLayout: Netcall.LAYOUT_TOP_RIGHT,
      videoCompressSize: Netcall.CHAT_VIDEO_QUALITY_MEDIUM
    })
  }

  /**
   * 关闭混频功能
   *
   * @returns {Promise} Promise实例
   */
  stopMixVideo () {
    return this.netcall.setMixConf({
      enableMixVideo: false
    })
  }

  /**
   * 创建房间
   *
   * @param {String} roomId 房间号
   * @returns {Promise} Promise实例
   */
  createRoom (roomId) {
    log.info('NC- 开始创建房间roomId=',roomId)
    return this.netcall.createChannel({
      channelName: roomId,
      custom: '',
      webrtcEnable: true
    })
  }

  /**
   * 加入房间
   *
   * @param {String} roomId 房间号
   * @param {Object} recordConfig 录制配置
   * @param {Integer} [type=2] 通话类型 1-音频，2-视频
   * @param {Integer} [role=0] 角色，0-互动，1-主播
   * @returns {Promise} Promise实例
   */
  joinRoom (roomId,recordConfig, type = Netcall.NETCALL_TYPE_VIDEO, role = 0) {
    log.info("NC- 加入房间的配置信息roomId=",roomId,recordConfig,"mode="+type)
    return this.netcall.joinChannel({
      channelName: roomId,
      type: type,
      mode:type==2?0:1,
      role: role,
      scene:2,
      recordVideo: recordConfig.recordVideo,//是否开启音频实时音录制，0不需要，1需要（默认0）
      recordAudio: recordConfig.recordAudio,//是否开启视频实时音录制，0不需要，1需要（默认0）
      recordType: recordConfig.recordType//录制模式，0混单（产生混合录制文件+单独录制文件） 1只混（只产生混合录制文件） 2只单（只产生单独录制文件）
    })
  }

  /**
   * 离开房间
   *
   * @returns {Promise} Promise实例
   */
  leaveRoom () {
    log.info("NC- 离开房间")
    this.netcall._imController._mainStatus.isCaller = false
    return this.netcall.leaveChannel()
  }

  /**
   * 通话过程控制
   *
   * @param {Integer} controlType 控制类型
   * @param {String} sessionId 会话ID
   * @returns {Promise} Promise实例
   */
  sendNetcallControl (controlType, sessionId) {
    log.info("NC- 音视频控制", "controlType="+controlType, "sessionId="+sessionId)
    return this.netcall.control({
      command: controlType,
      channelId: sessionId
    })
  }

  /**
   * 判断浏览器是否有rtc能力
   *
   * @returns {Boolean} true-支持， false-不支持
   */
  isSupportWebrtc () {
    return this.netcall.isSupportWebrtc()
  }

  /**
   *截屏
   *
   * @param {String} account 截屏的账户
   * @returns {Promise} Promise实例
   */
  takeSnapshot (account) {
    return this.netcall.takeSnapshot({
      account: account,
      name: account + '.jpg'
    })
  }

  /**
   * 投屏
   *
   * @returns {Object} 截屏
   */
  sendScreens () {
    return this.netcall.startDevice({
      type: Netcall.DEVICE_TYPE_DESKTOP_CHROME_SCREEN
    })
  }

  /**
   * 取消投屏
   *
   * @returns {Object} 取消截屏
   */
  cancelSendScreen () {
    return this.netcall.stopDevice(Netcall.DEVICE_TYPE_DESKTOP_CHROME_SCREEN)
  }

  /**
   * 状态
   */
  isSendScreen () {

  }

  /**
   * 开始文件混音任务
   *
   * @param {Object} options  参数
   * @returns {Object} 对象
   */
  startAudioMixing (options) {
    return this.netcall.startAudioMixing(options)
  }

  /**
   * 停止伴音
   *
   * @returns {Object} 对象
   */
  stopAudioMixing () {
    return this.netcall.stopAudioMixing()
  }

  /**
   * 设置音量
   *
   * @param {*} volume 音量
   */
  setVolume (volume) {
    this.netcall.setCaptureVolume(volume | 225)
  }


  /**
   * 通话过程控制
   *
   * @param {Number} command 音转频，频转音
   * @param {String} channelId 通话id
   * @returns {Promise} Promise实例
   */
  switchAVControl (command, channelId) {
    const params = {}
    if (command) params.command = command
    if (channelId) params.channelId = channelId
    return this.netcall.control(params)
  }
}
