import EventEmitter from './events/index'
import { ClientError,IMError } from './error/index'
import logger from './log/index'
import IMAdapter from './IMAdapter'
import NetcallAdapter from './NetcallAdapter'
import constant from './constant'
import IMEvent from './IMEvent'
import ClientEvent from './ClientEvent'
import NetcallEvent from './NetcallEvent'
import { generate as generateJournalId } from './journal'
import service from './service'
import sysConfig from './config/config'
import {deepMerge} from './util'
import http from './http/index'

/**
 * 呼叫状态
 *
 * @readonly
 * @enum {Integer}
 */
const callStatus = {
  INIT: 0, // 初始状态
  CALLING: 1, // 呼叫中
  ASSIGN: 2, // 已分配
  BUSY: 3, // 通话中
  CANCELED: 4 // 已取消

}
/**
 * 视频银行web版SDK,提供音视频通话、消息功能
 *
 * @class Client
 * @extends EventEmitter
 * @since 1.0.0
 * @author jiazw
 * @author heclb
 */
class Client extends EventEmitter {
  /**
   * 构造函数
   *
   * @constructs
   */
  constructor () {
    super()
    // 参数配置
    this.options = {}
    // 客户端实例对象
    this.instance = null
    // IM实例对象
    this.imAdapter = null
    // 音视频实例对象
    this.netcallAdapter = null
    // 是否已登录
    this.logined = false
    //登录传递进来信息
    this.loginInfo = null
    // 登录成功信息
    this.loginedInfo = null
    // 1-主呼，2-被叫
    this.callMode = null
    // 呼叫状态
    this.callStatus = callStatus.INIT
    // 呼叫信息
    this.callInfo = null
    // 被叫信息
    this.calledInfo = null
    // 白板信息
    this.boardInfo = null
    // 呼叫超时提醒定时器
    this.callTipTimer = null
    // 呼叫超时断开定时器
    this.callHangupTimer = null
    // 连接超时定时器
    this.callConnTimer = null
    // 呼叫超时定时器
    this.callTimer = null
    // 聊天室群id
    this.chatTeamId = null
    // 邀请未进入房间的三方座席信息
    this.threePartsUnJoinInfo = []
    // 邀请已进入房间的三方座席账号
    this.threePartsJoinAccount = []
    // 三方或转接超时未接挺定时器
    this.threePartTimers = []
    // 转接方信息 账号 流水号
    this.transferInfo = null
    // 转接超时未接听定时器
    this.transferTimer = null
    // 客户端记录当前在房间的座席 用户通知客户端同意或发起投屏
    this.agentAccounts = []
  }

  /**
   * 单例模式获取web版SDK对象
   *
   * @returns {Client} SDK实例对象
   */
  static getInstance () {
    if (!this.instance) {
      this.instance = new Client()
    }
    return this.instance
  }

  /**
   * 销毁当前单例实例
   *
   * @returns {Promise} Promise实例
   */
  static destory () {
    if (this.logined) {
      return this.logout().then(() => {
        this.instance = null
      })
    } else {
      return Promise.resolve()
    }
  }

  /**
   * 客户端SDK登录操作
   *
   * @param {Object} options 参数配置
   * @returns {Promise} Promise实例对象
   */
  login (options) {
    logger.info('login登陆方法',options)
    this.loginInfo = options
    if (this.logined) {
      logger.warn("CL-用户已登录，请勿重复登录")
      return Promise.resolve(this.loginedInfo)
    } else {
      if (!options.caller || options.caller === '') {
        logger.error('CL-登录失败，传入呼叫方账号为空')
        this.emit(ClientEvent.error, new ClientError('CL-0008'))
      }
      this.logout()
      // 从服务器获取参数, 登录+获取参数
      const queryParams = {
        'app-key': sysConfig.appConfig.appKey,
        'app-secret': sysConfig.appConfig.appSecret,
        'use-mode': sysConfig.useMode, // SDK使用模式：1-客户使用，2-座席使用
        id: options.caller // 呼叫方账号，如果useMode=1,则此值代表的是客户账号，useMode=2此值代表的是座席ID
      }
      return service.getParams(queryParams).then((params) => { // 合并本地参数与远程参数
        this.options = deepMerge(sysConfig,params.data)
        this.options = deepMerge(this.options,options)
        logger.init(this.options.debug)
        logger.info("CL-服务端参数配置",params.data)
        logger.info("CL-最终配置",this.options)
        // 获取IM适配器实例
        this.imAdapter = IMAdapter.getInstance(this.options.im)
        //监听网易连接状态
        this.imAdapter.on(IMEvent.connect, this._onConnectEvent.bind(this))
        .on(IMEvent.reconnect, this._onReconnectEvent.bind(this))
        // IM登录
        return this.imAdapter.login()
      }).then((result) => { // 实例化音视频实例
        logger.info("CL-网易登录成功",result)
        logger.info("CL-网易登录成功",options)
        this.logined = true
        this.loginedInfo = result
        this.netcallAdapter = NetcallAdapter.getInstance({
          ...this.options.netcall,
          nim: this.imAdapter.getOriginalIm()
        })
        return Promise.resolve("初始化音视频成功")
      }).then(() => { // 绑定相关事件
        logger.info("CL-开始监听消息")
        // 注册IM相关事件
        this.imAdapter.on(IMEvent.sysMessage, this._onIMSysMessageEvent.bind(this))
          .on(IMEvent.chatMessage, this._onIMChatMessageEvent.bind(this))
        // 注册netCall相关事件
        //同步完成  获取推流地址
        this.netcallAdapter.on(NetcallEvent.syncDone, this._onNetcallSyncDone.bind(this))
          // 注册`有人进入房间并产生流`事件
          .on(NetcallEvent.remoteTrack, this._onNetcallRemoteTrack.bind(this))
          //用户加入
          .on(NetcallEvent.joinChannel, this._onNetcallJoinChannel.bind(this))
          //用户离开
          .on(NetcallEvent.leaveChannel, this._onNetcallLeaveChannel.bind(this))
          // 对方发送视频转音频
          .on(NetcallEvent.videoToAudio, this._onNetcallVideoToAudio.bind(this))
          // 对方发送音频转视频
          .on(NetcallEvent.audioToVideo, this._onNetcallAudioToVideo.bind(this))
          // 对方同意音频转视频
          .on(NetcallEvent.audioToVideoAgree, this._onNetcallAudioToVideoAgree.bind(this))
          .on(NetcallEvent.netcallError, this._onNetcallError.bind(this))
          return Promise.resolve(this.loginedInfo)
      })
    }
  }
  /**
   * 连接成功
   * @param {Object} data 
   */
  _onConnectEvent(data){
    this.logined = true
    logger.info("CL-连接成功",data)
  }
  /**
   * 重新尝试连接
   * @param {Object} data 
   */
  _onReconnectEvent(data){
    this.logined = false
    logger.warn("CL-重新尝试连接",data)
    this.emit(IMEvent.reconnect, data)
  }

  /**
   * 客户端SDK退出操作
   *
   * @returns {Promise} Promise实例
   */
  logout () {
    logger.info("CL-退出登录")
    this.logined = false
    this.callMode = null
    this.callStatus = callStatus.INIT
    this.loginedInfo = null
    this.calledInfo = null
    this.callInfo = null
    // 清理呼叫超时任务
    this.callTimeout && clearTimeout(this.callTimeout)
    this._clearEvents()
    NetcallAdapter.destroy()
    if (this.imAdapter) {
      return this.imAdapter.logout()
    } else {
      return Promise.resolve()
    }
  }
  /**
   * 移除监听
   */
  _clearEvents(){
    if(this.imAdapter){
      this.imAdapter.removeAllListeners()
    }
    if(this.netcallAdapter){
      this.netcallAdapter.removeAllListeners()
    }
  }

