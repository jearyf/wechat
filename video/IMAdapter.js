import NIM from './libs/NIM_Web_NIM_miniapp_v8.2.0.js'
import EventEmitter from './events/index'
import { IMError } from './error/index'
import constant from './constant'
import IMEvent from './IMEvent'
import log from './log/index'
/**
 * 网易IM适配器
 *
 * @class IMAdapter
 * @extends EventEmitter
 * @since 1.0.0
 * @author jiazw
 * @author heclb
 * {@link https://dev.yunxin.163.com/docs/product/IM即时通讯/SDK开发集成/Web开发集成|网易IM即时通讯}
 */
export default class IMAdapter extends EventEmitter {
  /**
   * 构造函数
   *
   * @constructs
   * @param {Object} options 参数配置
   */
  constructor (options) {
    super()
    options.debug = options.debug || false
    if (!options) {
      return new IMError('IM-0001')
    }
    if (!options.appKey) {
      return new IMError('IM-0002')
    }
    if (!options.token) {
      return new IMError('IM-0003')
    }
    if (!options.account) {
      return new IMError('IM-0004')
    }
    this.options = options
    // 网易原始IM对象
    this.im = null
    // 登录成功返回值
    this.connectResult = null
    // 当前通话数据
    this.currentCall = null
  }

  /**
   * 获取IM适配器单例对象
   *
   * @param {Object} options 参数配置
   * @returns {IMAdapter} IM适配器
   */
  static getInstance (options) {
    if (!this.instance) {
      this.instance = new IMAdapter(options)
    }
    return this.instance
  }

  /**
   * 获取源IM实例
   *
   * @returns {NIM} 获取原始IM对象
   */
  getOriginalIm () {
    return this.im
  }

  /**
   * IM登录
   *
   * @returns {Promise} Promise实例
   */
  login () {
    return new Promise((resolve, reject) => {
      // 初始化SDk
      this.im = NIM.getInstance({
        debug: this.options.debug, // 是否开启日志
        appKey: this.options.appKey, // 在云信管理后台查看应用的 appKey
        token: this.options.token, // 帐号的 token, 用于建立连接
        account: this.options.account, // 帐号, 应用内唯一
        privateConf: this.options.privateConf || {}, // 私有化环境
        promise: true,
        // transports: ['websocket'], // 用于建立长连接的协议数组，可不填，默认为['websocket', 'xhr-polling']
        syncSessionUnread: true, // 同步未读数
        onconnect: (result) => {
          log.info("IM-连接建立成功",result)
          this._onConnect(result)
          resolve(result)
        }, // 连接建立后的回调(登录成功), 会传入一个对象, 包含登录的信息
        onwillreconnect: this._onWillReconnect.bind(this), // 即将重连的回调
        ondisconnect: (error) => {
          log.error("IM-连接断开",error)
          this._onDisconnect(error)
          reject(error)
        }, // 断开连接后的回调
        onerror: (error) => {
          log.error("IM-发生错误",error)
          this._onError.bind(this)
          reject(error)
        }, // 发生错误的回调, 会传入错误对象
        onloginportschange:(result)=>{
          log.info("IM-其他端登录情况",result)
        },//多端登录回调
        oncustomsysmsg: this._onSystemMessage.bind(this), // 自定消息
        onofflinecustomsysmsgs:  this._onLineSystemMessage.bind(this),
        onmsg: this._onChatMessage.bind(this) //
      })
    })
  }

  /**
   * 退出登录
   *
   * @returns {Promise} Promise实例
   */
  logout () {
    if (this.im) {
      return new Promise((resolve, reject) => {
        this.im.destroy({
          done () {
            this.connectResult = null
            this.im = null
            resolve(true)
          }
        })
      })
    } else {
      this.connectResult = null
      return Promise.resolve(true)
    }
  }

