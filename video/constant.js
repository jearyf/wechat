export default {
  type: {
    call: 'CALL', // 通话
    screen: 'SCREEN', // 投屏
    chat: 'CHAT', // 聊天
    speech: 'SPEECH', // 语音识别
    face: 'FACE', // 人脸识别
    busi: 'BUSI' // 业务
  },
  action: {
    chatTeam: 'CHAT_TEAM', // 群聊消息
    chatTeamActive: 'CHAT_TEAM_ACTIVE', // 激活群聊
    callResultNotify: 'CALL_RESULT_NOTIFY', // 通话结果通知
    callInvite: 'CALL_INVITE', // 通话-邀请
    callReject: 'CALL_REJECT', // 通话-拒绝
    callCancel: 'CALL_CANCEL', // 通话-取消
    callBusy: 'CALL_BUSY', // 通话-繁忙
    callTransferNotify: 'CALL_TRANSFER_NOTIFY', // 通知当前三方 座席发生转接
    screenStart: 'SCREEN_START',   // 座席发送开始投屏
    screenStop: 'SCREEN_STOP',  // 客户停止投屏
    screenAccept: 'SCREEN_ACCEPT', // 客户接受投屏
    screenReject: 'SCREEN_REJECT', // 客户接受投屏
    obtainScreen: 'OBTAIN_SCREEN',
    screenCancel: 'SCREEN_CANCEL',
    screenAgree: 'SCREEN_AGREE',
    screenDisAgree: 'SCREEN_DISAGREE', //不同意投屏
    customerScreenCancel: 'CUSTOMER_SCREEN_CANCEL', //不同意投屏
    boardInvite: 'BOARD_INVITE', // 白板邀请
    faceLiveness: 'FACE_LIVENESS', //人脸识别
    verbalTips: 'VERBAL_TIPS', //话术提示
    busiClosePage: 'BUSI_CLOSE_PAGE', //关闭页面
    busiPushPage: 'BUSI_PUSH_PAGE', //推送页面
    busiPushData: 'BUSI_PUSH_DATA', //推送数据
  }

}