  /**
   * 呼叫
   *
   * @param {Object} [params] 呼叫参数
   * @param {String} [params.callType=2] 呼叫类型，1-音频，2-视频
   * @param {Integer} [params.specialFlag] 特殊标记
   * @param {String} [params.businessType] 业务类型
   * @param {String} [params.transCode] 交易码
   * @param {String|Array<String>} [params.callee] 呼叫账号数组
   * @returns {Promise} Promise实例
   * @fires ClientEvent#error
   */
  call (params = {}) {
    logger.info("CL-开始呼叫用户",params)
    logger.info("call",this.loginInfo)
    if(this.logined){
      logger.info("CL-用户已登录直接呼叫",params)
      // return this._call(params)
      return this._getTransParams(params)
    }else{
      if(this.loginInfo){
        logger.info("CL-用户登录失败了呼叫前重新登录",this.loginInfo)
        return this.login(this.loginInfo).then(()=>{
          // return this._call(params)
          return this._getTransParams(params)
        })
      }else{
        logger.error("CL-用户未调用登录接口,不允许呼叫")
        return Promise.reject(new ClientError('CL-0001'))
      }
    }
  }

  /**
   * 根据交易码查询交易参数详情
   */
  _getTransParams(params) {
    let data = {
      transCode: params.transCode
    }
    return service.getTransParams(data).then(result => {
      if (result.data!="") {
        let callParams = deepMerge(result.data, params)
        return this._call(callParams)
      }else {
        return this._call(data)
      }
    })
  }

  _call (params = {}){
    // 将呼叫模式设置为主呼
    this.callMode = 1
    // 呼叫状态设置为呼叫中
    this.callStatus = callStatus.CALLING
    // 设置呼叫参数
    this.callInfo = {
      useMode: sysConfig.useMode, // SDK使用模式：1-客户使用，2-座席使用
      caller: this.options.caller, // 呼叫方账号，如果useMode=1,则此值代表的是客户账号，useMode=2此值代表的是座席ID
      sessionJournalId: generateJournalId(this.options.caller), // 生成会话流水ID
      callType: sysConfig.useMode+"", // 呼叫类型，1-客户端主呼，2-座席端主呼，3-转接，4-三方
      sessionType: params.sessionType || 2, // 会话类型，1 - 音频，2 - 视频
      channelType: this.options.channelType,
      terminalType: this.options.terminalType,
      robotTransfer: this.options.robotTransfer || 2, // 机器人转接标识，1-是,2-否
      businessType: params.businessType,
      transCode: params.transCode || this.options.defaultTradeCode || sysConfig.defaultTradeCode,
      customerOrgId: this.options.customerOrgId?this.options.customerOrgId:"",
      custom: params.custom//额外的扩展信息
    }

    // 呼叫账号数组
    // 1. 呼叫时可以直接指定对方账号数组,一般用于坐席呼叫客户或座席
    // 2. 不指定则由服务端分配,主要用于客户呼叫坐席,由服务端进行分配
    if (typeof params.callee === 'string') {
      this.callInfo.callee = [params.callee]
    } else if (Array.isArray(params.callee)) {
      this.callInfo.callee = [...params.callee]
    } else {
      this.callInfo.callee = []
    }
    // 如果是客户使用模式则设置客户相关信息
    this.callInfo.accountManager = params.accountManager || this.options.accountManager || ''
    this.callInfo.customerId = params.customerId || this.options.customerId || ''
    this.callInfo.customerLevel = params.customerLevel || this.options.customerLevel || ''
    this.callInfo.customerOrgId = params.customerOrgId || this.options.customerOrgId || ''
    this.callInfo.customerType = params.customerType || this.options.customerType || ''
    this.callInfo.mobile = params.mobile || this.options.mobile || ''

    this.callInfo.specialFlag = params.specialFlag
    this.callInfo.transName = params.transName || this.options.defaultTradeName

    //质检、音视频办理模式参数
    this.callInfo.qcFlag = params.qcFlag
    this.callInfo.qcModes = params.qcModes
    this.callInfo.transPattern = params.transPattern

    this._setTimer()
    this.emit(ClientEvent.call)

    // TODO：调用后台呼叫服务，服务调用成功开启
    return service.call(this.callInfo).catch(error => {
      logger.error("CL-呼叫排队失败",error)
      this._clear(callStatus.INIT)
      this.emit(ClientEvent.error, error)
      return error
    })
  }

  /**
   * 在对方未接通时取消通话
   *
   * @param {Boolean} [timeFlag] 超时标志
   * @fires ClientEvent#error
   */
  cancel (timeFlag) {
    logger.info('CL-取消呼叫',this.callInfo)
    // 取消校验
    this._check('通话-取消')
    const status = this.callStatus
    // 呼叫状态设置为已取消
    this.callStatus = callStatus.CANCELED
    // TODO:呼叫中时取消呼叫服务的调用
    const cancelData = {
      sessionJournalId: this.callInfo.sessionJournalId,
      callType: this.callInfo.callType,
      hanguper: this.callInfo.caller,
      hangupType: status === callStatus.ASSIGN ? timeFlag ? '4' : '3' : timeFlag ? '2' : '1' // 挂断类型 1未分配主动挂断，2未分配超时挂断，3已分配主动挂断，4已分配超时挂断
    }
    // 调用取消服务
    service.cancel(cancelData).catch(error => {
      logger.error("CL-取消呼叫失败",error)
      this.emit(ClientEvent.error, error)
    })
    // 如果已经分配了被叫方，则向被叫方发送取消消息
    if (status === callStatus.ASSIGN) {
      const callees = this.callInfo.callee || []
      callees.forEach(callee => {
        // 发送取消消息,通知被叫方通话已被取消
        this.imAdapter.sendSystemMessage(callee, {
          header: {
            type: constant.type.call,
            action: constant.action.callCancel
          },
          payload: {
            caller: this.options.im.account,
            callee: [callee],
            roomId: this.callInfo.roomId,
            sessionId: this.callInfo.sessionId
          }
        })
      })
      // 离开房间
      this.leaveRoom()
      // 离开群聊
      this.leaveTeam()
    }
    // 清理数据及状态
    this._clear(callStatus.INIT)
  }

  /**
   * 设置定时器
   *
   */
  _setTimer () {
    // 根据等待超时时间进行设定,呼叫超时标识，1-不超时，2-自定义
    if (this.options.waitRemindFlag === 2) {
      logger.info('CL-开启等待提示倒计时',this.options.waitRemindTimeout)
      this.callTipTimer = setTimeout(() => {
        logger.info('CL-等待提示倒计时结束')
        this.emit(ClientEvent.timeoutTip)
        // 等待超时后根据呼叫超时时间进行设定，1-不超时，2-自定义
        if (this.options.waitFlag === 2) {
          logger.info('CL-开启等待超时倒计时',this.options.waitTimeout)
          this.callHangupTimer = setTimeout(() => {
            logger.info('CL-等待超时倒计时结束')
            this.emit(ClientEvent.timeoutHangup)
          }, (this.options.waitTimeout || 180) * 1000)
        }
      }, (this.options.waitRemindTimeout || 90) * 1000)
    }
  }

  /**
   * 连接超时计时器
   *
   */
  _answerTimerHandler () {
    clearTimeout(this.callTipTimer)
    clearTimeout(this.callHangupTimer)
    if (this.options.connectFlag === 2) {
      logger.info('CL-开启连接倒计时',this.options.connectTimeout)
      this.callConnTimer = setTimeout(() => {
        logger.info('CL-连接超时倒计时结束')
        this.emit(ClientEvent.timeoutConn)
      }, (this.options.connectTimeout || 10) * 1000)
    }
  }
  /**
   * 设置呼叫超时
   *
   */
  _callTimerHandler () {
    //清除排队等待倒计时
    this.callTipTimer && clearTimeout(this.callTipTimer)
    this.callTipTimer = null
    this.callHangupTimer && clearTimeout(this.callHangupTimer)
    this.callHangupTimer = null
    //开启呼叫等待倒计时
    if (this.options.callFlag === 2) {
      logger.info('CL-开启呼叫倒计时',this.options.callTimeout)
      this.callTimer = setTimeout(() => {
        logger.info('CL-呼叫倒计时结束')
        this.emit(ClientEvent.callTimeout)
      }, (this.options.callTimeout || 60) * 1000)
    }
  }

