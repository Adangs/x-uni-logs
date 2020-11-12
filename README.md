# x-uni-logs
x-uni-logs

### 引入

`uni-app`小程序项目`main.js`引入
```js
import { $XReport, $XTrack } from './utils/x-uni-log'

// 初始化
Vue.prototype.$XTrack = $XTrack
Vue.prototype.$XTrack = $XTrack
$XReport.init({
  api: 'http://www.xxx.com/api/logs' // 接收日志的api地址
})
```

### 自行处理上报
```js
$XReport.init({
  success: (res) => {
    console.log('需要上报的数据-> ', res)
  }
})
```