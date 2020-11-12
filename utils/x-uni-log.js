import Vue from 'vue'

export const $XReport = {
  data: {
    version: '1.0.0',
    system: {},
    logs: []
  },
  config: {
    debug: false, // 调试模式
    api: '', // 接收api地址
    pages: 'all', // 需要上报的页面路径 'all' || ['pages/index/index'] 页面路径列表
    opportunity: ['onHide', 'onUnload'], // 上报时机
    name: 'x-uni-log', // global全局数据缓存名称
    method: 'POST', // get / post
    contentType: 'application/json', // 'application/json' / 'application/x-www-form-urlencoded'
    filterScene: [1129], // 根据场景值过滤
    systemKey: ['model', 'pixelRatio', 'system', 'language', 'version', 'SDKVersion', 'brand', 'platform'], // 需要上报的设备系统信息key
    json: 'parse', // 上报数据格式，stringify: json文本, parse: json对象
    success: null // 自定义数据上报函数
  },
  promisify(api) {
    return (options, ...params) => {
      return new Promise((resolve, reject) => {
        api(Object.assign({}, options, {
          success: resolve,
          fail(res) {
            console.error('request error ', res);
            reject(res);
          }
        }), ...params);
      }).catch(res => {
        console.log('Promise catch: ', res);
      });
    };
  },
  complete(api) {
    return (options, ...params) => {
      return new Promise((resolve, reject) => {
        api(Object.assign({}, options, { complete: resolve }), ...params);
      }).catch(res => {
        console.log('Promise catch: ', res);
      });
    };
  },
  async init(options = {}) {
    Object.assign(this.config, options)
    console.log('init', this.config)
    // onLaunch、onPageNotFound、onError拦截器
    $interceptor.init()
    // Page生命周期注入
    Vue.mixin(this.mixin)
    // 设备信息
    if (this.config.systemKey && this.config.systemKey.length) {
      this.setSystem()
    }
    // 网络环境
    const { networkType } = await this.complete(uni.getNetworkType)();
    this.data.networkType = networkType;
    // 数据缓存到global
    // this.setGlobal()
  },
  // 获取设备系统信息
  setSystem() {
    const system = uni.getSystemInfoSync();
    this.data.system = {};
    this.config.systemKey.map(v => {
      this.data.system[v] = system[v];
    });
  },
  // 更新数据到global
  setGlobal() {
    global[this.config.name] = this.data;
    console.log(`${this.config.name} -> `, global[this.config.name])
  },
  mixin: {
    onLoad(options) {
      $XTrack('onLoad', options)
    },
    onShow(options) {
      $XTrack('onShow', options)
    },
    onHide(options) {
      // 获取当前page是否有 beforeHide 函数
      const { beforeHide } = this.$options;
      beforeHide && beforeHide.call(this, options);
      $XTrack('onHide', options)
    },
    onUnload(options) {
      // 获取当前page是否有 beforeUnload 函数
      const { beforeUnload } = this.$options;
      beforeUnload && beforeUnload.call(this, options);
      $XTrack('onUnload', options);
    },
    onReachBottom(options) {
      $XTrack('onReachBottom', options);
    },
    onShareAppMessage(options) {
      $XTrack('onShareAppMessage', options);
    },
    onShareTimeline(options) {
      $XTrack('onShareTimeline', options);
    },
    onAddToFavorites(options) {
      $XTrack('onAddToFavorites', options);
    },
    onTabItemTap(options) {
      $XTrack('onTabItemTap', options);
    }
  }
}

// $XTrack
export const $XTrack = (event, options = {}) => {
  console.log('x-uni-log event -> ', event, options)
  const {data, config} = $XReport
  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  // onLaunch
  if (event === 'onLaunch') {
    Object.assign(data, {
      scene: options.scene // 场景值
    })
  }
  // onLoad
  if (event === 'onLoad') {
    // history
    Object.assign(data, {
      history: pages.map(item => item.route),
      query: options,
      route: page.route
    })
  }
  // 行为记录
  if (!data.logs) {
    data.logs = []
  }
  data.logs.push({
    event,
    options,
    timestamp: Date.now()
  });

  if (config.opportunity.some(s => s === event)) {
    // 特定的场景值不进行数据上报
    let is = !config.filterScene.some(s => s === data.scene)
    // 是否在需要上报的页面路径集中
    if (Object.prototype.toString.call(config.pages) === '[object Array]') {
      is = config.pages.some(s => {
        // 处理自定义配置路径集有 / 开头的
        const p = [data.route]
        if (/^\//.test(s)) {
          p.unshift('/')
        }
        return s === p.join('')
      })
    }
    // 是否符合上报条件
    if (is) {
      const params = JSON.parse(JSON.stringify(data))
      if (Object.prototype.toString.call(config.success) === '[object Function]') {
        config.success.call(this, params)
      } else if (config.api) {
        uni.request({
          timeout: 30000,
          method: config.method,
          url: config.api,
          data: params,
          header: {
            'content-type': config.contentType
          },
          success: () => {
            console.log('埋点数据上报成功~')
          }
        })
      } else {
        console.warn('请配置api或者success')
      }
    }
    // 上报成功，清除记录
    data.logs = []
  }
  // console.log('x-uni-log-> ', event, options, data)
}

// app
export const $interceptor = {
  init() {
    const oldApp = App;
    const _this = this;
    // eslint-disable-next-line
    App = function (Obj) {
      _this.interceptor(Obj, 'onLaunch');
      _this.interceptor(Obj, 'onPageNotFound');
      _this.interceptor(Obj, 'onError');
      oldApp(Obj);
    };
  },
  interceptor(Obj, event) {
    const e = Obj[event];
    Obj[event] = function(option) {
      // 自定义code
      // 日志上报
      $XTrack(event, option);
      // 原始方法调用
      e && e.call(this, option);
    };
  }
}