  /**
   * 清理定时器
   */
  _clearTimer () {
    this.callTipTimer && clearTimeout(this.callTipTimer)
    this.callTipTimer = null
    this.callHangupTimer && clearTimeout(this.callHangupTimer)
    this.callHangupTimer = null
    this.callConnTimer && clearTimeout(this.callConnTimer)
    this.callConnTimer = null
    this.callTimer && clearTimeout(this.callTimer)
    this.callTimer = null
  }

  /**
   * 清理数据及状态
   *
   * @private
   * @param {callStatus} callStatus 呼叫状态
   */
  _clear (callStatus) {
    if (callStatus !== null && callStatus !== undefined && callStatus >= 0) {
      this.callStatus = callStatus
    }
    this.callMode = null
    this.callInfo = null
    this.calledInfo = null
    this.chatTeamId = null
    this.threePartsUnJoinInfo = []
    this.threePartsJoinAccount = []
    this.transferInfo = null
    this.boardInfo = null
    this.agentAccounts = []
    this._clearThreePartTimer()
    this._clearTransferTimer()
    this._clearTimer()
  }

  /**
   *
   * 清理转接定时任务
   *
   */
  _clearTransferTimer () {
    if (this.transferTimer) {
      clearTimeout(this.transferTimer)
      this.transferTimer = null
    }
  }

  /**
   * 清理三方定时任务
   *
   * @param {String} account 需要清除定时器的账号
   */
  _clearThreePartTimer (account) {
    // 清除指定账户的 三方信息和定时任务
    if (account) {
      // 清除邀请三方座席的定时器
      for (let index = 0; index < this.threePartTimers.length; index++) {
        const timerInfo = this.threePartTimers[index]
        if (timerInfo.account === account) {
          if (timerInfo.timer) {
            clearTimeout(timerInfo.timer)
            timerInfo.timer = null
          }
          this.threePartTimers.splice(index, 1)
          break
        }
      }
      // 清除所有的 三方信息和定时任务
    } else {
      if (this.threePartTimers.length) {
        for (let index = 0; index < this.threePartTimers.length; index++) {
          var temp = this.threePartTimers[index]
          if (temp.timer) {
            clearTimeout(temp.timer)
            temp.timer = null
          }
        }
        this.threePartTimers = []
      }
    }
  }

  /**
   * 挂断
   */
  hangup () {
    // 调用前检查
    logger.info("CL-挂断视频")
    this._check('通话-挂断')
    this.leaveRoom()
    // 离开群聊
    this.leaveTeam()
    if (this.callInfo.transPattern==2) {//智能坐席
      let data = {
        sessionEndFlag: true,
        sessionId: this.callInfo.sessionId,
        sessionJournalId: this.callInfo.sessionJournalId,
        agentId: this.callInfo.callee[0],
        callType: 1,
        evaluate: 0,
        mobile: this.callInfo.mobile
      }
      service.hangup(data).then(result => {
        let data = {
          body: {},
          sysHeader: {
            agentId: this.callInfo.callee[0],
            batchId: this.callInfo.sessionJournalId,
            branchId: this.callInfo.customerOrgId?this.callInfo.customerOrgId:"1",
            keyClass: 0,
            messageCode: "1",
            messageType: "1",
            serviceCode: "1",
            sessionId: this.callInfo.sessionId,
            sourceType: "4",
            tranCode: this.callInfo.transCode
          },
        }
        service.secondAccountsCommit(data)
        this._clear(callStatus.INIT)
      }).catch(() => {
        this._clear(callStatus.INIT)
      })
    }else {
      this._clear(callStatus.INIT)
    }
  }

  /**
   * 接听
   */
  anwser () {
    // 调用前检查
    this._check('通话-接听')
    logger.info('CL-开始接听会话',this.calledInfo)
    let recordConfig = {
      recordVideo: this.options.netCall.recordVideo?1:0,//是否开启音频实时音录制，0不需要，1需要（默认0）
      recordAudio: this.options.netCall.recordAudio?1:0,//是否开启视频实时音录制，0不需要，1需要（默认0）
      recordType:this.options.netCall.recordType//录制模式，0混单（产生混合录制文件+单独录制文件） 1只混（只产生混合录制文件） 2只单（只产生单独录制文件）
    }
    this.netcallAdapter.joinRoom(this.calledInfo.roomId,recordConfig, this.calledInfo.sessionType).then((data) => {
      logger.info('CL-加入房间成功',data)
      this.emit(ClientEvent.joinRoom, data)
      // 开启连接倒计时
      this._answerTimerHandler()
    }).catch((error) => {
      logger.info('CL-加入房间失败',error)
      this.emit(ClientEvent.error, error)
      this._clear(callStatus.INIT)
    })
  }

  /**
   * 拒绝
   *
   */
  reject () {
    // 调用前检查
    logger.info('CL-拒绝用户会话请求',this.calledInfo)
    this._check('通话-拒绝')
    if (this.calledInfo && this.calledInfo.caller) {
      service.reject({
        sessionJournalId: this.calledInfo.sessionJournalId,
        callType: this.calledInfo.callType === '5' ? '4' : this.calledInfo.callType,
        mode: this.calledInfo.matchMode,
        flag: sysConfig.useMode === 1,
        refuser: this.options.im.account
      }).then(() => {
        logger.info('CL-给对方发送拒绝消息',this.calledInfo)
        // 向对方发送拒绝消息
        this.imAdapter.sendSystemMessage(this.calledInfo.caller, {
          header: {
            type: constant.type.call,
            action: constant.action.callReject
          },
          payload: {
            caller: this.calledInfo.caller,
            callee: [this.options.im.account],
            roomId: this.calledInfo.roomId,
            sessionId: this.calledInfo.sessionId
          }
        })
        // 离开群聊
        this.leaveTeam()
      }).catch(error => {
        logger.error('CL-拒绝服务失败',error)
        this.emit(ClientEvent.error, error)
      }).finally(() => {
        this._clear(callStatus.INIT)
      })
    }
  }

