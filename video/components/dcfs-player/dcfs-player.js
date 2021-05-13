import logger from '../../log/index'
Component({
  properties: {
    config: {
      type: Object,
      value: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
    },
    debug: {
      type: Boolean,
      value: false
    },
    /**
     * 加载状态：loading、ready、error
     */
    status: {
      type: String,
      value: 'loading',
      observer: function (newVal, oldVal, changedPath) {}
    },
    /**
     * 画面方向，可选值有 vertical，horizontal
     */
    orientation: {
      type: String,
      value: 'vertical'
    },
    objectFit: {
      type: String,
      value: 'fillCrop'
    },
    name: {
      type: String,
      value: ''
    },
    uid: {
      type: String,
      value: ''
    },
    coverText: {
      type: String,
      value: ''
    },
    url: {
      type: String,
      value: '',
      observer: function (newVal, oldVal, changedPath) {
      }
    }
  },

  data: {
    livePlayerContext: null,
    detached: false
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 组件生命周期：在组件布局完成后执行，此时可以获取节点信息
     */
    ready() {
      if (this.data.livePlayerContext) {
        this.data.livePlayerContext = wx.createLivePlayerContext(`dcfsplayer-${this.data.uid}`, this)
      }
      if (this.data.url) {
        this.start()
      }
    },
    /**
     * 组件生命周期：在组件实例被从页面节点树移除时执行
     */
    detached() {
      wx.createLivePlayerContext(`dcfsplayer-${this.data.uid}`, this).stop()
      this.data.detached = true
    },

    /**
     * 开始拉流播放
     */
    start() {
      const uid = this.data.uid
      if (this.data.status === 'ready') {
        logger.log(`player ${uid} already started`)
        return
      }
      if (this.data.detached) {
        logger.log(`try to start player while component already detached`)
        return
      }
      logger.log(`starting player ${uid}`)
      this.data.livePlayerContext.play()
    },
    /**
     * 停止拉流播放
     */
    stop() {
      logger.log(`stopping player ${this.data.uid}`)
      wx.createLivePlayerContext(`dcfsplayer-${this.data.uid}`, this).stop()
    },
    /**
     * 切换画面方向
     * true为 horizontal，false为 vertical
     */
    changeOrientation(isHorizontal) {
      let orientation = isHorizontal ? 'horizontal' : 'vertical'
      this.setData({
        orientation: orientation
      })
    },
    /**
     * 切换填充模式
     * true为 fillCrop，false为 contain
     */
    changeObjectFit(isFillCrop) {
      let objectFit = isFillCrop ? 'fillCrop' : 'contain'
      this.setData({
        objectFit: objectFit
      })
    },
    /**
     * 播放器状态更新回调
     */
    stateChangeHandler(e) {
      logger.warn(`dcfs-player code: ${e.detail.code} - ${e.detail.message}`)
      let uid = parseInt(e.target.id.split('-')[1])
      if (e.detail.code === 2004) {
        logger.log(`live-player ${uid} started playing`)
        if (this.data.status === 'loading') {
          this.setData({
            status: 'ready'
          })
        }
      } else if (e.detail.code === -2301) {
        logger.log(`live-player ${uid} stopped`, 'error')
        this.setData({
          status: 'error'
        })
        this.triggerEvent('pullfailed');
      }
    },
    netChangeHandler(e){
      logger.log(`live-player network: ${JSON.stringify(e.detail)}`);
    },
    /**
     * 改变画面蒙面
     */
    changeStatus(status) {
      switch(status) {
        case 'leave':
        case 'notConnected': {
          break
        }
        default: {
          status = this.data.status
        }
      }
      logger.error(status)
      this.setData({
        status
      })
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
