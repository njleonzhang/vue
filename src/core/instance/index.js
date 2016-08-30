import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'

// Vue的构造函数
function Vue (options) {
  // 构造函数只调用了_init, 注意使用this调的, 也就是这个vue的实例
  this._init(options)
}

// _init方法在initMixin里设置
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