  /**
   * 邀请第三方加入当前通话
   *
   * @param {String} account 邀请账号
   * @param {String} orgId 机构号
   */
  invite (account, orgId) {
    logger.info("CL-邀请用户",account,orgId)
    // 1 生成流水号
    const sessionJournalId = generateJournalId(account)
    // 根据呼叫类型获取会话信息
    var sessionInfo = this.callMode === 1 ? this.callInfo : this.calledInfo
    // 判断当前座席callType： 1 / 2 / 3 发出去的消息calltype就是 3  如果当前是callType是 4 / 5 发出去则是 5
    const callType = sessionInfo.callType === '4' || sessionInfo.callType === '5' ? '5' : '4'
    const originJournalId = sessionInfo.callType === '4' || sessionInfo.callType === '5' ? sessionInfo.originJournalId : sessionInfo.sessionJournalId
    const mainAgentId = sessionInfo.callType === '4' || sessionInfo.callType === '5' ? sessionInfo.mainAgentId : this.options.im.account
    // 保存三方流水
    this.threePartsUnJoinInfo.push({
      sessionJournalId: sessionJournalId,
      callType: callType,
      account: account
    })

    // 发送邀请接口
    const inviteData = {
      agentId: account,
      branchId: orgId,
      originalSessionJournalId: originJournalId,
      sessionJournalId: sessionJournalId,
      callType: '4',
      channelType: this.options.channelType,
      customerId: sessionInfo.customerAccount,
      customerLevel: sessionInfo.customerLevel,
      customerType: sessionInfo.customerType,
      mobile: sessionInfo.customerMobile,
      robotTransfer: 0,
      sessionType: sessionInfo.sessionType,
      specialFlag: '',
      terminalType: '1',
      transCode: sessionInfo.transCode,
      transName: sessionInfo.transName
    }
    // TODO:发送邀请服务
    service.invite(inviteData).then(() => {
      logger.info("CL-邀请服务成成功")
      // 3 发送邀请信息 当前邀请
      this.imAdapter.sendSystemMessage(account, {
        header: {
          type: constant.type.call,
          action: constant.action.callInvite
        },
        payload: {
          caller: this.options.im.account, // 呼叫方账号
          callee: [account], // 被叫方账号，可以同时邀请多名座席
          roomId: sessionInfo.roomId, // 房间号
          teamId: this.chatTeamId, // 聊天室群id
          sessionId: sessionInfo.sessionId, // 当前会话ID
          callType: callType, // 1-客户端主呼，2-座席端主呼，3-转接，4-三方 5-三方发起的三方或转接
          sessionType: this.callInfo.sessionType, // 呼叫类型,1-音频，2-视频
          callMode: this.callMode, // 呼叫模式
          channelType: this.options.channelType, // 渠道类型
          terminalType: this.options.terminalType, // 终端类型
          customerMobile: sessionInfo.customerMobile,
          customerName: sessionInfo.customerName,
          customerId: sessionInfo.customerId,
          customerType: sessionInfo.customerType,
          customerLevel: sessionInfo.customerLevel,
          customerAccount: sessionInfo.customerAccount,
          robot: 0, // TODO:robot
          transCode: sessionInfo.transCode || this.options.defaultTradeCode,
          transName: sessionInfo.transName || this.options.defaultTradeName,
          sessionJournalId: sessionJournalId, // 新生成的流水号
          virtualHuman: this.options.virtualPortrait,
          matchMode: this.options.matchMode, // TO式
          originJournalId: originJournalId, // 源流水号
          threePartsJoinAccount: this.threePartsJoinAccount, // 三方信息
          mainAgentId: mainAgentId, // 主座席Id
          whiteBoardRoomId: this.boardInfo ? this.boardInfo.roomId ? this.boardInfo.roomId : '' : ''
        }
      }).then(() => {
        logger.info("CL-发送邀请信息成功")
        // 拉人入群
        this.addTeamMembers({
          teamId: this.chatTeamId,
          accounts: [account]
        }).then(() => {
          logger.info("CL-创建群聊成功")
          // 拉人入群后，创建一条消息
          this.sendTeamChatTextActiveMessage()
        }).catch((e) => {
          logger.info("CL-创建群聊失败",e)
          this.emit(ClientEvent.error, new IMError('IM-0012', e, account))
        })
      })
      if (this.options.callFlag === 2) {
        var timer = setTimeout(() => {
          this._onCancleInvite(account, true)
        }, (this.options.callTimeout || 180) * 1000)

        // 开启定时任务
        this.threePartTimers.push({
          account: account,
          timer: timer
        })
      }
    }).catch(error => {
      logger.error("CL-邀请失败",error)
      this.emit(ClientEvent.error, error)
      return error
    })
  }

  /**
   * 超时取消邀请
   *
   * @param {String} inviteAccount 取消邀请账号
   * @param {Boolean} outTimeFlag 超时标志 true 超时挂断 false 主动取消呼叫
   */
  _onCancleInvite (inviteAccount, outTimeFlag) {
    logger.info("CL-超时取消",inviteAccount, outTimeFlag)
    // 在三方座席信息中找到该座席
    let accountInfo = null
    for (let index = 0; index < this.threePartsUnJoinInfo.length; index++) {
      accountInfo = this.threePartsUnJoinInfo[index]
      if (accountInfo.account === inviteAccount) {
        this.threePartsUnJoinInfo.splice(index, 1)
        break
      }
    }
    // 清除指定三方账号的定时任务
    this._clearThreePartTimer(inviteAccount)
    // 调用取消服务
    const cancelData = {
      sessionJournalId: accountInfo.sessionJournalId,
      callType: accountInfo.callType === '5' ? '4' : accountInfo.callType,
      hanguper: this.options.im.account,
      hangupType: outTimeFlag === true ? '4' : '3' // 挂断类型 3已分配主动挂断，4已分配超时挂断
    }
    service.cancel(cancelData).catch(error => {
      logger.error("CL-取消服务失败",error)
      this.emit(ClientEvent.error, error)
    })
    // 根据呼叫类型获取会话信息
    var sessionInfo = this.callMode === 1 ? this.callInfo : this.calledInfo
    // 发送取消消息,通知被叫方通话已被取消
    this.imAdapter.sendSystemMessage(accountInfo.account, {
      header: {
        type: constant.type.call,
        action: constant.action.callCancel
      },
      payload: {
        caller: this.options.im.account,
        callee: [inviteAccount],
        roomId: sessionInfo.roomId,
        sessionId: sessionInfo.sessionId
      }
    })
  }

  /**
   * 取消邀请第三方加入当前通话
   *
   *
   * @param {String} inviteAccount 邀请账号
   */
  cancleInvite (inviteAccount) {
    this._onCancleInvite(inviteAccount, false)
  }

  /**
   * 转接
   *
   * @param {String} account 转接方账号
   * @param {String} orgId 机构号
   */
  transfer (account, orgId) {
    // 生成流水号
    const sessionJournalId = generateJournalId(account)
    // 根据呼叫类型获取会话信息
    var sessionInfo = this.callMode === 1 ? this.callInfo : this.calledInfo
    // 判断当前座席callType： 1 / 2 / 3 发出去的消息calltype就是 3  如果当前是callType是 4 / 5 发出去则是 5
    const callType = sessionInfo.callType === '4' || sessionInfo.callType === '5' ? '5' : '3'

    const originJournalId = sessionInfo.callType === '4' || sessionInfo.callType === '5' ? sessionInfo.originJournalId : sessionInfo.sessionJournalId

    const mainAgentId = sessionInfo.callType === '4' || sessionInfo.callType === '5' ? sessionInfo.mainAgentId : this.options.im.account
    // 保存转接信息
    this.transferInfo = {
      sessionJournalId: sessionJournalId,
      callType: callType,
      account: account
    }

    // 发送转接接口
    const transferData = {
      agentId: account,
      branchId: orgId,
      originalSessionJournalId: originJournalId,
      sessionJournalId: sessionJournalId,
      callType: '3',
      channelType: this.options.channelType,
      customerId: sessionInfo.customerAccount,
      customerLevel: sessionInfo.customerLevel,
      customerType: sessionInfo.customerType,
      mobile: sessionInfo.customerMobile,
      robotTransfer: sessionInfo.robot,
      sessionType: sessionInfo.callType,
      customerName: sessionInfo.customerName,
      specialFlag: '',
      terminalType: '1',
      transCode: sessionInfo.tradeCode,
      transName: sessionInfo.tradeName
    }
    // 发送转接服务
    service.transfer(transferData).then(() => {
      // 3 发送转接邀请信息 当前邀请
      this.imAdapter.sendSystemMessage(account, {
        header: {
          type: constant.type.call,
          action: constant.action.callInvite
        },
        payload: {
          caller: this.options.im.account, // 呼叫方账号
          callee: [account], // 被叫方账号，可以同时邀请多名座席
          roomId: sessionInfo.roomId, // 房间号
          teamId: this.chatTeamId, // 聊天室群id
          sessionId: sessionInfo.sessionId, // 当前会话ID
          callType: callType, // 1-客户端主呼，2-座席端主呼，3-转接，4-三方 5-三方发起的三方或转接
          sessionType: this.callInfo.sessionType, // 呼叫类型,1-音频，2-视频
          callMode: this.callMode, // 呼叫模式
          channelType: this.options.channelType, // 渠道类型
          terminalType: this.options.terminalType, // 终端类型
          customerMobile: sessionInfo.customerMobile,
          customerName: sessionInfo.customerName,
          customerId: sessionInfo.customerId,
          customerType: sessionInfo.customerType,
          customerLevel: sessionInfo.customerLevel,
          customerAccount: sessionInfo.customerAccount,
          robot: 0, // TODO:robot
          transCode: sessionInfo.transCode || this.options.defaultTradeCode,
          transName: sessionInfo.transName || this.options.defaultTradeName,
          sessionJournalId: sessionJournalId, // 新生成的流水号
          virtualHuman: this.options.virtualPortrait,
          matchMode: this.options.matchMode, // TO式
          originJournalId: originJournalId, // 源流水号
          threePartsJoinAccount: this.threePartsJoinAccount, // 三方信息
          mainAgentId: mainAgentId, // 主座席Id
          whiteBoardRoomId: this.boardInfo ? this.boardInfo.roomId ? this.boardInfo.roomId : '' : ''
        }
      }).then(() => {
        // 拉人入群
        this.addTeamMembers({
          teamId: this.chatTeamId,
          accounts: [account]
        }).then(() => {
          // 拉人入群后，创建一条消息
          this.sendTeamChatTextActiveMessage()
        }).catch((e) => {
          logger.error(`CL-拉人入群失败；账号：${account}`, e)
          this.emit(ClientEvent.error, new IMError('IM-0012', e, account))
        })
      })
      if (this.options.callFlag === 2) {
        // 开启定时任务
        this.transferTimer = setTimeout(() => {
          this._cancleTransfer(account, true)
          this.emit(ClientEvent.transferBusy, account)
        }, (this.options.callTimeout || 180) * 1000)
      }
    }).catch(error => {
      logger.error(error)
      this.emit(ClientEvent.error, error)
      return error
    })
  }