  /**
   * 发送系统消息
   *
   * @param {String} account 目标账号
   * @param {Object|String} content 发送内容,JSON对象或者JSON格式字符串
   * @returns {Promise} Promise实例对象
   * {@link https://dev.yunxin.163.com/docs/product/IM即时通讯/SDK开发集成/Web开发集成/消息收发?#发送消息|网易IM即时通讯}
   */
  sendSystemMessage (account, content) {
    log.info("发送系统消息account="+account,content)
    wx.setStorageSync('contentvalue', content)
    if (!account) {
      return Promise.reject(new IMError('IM-0004'))
    }
    let c = content
    if (typeof (content) !== 'string') {
      try {
        c = JSON.stringify(content)
      } catch (e) {
        return Promise.reject(new IMError('IM-0005'))
      }
    }
    return this._sendSystemMessage(account, c)
  }

  /**
   * 发送普通文本消息
   *
   * @param {String} account 目标账号
   * @param {Object|String} content 发送内容,JSON对象或者JSON格式字符串
   * @returns {Promise} Promise实例对象
   * {@link https://dev.yunxin.163.com/docs/product/IM即时通讯/SDK开发集成/Web开发集成/消息收发?#发送消息|网易IM即时通讯}
   */
  sendP2PChatTextMessage (account, content) {
    if (!account) {
      return Promise.reject(new IMError('IM-0004'))
    }
    let c = content
    if (typeof content !== 'string') {
      try {
        c = JSON.stringify(content)
      } catch (e) {
        return Promise.reject(new IMError('IM-0005'))
      }
    }
    return this._sendChatTextMessage(account, c)
  }

