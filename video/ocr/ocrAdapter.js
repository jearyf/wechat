import Client from '../index'
/**
 * 上传base64图片
 * @param {*} data 
 */
const uploadBase64 = (data)=>{
  let params = {
    url:"/api/v1/file/upload/base64",
    method:"POST",
    data:data
  }
  return Client.getInstance().request(params)
}

/**
 * 身份证ocr识别
 * @param {*} params 
 */
const ocrIdCard = (side,data)=>{
  let params = {
    url:"/api/v1/video/bps/ocr/id-cards/recognition",
    method:"POST",
    data:{
      cardSide: side,//身份证正反面类型，正面-FRONT，反面-BACK
      detectPhoto: true,//是否检测头像内容，默认不检测。可选值：true-检测头像并返回头像的 base64 编码及位置信息
      imageData: data,//图片数据，根据图片类型上送对应的数据值
      imageType: "URL"//图片类型，可选类型：BASE64，URL，TOKEN
    }
  }
  return Client.getInstance().request(params)
}

/**
 * 银行卡ocr识别
 * @param {*} side 身份证正反面类型，正面-FRONT，反面-BACK
 * @param {*} data  图片数据，根据图片类型上送对应的数据值
 */
const ocrBankCard = (data)=>{
  let params = {
    url:"/api/v1/video/bps/ocr/bank-cards/recognition",
    method:"POST",
    data:{
      imageData: data,//图片数据，根据图片类型上送对应的数据值
      imageType: "URL"//图片类型，可选类型：BASE64，URL，TOKEN
    }
  }
  return Client.getInstance().request(params)
}

/**
 * 获取活体检测的随机读取码和token
 */
const getLivingRandomToken = ()=>{
  let params = {
    url:"/api/v1/video/bps/ocr/live-check/random/token",
    method:"GET"
  }
  return Client.getInstance().request(params)
}

/**
 * 活体验证
 * @param {Strin} filePath  文件地址
 * @param {Object} formData 需要传递参数
 */
const livingVerify = (filePath,formData)=>{
  let params = {
    url:"/api/v1/video/bps/ocr/live-check/verify",
    filePath:filePath,
    formData:formData,
    name:"videoFile"
  }
  return Client.getInstance().uploadFile(params)
}

export default{
  uploadBase64,
  ocrIdCard,
  ocrBankCard,
  getLivingRandomToken,
  livingVerify
}