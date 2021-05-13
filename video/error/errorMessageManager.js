import exception from './errorMessage'
let messages = Object.assign({}, exception)
/**
 * 根据错误码获取错误消息
 *
 * @param {String} code 错误码
 * @param  {...any} args 错误参数
 * @returns {String} 错误消息
 */
function getMessageByCode (code, ...args) {
  let message = messages[code]
  if (message) {
    for (let index = 0; index < args.length; index++) {
      const value = args[index];
      message = message.replace("{"+(index+1)+"}",value)
    }
  }
  return message
}

/**
 * 添加[错误码:错误消息]
 *
 * @param {String|Object} code 错误码或者错误信息集合
 * @param {String} message 错误消息
 */
function addMessage (code, message = '') {
  if (typeof code === 'object') {
    messages = Object.assign(messages, code)
  } else {
    if (code) { messages[code] = message }
  }
}

export {
  getMessageByCode,
  addMessage
}