  /**
   * 发送群消息消息-普通文本
   *
   * @param {String} teamId 群ID
   * @param {Object|String} content 发送内容,JSON对象或者JSON格式字符串
   * @returns {Promise} Promise实例对象
   * {@link https://dev.yunxin.163.com/docs/product/IM即时通讯/SDK开发集成/Web开发集成/群组功能?#发送群消息|网易IM即时通讯}
   */
  sendTeamChatTextMessage (teamId, content) {
    if (!teamId) {
      return Promise.reject(new IMError('IM-0006'))
    }
    let c = content
    if (typeof content !== 'string') {
      try {
        c = JSON.stringify(content)
      } catch (e) {
        return Promise.reject(new IMError('IM-0005'))
      }
    }
    return this._sendTeamChatTextMessage(teamId, c)
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
   * {@link https://dev.yunxin.163.com/docs/product/IM即时通讯/SDK开发集成/Web开发集成/群组功能?#创建群|网易IM即时通讯}
   */
  createTeam (teamInfo) {
    if (!teamInfo.accounts) {
      return Promise.reject(new IMError('群成员列表必须存在'))
    }
    return new Promise((resolve, reject) => {
      this.im.createTeam({
        type: 'normal',
        name: teamInfo.name || '', // 群名称
        avatar: teamInfo.avatar || 'avatar', // 群头像
        accounts: teamInfo.accounts || [],
        // owner: teamInfo.owner || '', // 群主
        level: 50, // 群人数上限
        intro: '', // 群简介
        // joinMode: 'noVerify', // 群加入方式有以下几种'noVerify' (不需要验证);'needVerify' (需要验证);'rejectAll' (禁止任何人加入)
        // beInviteMode: 'noVerify', // 群被邀请模式有以下几种:'needVerify' (需要邀请方同意);'noVerify' (不需要邀请方同意)
        // inviteMode: 'all', // 群邀请模式有以下几种:'manager' (只有管理员/群主可以邀请他人入群);'all' (所有人可以邀请他人入群)
        done: (error, msg) => {
          if (error) {
            reject(error)
          } else {
            resolve(msg)
          }
        }
      })
    })
  }

  /**
   * 解散群
   *
   * @param {String} teamId 群ID
   * @returns {Promise} Promise实例
   * {@link https://dev.yunxin.163.com/docs/product/IM即时通讯/SDK开发集成/Web开发集成/群组功能?#解散群|网易IM即时通讯}
   */
  dismissTeam (teamId) {
    if (!teamId) {
      return Promise.reject(new IMError('IM-0006'))
    }
    return new Promise((resolve, reject) => {
      this.im.dismissTeam({
        teamId: teamId,
        done: (error, msg) => {
          if (error) {
            reject(error)
          } else {
            resolve(msg)
          }
        }
      })
    })
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
      return Promise.reject(new IMError('IM-0006'))
    }
    return new Promise((resolve, reject) => {
      this.im.leaveTeam({
        teamId: teamId,
        done: (error, msg) => {
          if (error) {
            reject(error)
          } else {
            resolve(msg)
          }
        }
      })
    })
  }

  /**
   * 拉人入群
   *
   * @param {Object} teamInfo 群信息
   * @param {String} teamInfo.teamId 群ID
   * @param {Array<String>} teamInfo.accounts 入群成员列表
   * @returns {Promise} Promise实例
   * {@link https://dev.yunxin.163.com/docs/product/IM即时通讯/SDK开发集成/Web开发集成/群组功能?#拉人入群|网易IM即时通讯}
   */
  addTeamMembers (teamInfo) {
    if (!teamInfo) {
      return Promise.reject(new IMError('IM-0007'))
    }
    if (!teamInfo.teamId) {
      return Promise.reject(new IMError('IM-0006'))
    }
    if (!teamInfo.accounts || !Array.isArray(teamInfo.accounts) || teamInfo.accounts.length === 0) {
      return Promise.reject(new IMError('IM-0008'))
    }
    if (teamInfo) {
      return new Promise((resolve, reject) => {
        this.im.addTeamMembers({
          teamId: teamInfo.teamId,
          accounts: teamInfo.accounts || [],
          done: (error, msg) => {
            if (error) {
              reject(error)
            } else {
              resolve(msg)
            }
          }
        })
      })
    }
  }

  /**
   * 发送系统消息
   *
   * @private
   * @param {String} account 目标账号
   * @param {Object|String} content 消息内容,JSON对象或者JSON格式字符串
   * @returns {Promise} Promise对象
   */
  _sendSystemMessage (account, content) {
    return new Promise((resolve, reject) => {
      this.im.sendCustomSysMsg({
        scene: 'p2p',
        to: account,
        content: content,
        sendToOnlineUsersOnly: true,
        apnsText: content,
        done: (error, msg) => {
          if (error) {
            reject(error)
          } else {
            resolve(msg)
          }
        }
      })
    })
  }

  /**
   * 发送文本消息
   *
   * @private
   * @param {String} account 目标账号
   * @param {String} content 消息内容
   * @returns {Promise} Promise对象
   */
  _sendP2PChatTextMessage (account, content) {
    return new Promise((resolve, reject) => {
      this.im.sendText({
        scene: 'p2p',
        to: account,
        text: content,
        done: (error, msg) => {
          if (error) {
            reject(error)
          } else {
            resolve(msg)
          }
        }
      })
    })
  }

  /**
   * 发送群消息-文本
   *
   * @private
   * @param {String} teamId 群ID
   * @param {String} content 消息内容
   * @returns {Promise} Promise对象
   */
  _sendTeamChatTextMessage (teamId, content) {
    return new Promise((resolve, reject) => {
      this.im.sendText({
        scene: 'team',
        to: teamId, // 群ID
        text: content,
        done: (error, msg) => {
          if (error) {
            reject(error)
          } else {
            resolve(msg)
          }
        }
      })
    })
  }

  /**
   * IM连接回调函数
   *
   * @private
   * @param {Object} result 连接回调结果
   * @param {String} result.lastLoginDeviceId 上次登录的设备的设备号
   * @param {String} result.customTag 客户端自定义tag
   * @param {String} result.connectionId 本次登录的连接号
   * @param {String} result.ip 客户端IP
   * @param {String} result.port 客户端端口
   * @param {String} result.country 本次登录的国家
   * @fires IMEvent#CONNECT
   */
  _onConnect (result) {
    this.connectResult = result
    this.emit(IMEvent.connect, result)
  }

  /**
   * 将要重连回调函数
   *
   * @private
   * @param {String} result 将要重连回调结果
   * @param {String} result.duration 距离下次重连的时间
   * @param {String} result.retryCount 重连尝试的次数
   * @fires IMEvent#RECONNECT
   */
  _onWillReconnect (result) {
    log.warn("IM-开始重新连接",result)
    // 此时说明 SDK 已经断开连接, 请开发者在界面上提示用户连接已断开, 而且正在重新建立连接
    this.emit(IMEvent.reconnect, result)
  }

  /**
   * 断开链接回调函数
   *
   * @private
   * @param {Object} result 断开链接回调结果
   * @param {String} result.code 连接错误码，302-账号或者密码错误,417-重复登录, 已经在其它端登录了,kicked-被踢
   * @fires IMEvent#DISCONNECT
   */
  _onDisconnect (result) {
    // 此时说明 SDK 处于断开状态, 开发者此时应该根据错误码提示相应的错误信息, 并且跳转到登录页面
    this.emit(IMEvent.disconnect, result)
  }

  /**
   * 发生异常回调函数
   *
   * @private
   * @param {Error} e 异常对象
   * @fires IMEvent#ERROR
   */
  _onError (e) {
    this.emit(IMEvent.error, new IMError('IM-0010', e))
  }

  _onLineSystemMessage(lineSysMsg){
    log.info("IM-收到离线消息",lineSysMsg)
    for (let index = 0; index < lineSysMsg.length; index++) {
      const msg = lineSysMsg[index];
      this._onSystemMessage(msg)
    }
  }
  /**
   * 收到系统消息消息
   *
   * @private
   * @param {Object} sysMsg 系统消息
   * @fires IMEvent#SYSTEM_MESSAGE
   * {@link https://dev.yunxin.163.com/docs/product/IM即时通讯/SDK开发集成/Web开发集成/消息收发#消息对象|网易IM即时通讯}
   */
  _onSystemMessage (sysMsg) {
    log.info("IM-收到系统消息",sysMsg)
    if (sysMsg.scene === 'p2p' && sysMsg.content) {
      let content = sysMsg.content
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content)
        } catch (e) {
          log.error("IM-消息解析错误",e)
          this.emit(IMEvent.error, new IMError('IM-0009', e))
        }
      }
      this.emit(IMEvent.sysMessage, content)
    }
  }

  /**
   * 聊天消息回调方法
   *
   * @private
   * @param {Object} msg 消息对象
   * @fires IMEvent#CHAT_MESSAGE
   * {@link https://dev.yunxin.163.com/docs/product/IM即时通讯/SDK开发集成/Web开发集成/消息收发#消息对象|网易IM即时通讯}
   */
  _onChatMessage (msg) {
    log.info("IM-收到聊天消息",msg)
    const type = 'CHAT'
    let action = null
    // 如果是team消息则表示群id，如果是P2P消息则表示对方账号
    const to = msg.to
    if (msg.scene === 'team') {
      action = 'CHAT_TEAM'
    } else if (msg.scene === 'p2p') {
      action = 'CHAT_P2P'
    }
    let chatType = null
    let content = null
    switch (msg.type) {
      case 'text':
        chatType = msg.type.toUpperCase()
        content = msg.text
        if (typeof content === 'string') {
          try {
            content = JSON.parse(content)
          } catch (e) {
            this.emit(IMEvent.error, new IMError('IM-0009', e))
          }
        }
        break
      default:
        break
    }
    if (content && content.header && content.header.action === constant.action.chatTeamActive) {
      log.info('收到激活群聊消息')
    } else {
      log.info('接收到聊天消息:', content)
      if (action && chatType) {
        this.emit(IMEvent.chatMessage, content)
      }
    }
  }
}
