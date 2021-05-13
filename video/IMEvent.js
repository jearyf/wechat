/**
 * IM连接回调函数
 *
 * @event IMEvent#CONNECT
 * @type {Object}
 * @property {String} lastLoginDeviceId 上次登录的设备的设备号
 * @property {String} customTag 客户端自定义tag
 * @property {String} connectionId 本次登录的连接号
 * @property {String} ip 客户端IP
 * @property {String} port 客户端端口
 * @property {String} country 本次登录的国家
 */

/**
 * 重新链接事件
 *
 * @event IMEvent#RECONNECT
 * @type {Object}
 * @property {String} duration 距离下次重连的时间
 * @property {String} retryCount 重连尝试的次数
 */

/**
 * 断开链接事件
 *
 * @event IMEvent#DISCONNECT
 * @type {Object}
 * @property {String} code 连接错误码，302-账号或者密码错误,417-重复登录, 已经在其它端登录了,kicked-被踢
 */

/**
 * 聊天消息事件
 *
 * @event IMEvent#CHAT_MESSAGE
 * @type {Object}
 * @property {Object} header 消息头
 * @property {String} header.type=CHAT 消息类型为：聊天消息
 * @property {String} header.action 消息行为：CHAT_P2P-点对点聊天消息，CHAT_TEAM-群聊消息
 * @property {String} header.chatType 聊天消息类型：TEXT-文本聊天消息
 * @property {Object} payload 消息体
 */

/**
 * 聊天消息事件
 *
 * @event IMEvent#SYSTEM_MESSAGE
 * @type {Object}
 * @property {Object} header 消息头
 * @property {String} header.type 消息类型
 * @property {String} header.action 消息行为
 * @property {Object} payload 消息体
 */

/**
 * 异常事件
 *
 * @event IMEvent#ERROR
 * @type {Error}
 */

export default {
  connect: 'connect',
  reconnect: 'reconnect',
  disconnect: 'disconnect',
  chatMessage: 'chatMessage',
  sysMessage: 'sysMessage',
  error: 'error'
}
