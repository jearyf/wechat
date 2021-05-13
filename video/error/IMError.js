import AbstractError from './AbstractError'
/**
 * @class IMError
 * @classdesc IM异常
 * @extends AbstractError
 * @author jiazw
 * @since 1.0.0
 */
export default class IMError extends AbstractError {
  /**
   * 构造函数
   *
   * @constructs
   * @param {String} code 错误码
   * @param {Error} error 错误原始异常
   * @param  {...any} args 参数
   */
  constructor (code, error, ...args) {
    super('IMError', code, error, ...args)
  }
}
