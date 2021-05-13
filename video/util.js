
/**
 * 格式化日期
 *
 * @param {String} fmt 日期格式
 * @param {Date} date 日期
 * @returns {String} 格式化后的字符串日期
 */
function dateFormat (fmt, date) {
  let ret
  const opt = {
    'Y+': date.getFullYear().toString(), // 年
    'm+': (date.getMonth() + 1).toString(), // 月
    'd+': date.getDate().toString(), // 日
    'H+': date.getHours().toString(), // 时
    'M+': date.getMinutes().toString(), // 分
    'S+': date.getSeconds().toString(), // 秒
    's+': date.getMilliseconds().toString() // 毫秒
    // 有其他格式化字符需求可以继续添加，必须转化成字符串
  }
  for (const k in opt) {
    ret = new RegExp('(' + k + ')').exec(fmt)
    if (ret) {
      fmt = fmt.replace(ret[1], (ret[1].length === 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, '0')))
    };
  };
  return fmt
}
function deepMerge(obj1, obj2) {
  let key;
  for (key in obj2) {
    // 如果target(也就是obj1[key])存在，且是对象的话再去调用deepMerge，否则就是obj1[key]里面没这个对象，需要与obj2[key]合并
    // 如果obj2[key]没有值或者值不是对象，此时直接替换obj1[key]
    obj1[key] =
      obj1[key] &&
      obj1[key].toString() === "[object Object]" &&
      (obj2[key] && obj2[key].toString() === "[object Object]")
        ? deepMerge(obj1[key], obj2[key])
        : (obj1[key] = obj2[key]);
  }
  return obj1;
}
export {
  dateFormat,
  deepMerge
}