  /**
   * 转接挂断
   *
   * @param {String} account 转接账号
   */
  cancelTransfer (account) {
    this._cancleTransfer(account, false)
  }

  /**
   * 转接挂断
   *
   * @param {String} inviteAccount 邀请账号
   * @param {Boolean} outTimeFlag 挂断类型 3 已分配主动挂断，4 已分配超时挂断
   */
  _cancleTransfer (inviteAccount, outTimeFlag) {
    // 调用取消服务
    const cancelData = {
      sessionJournalId: this.transferInfo.sessionJournalId,
      callType: '4',
      hanguper: this.options.im.account,
      hangupType: outTimeFlag === true ? '4' : '3' // 挂断类型 3已分配主动挂断，4已分配超时挂断
    }
    this.transferInfo = null
    // 清理转接定时器
    this._clearTransferTimer()
    service.cancel(cancelData).catch(error => {
      this.emit(ClientEvent.error, error)
    })
    // 根据呼叫类型获取会话信息
    var sessionInfo = this.callMode === 1 ? this.callInfo : this.calledInfo
    // 发送取消消息,通知被叫方通话已被取消
    this.imAdapter.sendSystemMessage(inviteAccount, {
      header: {
        type: constant.type.call,
        action: constant.action.callCancel
      },
      payload: {
        caller: this.options.im.account,
        callee: [inviteAccount],
        roomId: sessionInfo.roomId,
        sessionId: sessionInfo.sessionId
      }
    })
  }

  /**
   * IM系统消息事件处理
   *
   * @private
   * @param {Object} message 系统消息
   */
  _onIMSysMessageEvent (message) {
    logger.info("CL-收到业务消息",message)
    if (message && message.header) {
      const action = message.header.action
      switch (action) {
        // 接收到服务端的呼叫结果通知
        case constant.action.callResultNotify:
          this._onCallResultNotify(message)
          break
        // 接收到呼叫方的通话邀请
        case constant.action.callInvite:
          this._onCallInviteEvent(message)
          break
        // 接收到对方的通话拒绝
        case constant.action.callReject:
          this._onCallRejectEvent(message)
          break
        // 接收到对方的通话取消
        case constant.action.callCancel:
          this._onCallCanceldEvent(message)
          break
        // 接收到对方的通话繁忙
        case constant.action.callBusy:
          this._onCallBusyEvent(message)
          break
        // 三方座席接收到主座席转接通知
        case constant.action.callTransferNotify:
          this._onCallTransferNotifyEvent(message)
          break
        // 客户接收到座席开始投屏消息
        case constant.action.screenStart:
          this._onCallScreenStart(message)
          break
        // 客户接收到座席停止投屏消息
        case constant.action.screenStop:
          this._onCallScreenStop(message)
          break
        // 座席收到客户接受投屏消息
        case constant.action.screenAccept:
          this._onCallScreenAccept(message)
          break
        // 座席收到客户不接受投屏消息
        case constant.action.screenReject:
          this._onCallScreenReject(message)
          break
        // 客户接收到座席获取投屏请求消息
        case constant.action.obtainScreen:
          this._onCallObtainScreen(message)
          break
        // 客户收到座席投屏取消
        case constant.action.screenCancel:
          this._onCallScreenCancel(message)
          break
        // 客户同意座席的获取投屏请求
        case constant.action.screenAgree:
          this._onCallScreenAgree(message)
          break
        // 客户不同意座席的获取投屏请求
        case constant.action.screenDisAgree:
          this._onCallScreenDisAgree(message)
          break
        // 客户取消投自己屏幕
        case constant.action.customerScreenCancel:
          this._onCustomerCancelProScreen(message)
          break
          // 活体检测
        case constant.action.faceLiveness:
          this.emit(ClientEvent.faceLiveness,message.payload)
          break
          // 话术提示
        case constant.action.verbalTips:
          this.emit(ClientEvent.verbalTips,message.payload)
          break
          // 关闭页面
        case constant.action.busiClosePage:
          this.emit(ClientEvent.busiClosePage,message.payload)
          break
          // 推送页面
        case constant.action.busiPushPage:
          this.emit(ClientEvent.busiPushPage,message.payload)
          break
          // 推送数据
        case constant.action.busiPushData:
          this.emit(ClientEvent.busiPushData,message.payload)
          break
        default : 
          this.emit(ClientEvent.sysMessage,message)
      }
    }
  }

