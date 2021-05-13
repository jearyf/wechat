
let isDebug = false
const Log = (funcName)=>{
    return function(){
        if(!isDebug){return;}
        const args = Array.prototype.slice.call(arguments)
        console[funcName].apply(console, args);
    };
};

export default {
  init: function (isLogging) {
    isDebug = isLogging
  },  
  log: Log("log"), 
  info: Log("info"), 
  warn: Log("warn"), 
  error: Log("error")
}