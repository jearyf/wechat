// video/components/dcfs-ia-session/dcfs-ia-pusher/dcfs-ia-pusher.js
import logger from '../../../log/index'
Component({
  properties: {
    videoSize: {
      type: Object,
      value: {
        width: 0,
        height: 0
      },
      observer:function(newVal, oldVal){
        logger.log(newVal, oldVal)
      }
    },
    debug: {
      type: Boolean,
      value: false
    },
    minBitrate: {
      type: Number,
      value: 200
    },
    maxBitrate: {
      type: Number,
      value: 500
    },
    enableCamera: {
      type: Boolean,
      value: true
    },
    beauty: {
      type: Number,
      value: 3
    },
    whiteness: {
      type: Number,
      value: 3
    },
    aspect: {
      type: String,
      value: "9:16"
    },
    /**
     * 加载状态：loading、ready、error
     */
    status: {
      type: String,
      value: "loading",
      observer: function (newVal, oldVal, changedPath) {
        logger.log(`dcfs-pusher status changed from ${oldVal} to ${newVal}`);
      }
    },
    coverText: {
      type: String,
      value: ''
    },
    url: {
      type: String,
      value: "",
      observer: function (newVal, oldVal, changedPath) {
      }
    },
    position:{
      type: String,
      value: "front"
    },
    enableMic: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    livePusherContext: null, // 组件操作上下文
    detached: false // 组件是否被移除标记
  },
  /**
   * 组件生命周期
   */
  lifetimes: {
    /**
     * 在组件实例被从页面节点树移除时执行
     */
    detached: function () {
      logger.log("dcfs-pusher detached");
      // auto stop dcfs-pusher when detached
      // this.stop()
      this.setData({
        detached: true
      })
    },
    /**
     * 在组件布局完成后执行，此时可以获取节点信息
     */
    attached: function () {
      logger.log("dcfs-pusher ready")
      this.start()
      this.setData({
        detached: false
      })
    },
  },
  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 播放推流
     * 一般情况下不应手动调用，在推流组件预备好后会自动被调用
     */
    start(options = {}) {
      if (!this.livePusherContext) {
        this.livePusherContext = wx.createLivePusherContext()
      }
      logger.log(`starting dcfs-pusher`);
      this.livePusherContext.start(options)
    },
    /**
     * 停止推流
     */
    stop(options = {}) {
      if (this.livePusherContext) {
        logger.log(`stopping dcfs-pusher`);
        this.livePusherContext.stop(options)
      }
    },
    /**
     * 切换前后摄像头
     */
    switchCamera() {
      this.livePusherContext.switchCamera()
    },
    /**
     * 快照
     */
    snapshot() {
      this.livePusherContext.snapshot()
    },

    /**
     * 推流状态变化事件回调
     */
    stateChangeHandler(e) {
      logger.warn(`dcfs-pusher code: ${e.detail.code} - ${e.detail.message}`)
      if (e.detail.code === -1307) { // 网络断连，且经多次重连抢救无效，更多重试请自行重启推
        logger.log('dcfs-pusher stopped', `code: ${e.detail.code}`);
        this.setData({
          status: "error"
        })
        this.livePusherContext.stop({
          complete: () => {
            this.livePusherContext.start()
          }
        })
        this.triggerEvent('pushfailed');
      } else if (e.detail.code === 1008) { // 编码器启动
        logger.log(`dcfs-pusher started`, `code: ${e.detail.code}`);
        if (this.data.status === "loading") {
          this.setData({
            status: "ready"
          })
          this.triggerEvent('action')
        }
      }
    },
    /**
     * 网络状态通知回调
     */
    netChangeHandler(e) {
      logger.log(`live-pusher network: ${JSON.stringify(e.detail)}`);
    },
    /**
     * 开启调试
     */
    toggleDebug(isDebug) {
      this.setData({
        debug: isDebug
      })
    }
  }
})