  /**
   * `通话-呼叫结果通知`消息处理</br>
   * 客户端收到该消息后会按照消息内容发送邀请通知
   *
   * @private
   * @param {Object} message 系统消息
   */
  _onCallResultNotify (message) {
    if(this.callStatus === callStatus.INIT){
      logger.error('CL-收到呼叫结果通知目前是初始化状态，不做处理callee=' + message.payload.callee )
      return;
    }
    if(this.callInfo.sessionJournalId!==message.payload.sessionJournalId){
      logger.error('CL-收到不是本次回话的匹配信息，不做处理' + message.payload.callee )
      return
    }
    logger.info('CL-收到呼叫结果通知；匹配账号：' + message.payload.callee)
    if (message && message.payload && this.callStatus !== callStatus.CANCELED) {
      this.callStatus = callStatus.ASSIGN
      // 合并返回结果到呼叫信息中
      const data = Object.assign(this.callInfo, message.payload)
      data.callee = data.callee || []
      // 加入房间
      let recordConfig = {
        recordVideo: this.options.netCall.recordVideo?1:0,//是否开启音频实时音录制，0不需要，1需要（默认0）
        recordAudio: this.options.netCall.recordAudio?1:0,//是否开启视频实时音录制，0不需要，1需要（默认0）
        recordType:this.options.netCall.recordType//录制模式，0混单（产生混合录制文件+单独录制文件） 1只混（只产生混合录制文件） 2只单（只产生单独录制文件）
      }
      this.netcallAdapter.joinRoom(data.roomId, recordConfig, this.callInfo.sessionType)
        .then((info) => { // TODO: 向被叫方发送邀请
          this.emit(ClientEvent.joinRoom, info)
          logger.info('CL-加入房间成功 房间号：' + data.roomId)
          if (this.callInfo.transPattern==2) {
            let params = {
              agentId: data.callee[0],
	            callType: 1,
	            channelType: 6,
	            customerId: "",
	            customerMobile: data.caller,
	            customerName: "",
	            deviceChannelType: 0,
	            originalSessionJournalId: "",
	            robotTransferFlag: "",
	            sessionHomeId: "",
	            sessionId: data.sessionId,
	            sessionJournalId: data.sessionJournalId
            }
            service.connected(params).then(result => {
              data.callee.forEach((callee) => {
                logger.info('CL-向 ' + callee + ' 发送邀请信息')
                this.imAdapter.sendSystemMessage(callee, {
                  header: {
                    type: constant.type.call,
                    action: constant.action.callInvite
                  },
                  payload: {
                    caller: data.caller, // 呼叫方账号
                    callee: data.callee, // 被叫方账号，可以同时邀请多名座席
                    roomId: data.roomId, // 房间号
                    teamId: this.chatTeamId, // 聊天室群id
                    sessionId: data.sessionId, // 当前会话ID
                    callType: data.callType, // 1-客户端主呼，2-座席端主呼，3-转接，4-三方 5-三方发起的三方或转接
                    sessionType: this.callInfo.sessionType, // 呼叫类型,1-音频，2-视频
                    callMode: sysConfig.useMode, // 呼叫模式
                    channelType: this.options.channelType, // 渠道类型
                    terminalType: this.options.terminalType, // 终端类型
                    customerMobile: this.options.mobile,
                    customerName: this.options.customerName,
                    customerId: this.options.customerId,
                    customerType: this.options.customerType,
                    customerLevel: this.options.customerLevel,
                    customerAccount: this.options.caller,
                    robot: 0, // TODO:robot
                    transCode: data.transCode || this.options.defaultTradeCode,
                    transName: data.transName || this.options.defaultTradeName,
                    sessionJournalId: data.sessionJournalId,
                    virtualHuman: this.options.virtualPortrait,
                    matchMode: this.options.matchMode,// TO式
                    custom: this.callInfo.custom
                  }
                }).then((msg) => {
  
                }).catch(error => {
                  // 加入房间
                  this.emit(ClientEvent.error, new IMError('NC-0004', error, data.roomId))
                })
              })
              this._clearTimer()
            })
          }else {
            // 创建群聊天室
            this.createTeam({
              name: 'chartRoom',
              accounts: data.callee // 被叫方账号数组
            }).then(msg => {
              this.chatTeamId = msg.team.teamId
              data.callee.forEach((callee) => {
                logger.info('CL-向 ' + callee + ' 发送邀请信息')
                this.imAdapter.sendSystemMessage(callee, {
                  header: {
                    type: constant.type.call,
                    action: constant.action.callInvite
                  },
                  payload: {
                    caller: data.caller, // 呼叫方账号
                    callee: data.callee, // 被叫方账号，可以同时邀请多名座席
                    roomId: data.roomId, // 房间号
                    teamId: this.chatTeamId, // 聊天室群id
                    sessionId: data.sessionId, // 当前会话ID
                    callType: data.callType, // 1-客户端主呼，2-座席端主呼，3-转接，4-三方 5-三方发起的三方或转接
                    sessionType: this.callInfo.sessionType, // 呼叫类型,1-音频，2-视频
                    callMode: sysConfig.useMode, // 呼叫模式
                    channelType: this.options.channelType, // 渠道类型
                    terminalType: this.options.terminalType, // 终端类型
                    customerMobile: this.options.mobile,
                    customerName: this.options.customerName,
                    customerId: this.options.customerId,
                    customerType: this.options.customerType,
                    customerLevel: this.options.customerLevel,
                    customerAccount: this.options.caller,
                    robot: 0, // TODO:robot
                    transCode: data.transCode || this.options.defaultTradeCode,
                    transName: data.transName || this.options.defaultTradeName,
                    sessionJournalId: data.sessionJournalId,
                    virtualHuman: this.options.virtualPortrait,
                    matchMode: this.options.matchMode,// TO式
                    custom: this.callInfo.custom
                  }
                }).then((msg) => {

                }).catch(error => {
                  // 加入房间
                  this.emit(ClientEvent.error, new IMError('NC-0004', error, data.roomId))
                })
              })
              // 创建房间结束后立即发一条通知消息
              this.sendTeamChatTextActiveMessage()
              //开启呼叫倒计时
              this._callTimerHandler()
            })
          }
        })
        .catch(error => {
          this.emit(ClientEvent.error, new IMError('NC-0004', error, data.roomId))
        })
    }
  }

  /**
   * `通话-邀请`消息处理</br>
   * 客户端接收到通话邀请
   *
   * @private
   * @param {Object} message 系统消息
   */
  _onCallInviteEvent (message) {
    logger.info('CL-接收到来自 ' + message.payload.caller + ' 的邀请消息')
    if (this.callInfo.caller==message.payload.caller) {
      logger.info('收到自己账号的通话邀请')
      return
    }
    if (this.callStatus === callStatus.INIT) {
      this.callMode = 2
      this.callStatus = callStatus.ASSIGN
      // 存放被叫信息
      this.calledInfo = message.payload
      this.chatTeamId = message.payload.teamId
      if(this.calledInfo.whiteBoardRoomId && this.calledInfo.whiteBoardRoomId !== ''){
        this.boardInfo = {
          roomId: this.calledInfo.whiteBoardRoomId
        }
      }
      // 触发被叫事件
      this.emit(ClientEvent.called, this.calledInfo)
    } else {
      this._busy(message.payload)
    }
  }

  /**
   * 发送繁忙消息
   *
   * @param {Object} data 收到的邀请信息
   */
  _busy (data) {
    logger.info('CL-向' + data.caller + ' 发送繁忙消息')
    this.imAdapter.sendSystemMessage(data.caller, {
      header: {
        type: constant.type.call,
        action: constant.action.callBusy
      },
      payload: {
        caller: data.caller,
        callee: [this.options.im.account],
        roomId: data.roomId,
        sessionId: data.sessionId
      }
    })
    if (data.teamId) {
      // 离开群聊
      this.leaveTeam(data.teamId)
    }
  }

  /**
   * `通话-拒绝`消息处理</br>
   *
   * @private
   * @param {Object} message 系统消息
   */
  _onCallRejectEvent (message) {
    if (this.callStatus !== callStatus.BUSY) {
      logger.info('CL-收到来自' + message.payload.callee[0] + ' 的拒绝消息')
      // 退出房间
      this.leaveRoom()
      // 离开群聊
      this.leaveTeam()
      // 清理数据及状态
      this._clear(callStatus.INIT)
      // 触发`通话-拒绝`事件
      this.emit(ClientEvent.reject, message.payload)
    } else {
      if (this.transferInfo && this.transferInfo.account === message.payload.callee[0]) {
        // 转接拒绝
        this.transferInfo = null
        // 清理转接定时器
        this._clearTransferTimer()

        this.emit(ClientEvent.transferReject, message.payload.callee[0])
      } else {
        this._onClearThreePartINFO(message.payload.callee[0])
        // 三方拒绝
        this.emit(ClientEvent.threePartReject, message.payload.callee[0])
      }
    }
  }

