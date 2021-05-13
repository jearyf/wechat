import sysConfig from '../config/config'
import logger from '../log/index'
import utils from './utils'
const header = {
  'content-type': 'application/json;charset=UTF-8',
  token:""
};
/**
 * 判断url是否包含url
 * @param {*} url 
 */
const includeBaseUrl = (url) => {
  return url.indexOf('http://')===0 || url.indexOf('https://')===0
}
/**
 * 请求服务
 * method：请求方式
 * url请求地址，不带服务器地址
 * data数据参数
 * options请求配置  比如 timeout  header等的配置
 */
const request = (method, url, data, options) => {
  return new Promise(function (resolve, reject) {
    //请求需要的token
    var tokenValue = wx.getStorageSync('tokenValue')
    let token = tokenValue
    let headers = options?(options.header || header):header
    headers['token'] = token
    console.log("请求参数",{
      method, url, data,headers
    })
    wx.request({
      url: includeBaseUrl(url)?url:sysConfig.server.config.baseURL + url,
      method: method,
      timeout: options?options.timeout:sysConfig.server.config.timeout,
      data: data,
      header: headers,
      success(res) {
        //如果是登录或者刷新接口返回的token就存储下来以后每次请求需要携带这个参数
        if(res.header.Token || res.header.token){
          token = res.header.Token? res.header.Token:res.header.token
          console.log('token=',token)
          wx.setStorageSync('tokenValue', token)
          var expiration =  res.data.expiration
          if (expiration) {
            wx.setStorageSync('expirationTime', expiration)
            var time = Number(expiration)
            utils.countDownResetToken(time)
          }
        }
        if (res.statusCode == 200) {
          logger.log("请求成功",res)
          resolve(res);
        } else {
          logger.error("请求失败",res,headers)
          // if (res.data.code == 'authorized.token.expired') {
          //   utils.expiredToken({
          //     url: includeBaseUrl(url)?url:sysConfig.server.config.baseURL + url,
          //     method: method,
          //     data: data,
          //     options:options,
          //     resolve:resolve,
          //     reject:reject
          //   },res)
          // }else{
            reject(res)
          // }
        }
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

/**
 * 上传文件
 * @param {*} config 
 */
const uploadFile = (config) => {
  var tokenValue = wx.getStorageSync('tokenValue')
  let token = tokenValue
  return new Promise(function (resolve, reject) {
    let header = (config.header || header)
    header['token'] = token
    wx.uploadFile({
      url:includeBaseUrl(config.url)?config.url:sysConfig.server.config.baseURL + config.url,
      filePath:config.filePath,
      name:config.name,
      header:config.header,
      formData:config.formData,
      timeout:config.timeout||5*60*1000,
      success:(res)=>{
        if (res.statusCode == 200) {
          resolve(res);
        } else {
          // if (res.data.code == 'authorized.token.expired') {
          //   config.resolve = resolve;
          //   config.reject = reject;
          //   config.requestType = "upload"
          //   utils.expiredToken(config,res)
          // }else{
            reject(res)
          // }
        }
      },
      fail:(err)=>{
        reject(err)
      }
    })
  })
}

/**
 * 刷新token
 */
const refreshToken = ()=>{
  return utils.refreshToken()
  
  
}

module.exports = {
  request,
  uploadFile,
  refreshToken
}