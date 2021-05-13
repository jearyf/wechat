import {request} from './http/index'
import sysConfig from './config/config'

const GET = 'GET';
const POST = 'POST';
const PUT = 'PUT';
const FORM = 'FORM';
const DELETE = 'DELETE';

module.exports = {
  //获取音视频SDK参数信息
  getParams: (data) => request(GET, sysConfig.server.paramUrl, data),
  //呼叫服务
  call: (data) => request(POST, sysConfig.server.callUrl, data),
  //拒绝
  reject: (data) => request(POST, sysConfig.server.rejectUrl, data),
  // 接听
  connect: (data) => request(POST, sysConfig.server.connectUrl, data),
  // 挂断
  hangup: (data) => request(POST, sysConfig.server.hangupUrl, data),
  // 取消
  cancel: (data) => request(POST, sysConfig.server.cancelUrl, data),
  // 邀请
  invite: (data) => request(POST, sysConfig.server.inviteUrl, data),
  //转接
  transfer: (data) => request(POST, sysConfig.server.transferUrl, data),
  //查询当前在岗座席的所有机构信息
  listAllOrg: (data) => request(POST, sysConfig.server.listAllOrgUrl, data),
  //查询当前在岗座席的所有角色的信息
  listAllRoles: (data) => request(POST, sysConfig.server.listAllOrgUrl, data),
  //查询所有在线座席的信息,信息只包含座席编号、名称，不包含当前自己本身该接口是用于转接和三方会话中的座席信息备选值使用
  listAgentsByOnLine: (data) => request(POST, sysConfig.server.listAgentsByOnLineUrl, data),
  //查询当前所有在线座席可办理的交易信息
  listTransCode: (data) => request(POST, sysConfig.server.listTransCodeUrl, data),
  //按条件分页查询座席信息,只会查出就绪的座席信息
  listReadyAgentsByPage: (data) => request(POST, sysConfig.server.listReadyAgentsByPageUrl, data),
  //查询当前房间的人员
  count: (data) => request(GET, sysConfig.server.countUrl + `${roomId}/count`, data),
  //根据交易码查询交易参数详情
  getTransParams: (data) => {
    let url = sysConfig.server.transParamsUrl + '/' + data.transCode
    return request(GET, url, data)
  },
  //二类户开户-开户申请提交服务(智能客服挂断后提交服务的接口)
  secondAccountsCommit: (data) => request(POST, sysConfig.server.secondAccountsCommitUrl, data),
  //接通
  connected: (data) => request(POST, sysConfig.server.answerUrl, data)
}