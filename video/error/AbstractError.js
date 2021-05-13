import { getMessageByCode } from './errorMessageManager'
/**
 * @abstract
 * @class AbstractError
 * @classdesc 异常抽象类
 * @author jiazw
 * @since 1.0.0
 */
export default class AbstractError extends Error {
/**
 * 构造函数
 *
 * @constructs
 * @param {String} name 异常名称
 * @param {String} code 错误码
 * @param {Error} error 错误原始异常
 * @param {...any} args 参数
 */
  constructor (name, code, error, ...args) {
    super()
    this.name = name
    this.code = code
    this.error = null
    this.message = ''

    const _args = args
    if (error instanceof Error) {
      this.error = error
    } else if (error) {
      _args.unshift(error)
    }
    this.message = getMessageByCode(code)
  }
}