  /**
   * `通话-取消`消息处理</br>
   *
   * @private
   * @param {Object} message 系统消息
   */
  _onCallCanceldEvent (message) {
    logger.info('CL-收到来自 ' + message.payload.callee[0] + ' 的通话取消消息')
    // 清理呼叫超时任务
    clearTimeout(this.callTimeout)
    // 离开群聊
    this.leaveTeam()
    // 触发取消事件
    this.emit(ClientEvent.cancel, message.payload)
    // 清理数据及状态
    this._clear(callStatus.INIT)
  }

  /**
   * `通话-繁忙`消息处理</br>
   *
   * @private
   * @param {Object} message 系统消息
   */
  _onCallBusyEvent (message) {
    if (this.callStatus !== callStatus.BUSY) {
      logger.info(`CL-收到来自 ${message.payload.callee[0]} 的繁忙消息`)
      // 退出房间
      this.leaveRoom()
      // 离开群聊
      this.leaveTeam()
      // 清理数据及状态
      this._clear(callStatus.INIT)
      this.emit(ClientEvent.busy, message.payload)
    } else {
      if (this.transferInfo && this.transferInfo.account === message.payload.callee[0]) {
        // 转接拒绝
        this.transferInfo = null
        // 清理转接定时器
        this._clearTransferTimer()
        this.emit(ClientEvent.transferBusy, this.transferInfo.account)
      } else {
        // 三方拒绝
        // 清理三方数据
        this._onClearThreePartINFO(message.payload.callee[0])
        this.emit(ClientEvent.threePartBusy, message.payload.callee[0])
      }
    }
  }

  /**
   * 清除三方信息和定时任务
   *
   * @param {String}  account 三方账号
   */
  _onClearThreePartINFO (account) {
    for (let index = 0; index < this.threePartsUnJoinInfo.length; index++) {
      var accountInfo = this.threePartsUnJoinInfo[index]
      if (accountInfo.account === account) {
        this.threePartsUnJoinInfo.splice(index, 1)
        break
      }
    }
    // 清除指定三方账号的定时任务
    this._clearThreePartTimer(account)
  }

  /**
   * 三方座席接收到主座席转接通知 需要挂断上笔会话  并且开始新的会话和更新原流水和主座席号
   *
   * @param {Object} messsage  接收到的消息
   *
   */
  _onCallTransferNotifyEvent (messsage) {
    var callType = this.calledInfo.callType
    var hangupData = {
      sessionJournalId: this.calledInfo.sessionJournalId,
      agentId: this.calledInfo.callee,
      callType: callType === '5' ? '4' : callType,
      evaluate: 0,
      mobile: this.calledInfo.customerAccount,
      sessionStatus: 1
    }
    if (callType === '3' || callType === '4' || callType === '5') {
      hangupData.originalSessionJournalId = this.calledInfo.originJournalId
    }
    // 调用上笔会话挂断接口
    service.hangup(hangupData).catch(error => {
      this.emit(ClientEvent.error, error)
    })
    this.calledInfo.mainAgentId = messsage.payload.turnAccount || ''
    this.calledInfo.originJournalId = messsage.payload.turnJournalId || ''
    // 调用开始新会话接口（接通接口）
    // 调用通话建立接口
    this._onConnectService()
    // this.calledInfo.sessionJournalId
  }

  /**
   * 客户接收到座席开始投屏消息
   *
   * @param {Object} message 消息
   */
  _onCallScreenStart (message) {
    this.emit(ClientEvent.screenStart, message.payload.sender)
  }

  /**
   * 客户收到座席停止投屏
   *
   * @param {Object}} message 收到的消息
   */
  _onCallScreenStop () {
    this.emit(ClientEvent.screenStop)
  }

  /**
   * 座席收到客户接受投屏
   *
   * @param {Object}} message 收到的消息
   */
  _onCallScreenAccept () {
    this.emit(ClientEvent.screenAccept)
  }

  /**
   * 座席收到客户不接受投屏
   *
   * @param {Object}} message 收到的消息
   */
  _onCallScreenReject () {
    this.emit(ClientEvent.screenReject)
  }

  /**
   * 客户收到座席發送的投屏请求
   *
   * @param {Object} message 消息体
   */
  _onCallObtainScreen (message) {
    this.emit(ClientEvent.obtainScreen, message.payload.sender)
  }

  /**
   * 客户收到座席發送的取消投屏请求 取消座席的屏幕
   *
   * @param {Object} message 消息体
   */
  _onCallScreenCancel () {
    this.sendCustomerScreenCancle()
  }

  /**
   * 座席收到客户同意座席获取投屏
   */
  _onCallScreenAgree () {
    this.emit(ClientEvent.screenAgree)
  }

  /**
   * 座席收到客户不同意座席获取投屏
   */
  _onCallScreenDisAgree () {
    this.emit(ClientEvent.screenDisAgree)
  }

  /**
   * 客戶取消投屏
   */
  _onCustomerCancelProScreen () {
    this.emit(ClientEvent.customerCancelProScreen)
  }

  /**
   * 收到白板邀请
   *
   * @param {Object} message 收到的消息
   */
  _onBoardInvite (message) {
    var data = message.payload
    this.boardInfo = {
      ownerAccount: data.OWNER,
      roomId: data.CHANNELNAME
    }
    this.emit(ClientEvent.receiveBoardInvite)
  }

  /**
   * 探测用户的当前 网络情况，判断是否能够正常的进行音视频通话。（该方法需要使用摄像头，请在音视频通话前使用该接口）
   *
   * @param {Integer} [detectTime=20] 探测的时间，[建议 15s 以上]
   * @param {Boolean} [fromDevice=true] 探测源使用摄像头，设置为 true
   * @returns {Promise} Promise实例
   */
  detectNetwork (detectTime, fromDevice) {
    return this.netcallAdapter.detectNetworkStatus(detectTime, fromDevice)
  }

  _check (methodName) {
    // if (!this.logined) {
    //   throw new ClientError('CL-0001', methodName)
    // }
  }
  /**
   * 同步完成
   *
   * @param {*} data 同步推流等数据
   */
  _onNetcallSyncDone(data){
    this.emit(ClientEvent.syncDone, data)
  }

  /**
   * 用户加入并产生流
   *
   * @param {*} data 加入流产生数据
   */
  _onNetcallRemoteTrack (data) {
    if (this.callStatus !== callStatus.BUSY) {
      this.callStatus = callStatus.BUSY
      // 第一个用户进入需要调用通话建立接口
    }
    this.agentAccounts.push(data.account)
    this._clearTimer()
    this.emit(ClientEvent.remoteTrack, data)
  }

  _onNetcallJoinChannel(data){
    this.emit(ClientEvent.joinChannel, data)
  }

  /**
   * 通知三方座席反生转接
   */
  _notifyThreeAccount () {
    for (let i = 0; i < this.threePartsJoinAccount.length; i++) {
      const threeAccount = this.threePartsJoinAccount[i]
      this.imAdapter.sendSystemMessage(threeAccount, {
        header: {
          type: constant.type.call,
          action: constant.action.callTransferNotify
        },
        payload: {
          caller: this.options.im.account,
          callee: [threeAccount],
          turnAccount: this.transferInfo.account, // 转接后的账户信息
          turnJournalId: this.transferInfo.sessionJournalId // 发起转接时的流水号
        }
      })
    }
  }

  /**
   * 调用通话建立接口
   */
  _onConnectService () {
    var sessionInfo = this.callMode === 1 ? this.callInfo : this.calledInfo
    var callType = sessionInfo.callType
    const connectData = {
      agentId: this.options.im.account,
      callType: callType === '5' ? '4' : callType,
      sessionJournalId: sessionInfo.sessionJournalId,
      channelType: this.options.channelType, // 会话渠道
      customerId: sessionInfo.customerAccount,
      customerMobile: sessionInfo.customerMobile,
      customerName: sessionInfo.customerName,
      deviceChannelType: this.options.terminalType,
      robotTransferFlag: this.options.robotTransfer || 2,
      sessionHomeId: sessionInfo.roomId,
      sessionId: sessionInfo.sessionId // 会话编号
    }
    // 三方需要上送原流水号
    if (callType === '3' || callType === '4' || callType === '5') {
      connectData.originalSessionJournalId = sessionInfo.originJournalId
    }
    // 会话建立失败
    service.connect(connectData).catch(error => {
      this.emit(ClientEvent.error, error)
    })
  }

