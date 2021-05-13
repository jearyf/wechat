import { dateFormat } from './util'
/**
 * 创建会话流水号
 *
 * @param {String} account 呼叫方账号
 * @returns {String} 会话流水号
 */
function generate (account) {
  return dateFormat('YYYYmmddHHMMSSsss', new Date()) + account
}
export {
  generate
}
