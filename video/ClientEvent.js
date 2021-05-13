/**
 * 通话拒绝
 *
 * @event ClientEvent#reject
 * @type {Object}
 * @property {String} callee 呼叫方账号
 * @property {String} roomId 房间号
 * @property {String} sessionId 会话ID
 * @property {String} sessionJournalId 会话流水ID
 */

export default {
  error: 'error', // 异常
  timeoutTip: 'timeoutTip', // 超时提醒
  timeoutHangup: 'timeoutHangup', // 超时挂断
  timeoutConn: 'timeoutConn', // 超时连接
  callTimeout: 'callTimeout',//呼叫超时
  cancel: 'cancel', // 主叫方取消
  called: 'called', // 被叫
  call: 'call', // 主叫
  reject: 'reject', // 对方拒绝
  busy: 'busy', // 对方繁忙
  joinRoom:'selfJoinRoom',//加入房间小程序专用
  syncDone:'syncDone',//同步完成
  sysMessage:'sysMessage',//系统消息
  openVideoSuccess: 'openVideoSuccess', // 开启视频流成功
  remoteTrack: 'remoteTrack', // 用户加入并产生流
  joinChannel: 'joinChannel', // 有人进入房间
  leaveChannel: 'leaveChannel', // 离开
  videoToAudio: 'videoToAudio', // 视频切换到音频
  audioToVideo: 'audioToVideo', // 音频切换到视频
  audioToVideoAgree: 'audioToVideoAgree', // 对端同意音频切换到视频
  chatTeamMessage: 'chatTeamMessage', // 聊天室消息
  threePartBusy: 'threePartBusy', // 三方繁忙
  threePartReject: 'threePartReject', // 三方拒绝
  transferBusy: 'transferBusy', // 转接繁忙
  transferReject: 'transferReject', // 转接拒绝
  threePartInter: 'threePartInter', // 三方进入需要关掉邀请界面
  hangup: 'hangup', // 需要界面处理挂断 当前方见
  screenStart: 'screenStart', // 投屏开始
  proScreenSuccess: 'proScreenSuccess', // 投屏成功
  cancelProScreenSuccess: 'cancelProScreenSuccess', // 取消投屏成功
  screenAccept: 'screenAccept', // 客户接受投屏
  screenReject: 'screenReject', // 客户不接受投屏
  obtainScreen: 'obtainScreen', // 座席获取客户投屏事件（客户监听）
  screenCancel: 'screenCancel', // 座席取消获取客户投屏事件（客户监听）
  screenAgree: 'screenAgree', // 客户同意座席获取屏幕
  screenDisAgree: 'screenDisAgree', // 客户不同意座席获取屏幕
  customerCancelProScreen: 'customerCancelProScreen', // 客户不同意座席获取屏幕
  joinWhiteBoardSuccess: 'joinWhiteBoardSuccess', // 加入白板成功
  selectDoc: 'selectDoc', // 文档选择
  uploadPercent: 'uploadPercent', //文档上传进度条
  receiveBoardInvite: 'receiveBoardInvite', // 收到白板邀请
  preview: 'preview', // 文档上传转码通知事件
  leaveBoard: 'leaveBoard', // 离开白板事件
  faceLiveness: 'faceLiveness', //活体检测
  verbalTips: 'verbalTips', //话术提示
  busiClosePage: 'busiClosePage', //关闭页面
  busiPushPage: 'busiPushPage', //发送页面
  busiPushData: 'busiPushData', //发送数据
  netcallError: 'netcallError'
}
