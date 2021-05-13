import http from './index'
import sysConfig from '../config/config'
import logger from '../log/index'
let isRefreshToken = false;
let resetTimeout = null;
let AuthRefreshCache = []
//刷新重试次数，超过三次就停止重试
let retryCount = 0;
/**
 * token过期处理
 */
const expiredToken = (config,res)=>{
  logger.log("开始过期token控制",config,res)
  if (res.data.code == 'authorized.token.expired') {
    AuthRefreshCache.push(config)
    if(!isRefreshToken){
      isRefreshToken = true
      refreshToken().then(res=>{
        isRefreshToken = false;
      })
    }
  }
}

/**
 * 重新请求失败的请求数据
 */
const resetFailRequest = ()=>{
  AuthRefreshCache.map(item => {
    if('upload' === item.requestType){
      //如果是上傳文件token过期后
      http.uploadFile(item).then((res)=>{
        if (res.statusCode == 200) {
          item.resolve(res)
        }else{
          item.reject(res)
        }
      }).catch((e)=>{
        item.reject(e)
      })
    }else{
      //一般请求token过期后
      http.request(item.method,item.url,item.data,item.options).then((res)=>{
        if (res.statusCode == 200) {
          item.resolve(res)
        }else{
          item.reject(res)
        }
      }).catch((e)=>{
        item.reject(e)
      })
    }
  })
  AuthRefreshCache = []
}

/**
 * token倒计时
 */
const countDownResetToken = (overtime=0)=>{
  clearTimeout(resetTimeout)
  overtime = overtime>300?overtime-300:overtime-5
  logger.log("开始倒计时刷新token-overtime=",overtime)
  resetTimeout = setTimeout(() => {
    //倒计时结束实现刷新token的尝试
    refreshTokenRetry()
  }, overtime * 1000);
}

/**
 * 刷新token
 */
const refreshToken = ()=>{
  return new Promise((resolve, reject) => {
    var tokenValue = wx.getStorageSync('tokenValue')
    let headers = {}
    headers['token'] = tokenValue
    logger.log("开始刷新token-headers=",headers)
    wx.request({
      url: sysConfig.server.config.baseURL+sysConfig.server.refreshToken,
      method:"GET",
      header: headers,
      success(res) {
        logger.log("res=",res)
        if(res.header.Token || res.header.token){
          retryCount = 0
          let token = res.header.Token? res.header.Token:res.header.token
          logger.log("刷新token成功",token)
          wx.setStorageSync('tokenValue', token)
          let expirationTime = wx.getStorageSync('expirationTime')
          let time = Number(expirationTime)
          //刷新完了重新刷新倒计时
          countDownResetToken(time)
          //重新执行错误请求
          resetFailRequest()
          resolve(res)
        }else{
          logger.log("刷新失败，",res)
          reject(res)
        }
      },
      fail(e){
        reject(e)
      }
    })
  })
}

const refreshTokenRetry = ()=>{
  refreshToken().catch(res=>{
    if(retryCount<2){
        retryCount++
        logger.error("刷新token失败，开始尝试刷新 retryCount="+retryCount)
        logger.error("失败res",res)
        refreshTokenRetry()
      }else{
        retryCount = 0
        logger.error("重试刷新失败，放弃治疗",res)
      }
  })
}

module.exports = {
  expiredToken,
  resetFailRequest,
  countDownResetToken,
  refreshToken

}