  /**
   * 监听用户离开时间
   *
   * @param {*} data 离开产生数据
   */
  _onNetcallLeaveChannel (data) {
    // 判断是否座席
    for (let index = 0; index < this.agentAccounts.length; index++) {
      const temp = this.agentAccounts[index]
      if (temp === data.account) {
        this.agentAccounts.splice(index, 1)
      }
    }
    this.emit(ClientEvent.leaveChannel, data)
  }

  /**
   * 音频切换到视频消息事件
   */
  _onNetcallAudioToVideo () {
    this.emit(ClientEvent.audioToVideo)
  }

  /**
   * 同意音频切换到视频事件
   */
  _onNetcallAudioToVideoAgree () {
    this.emit(ClientEvent.audioToVideoAgree)
  }

  /**
   * 视频切换到音频消息事件
   */
  _onNetcallVideoToAudio () {
    this.emit(ClientEvent.videoToAudio)
  }

  // 文档上传上传成功通知事件
  _onNotifyTransLog () {

  }

  // 文档选择事件
  _onEventSelectDoc () {
    this.emit(ClientEvent.selectDoc)
  }

  /**
   * 文件上传进度条监听
   *
   * @param {Object} data 返回数据
   */
  _onUploadPercent (data) {
    this.emit(ClientEvent.uploadPercent, data)
  }

  /**
   * 文件上传转码完成事件
   *
   * @param {Object} data 返回数据
   */
  _onEventPreview (data) {
    this.emit(ClientEvent.preview, data)
  }

  /**
   * 离开房间
   *
   */
  leaveRoom () {
    this.netcallAdapter.leaveRoom().catch(error => {
      logger.error('CL-离开房间失败 聊天号：' + this.callInfo.roomId)
      this.emit(ClientEvent.error, new IMError('NC-0005', error, this.callInfo.roomId))
    })
  }

  /**
   * 通话过程控制
   *
   * @param {Number} command 音转频，频转音
   * @param {String} channelId 通话id
   * @returns {Promise} Promise实例
   */
  switchAVControl (command, channelId) {
    return this.netcallAdapter.switchAVControl(command, channelId)
  }

  /**
   * 聊天消息事件
   *
   * @param {Object} message 聊天消息
   */
  _onIMChatMessageEvent (message) {
    const action = message.header.action
    if (action === 'CHAT_TEAM') {
      if (message && message.payload && message.payload.content &&
          message.payload.content.action !== true && message.header.to === this.chatTeamId) {
        // 将message抛给上层进行处理
        this.emit(ClientEvent.chatTeamMessage, message)
      }
    }
  }

  /**
   * 创建群
   *
   * @param {Object} teamInfo 群信息
   * @param {String} [teamInfo.name=''] 群名称
   * @param {String} [teamInfo.avatar=avatar] 群头像
   * @param {Array<String>} [teamInfo.accounts=[]] 成员账号列表
   * @param {Integer} [teamInfo.level=50] 群成员上限
   * @param {String} [teamInfo.intro=''] 群简介
   * @returns {Promise} Promise实例
   */
  createTeam (teamInfo) {
    return this.imAdapter.createTeam(teamInfo)
  }

  /**
   * 解散群
   *
   * @param {String} teamId 群ID,如果不传，使用对象中保存的teamId
   * @returns {Promise} Promise实例
   * {@link https://dev.yunxin.163.com/docs/product/IM即时通讯/SDK开发集成/Web开发集成/群组功能?#解散群|网易IM即时通讯}
   */
  dismissTeam (teamId) {
    if (!teamId) {
      teamId = this.chatTeamId
    }
    return this.imAdapter.dismissTeam(this.chatTeamId)
  }

  /**
   * 主动退群
   *
   * @param {String} teamId 群ID
   * @returns {Promise} Promise实例
   * {@link https://dev.yunxin.163.com/docs/product/IM即时通讯/SDK开发集成/Web开发集成/群组功能?#主动退群|网易IM即时通讯}
   */
  leaveTeam (teamId) {
    if (!teamId) {
      teamId = this.chatTeamId
    }
    if(!teamId){
      return
    }
    return this.imAdapter.leaveTeam(teamId).catch(error => {
      logger.error('CL-离开群聊失败 聊天室Id：' + teamId)
      this.emit(ClientEvent.error, new IMError('IM-0011', error, teamId))
    })
  }


  /**
   * 拉人入群
   *
   * @param {Object} teamInfo 群信息
   * @param {String} teamInfo.teamId 群ID
   * @param {Array<String>} teamInfo.accounts 入群成员列表
   * @returns {Promise} Promise实例
   */
  addTeamMembers (teamInfo) {
    if (teamInfo && !teamInfo.teamId) {
      teamInfo.teamId = this.chatTeamId
    }
    return this.imAdapter.addTeamMembers(teamInfo)
  }

  /**
   * 发送群消息消息-普通文本
   *
   * @param {Object|String} content 发送内容,JSON对象或者JSON格式字符串
   * @param {BOOlean} isActive 启用
   * @returns {Promise} Promise实例对象
   */
  sendTeamChatTextMessage (content) {
    var message = {
      header: {
        type: constant.type.chat,
        action: constant.action.chatTeam,
        chatType: 'TEXT',
        from: this.options.caller,
        to: this.chatTeamId
      },
      payload: {
        content: content,
        useMode: this.options.useMode
      }
    }
    return this.imAdapter.sendTeamChatTextMessage(this.chatTeamId, message)
  }

  /**
   * 发送激活群消息消息
   *
   * @param {Object|String} content 发送内容,JSON对象或者JSON格式字符串
   * @param {BOOlean} isActive 启用
   * @returns {Promise} Promise实例对象
   */
  sendTeamChatTextActiveMessage () {
    var message = {
      header: {
        type: constant.type.chat,
        action: constant.action.chatTeamActive
      }
    }
    return this.imAdapter.sendTeamChatTextMessage(this.chatTeamId, message)
  }
  /**
   * 发送自定义消息、
   * @param {String} account 对方账号
   * @param {Object} content 发送内容
   * @returns {Promise} Promise实例对象
   */
  sendSystemMessage (account, content) {
    if(!account){
      return new ClientError('CL-0003')
    }
    return this.imAdapter.sendSystemMessage(account, content)
  }
  /**
   * 小程序请求方法
   *  @param {Object} config 请求内容跟小程序请求参数一样
   *  @returns {Promise} Promise实例对象
   */
  request(config){
    if(!config.url){
      logger.error("CL-请求url不能为空")
      return Promise.reject("请求url不能为空")
    }
    const defConfig={
      method:config.method||'POST',
      timeout:this.options.timeout||60000,
    }
    config = deepMerge(defConfig,config)
    return http.request(config.method,config.url,config.data,config)
  }

    /**
   * 小程序刷新token
   *  @returns {Promise} Promise实例对象
   */
  refreshToken(){
    return http.refreshToken()
  }
  /**
   * 上传文件
   *  @param {Object} config 上传字段一样
   *  @returns {Promise} Promise实例对象
   */
  uploadFile(config){
    if(!config.url){
      return Promise.reject("url地址不能为空")
    }
    if(!config.filePath){
      return Promise.reject("文件地址不能为空")
    }
    if(!config.name){
      return Promise.reject("文件名字不能为空")
    }
    return http.uploadFile(config)
  }

  _onNetcallError(data) {
    logger.error("index.netcallError",data)
    this.emit(ClientEvent.netcallError, data)
  }
}

export default Client
