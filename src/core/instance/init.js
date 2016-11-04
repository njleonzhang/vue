/* @flow */

import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { initLifecycle, callHook } from './lifecycle'
import { mergeOptions } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  // 定义_init函数
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this // this复制给vm变量, this是这个vue实例自己
    // a uid, 给这个vue实例一个uid, 增长的, 所以唯一 不重复
    vm._uid = uid++
    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // 如果是vue内部的组件, 则不需要做侧别的处理, 比如props的normalize化等
      // vue的很多options都支持多种写法, vue库拿到之后,会normalize成统一的格式,然后再做后续处理,
      // 如果是vue内部组件,则不需要这些处理过程, 为了性能优化, 做下特别处理.
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      // 合并options
      vm.$options = mergeOptions(
        // 获得挂在构造函数上的options
        resolveConstructorOptions(vm),
        // 本地实例化传入的options
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm) // 初始化proxy
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    // 初始化生命周期的各个状态
    initLifecycle(vm)
    // event的on和off方法绑定到当前实例上
    initEvents(vm)
    // 调用brforeCreate的hook
    callHook(vm, 'beforeCreate')
    // 对数据做初始化了,配置data和计算属性等
    initState(vm)
    callHook(vm, 'created')
    initRender(vm)
  }

  function initInternalComponent (vm: Component, options: InternalComponentOptions) {
    const opts = vm.$options = Object.create(resolveConstructorOptions(vm))
    // doing this because it's faster than dynamic enumeration.
    opts.parent = options.parent
    opts.propsData = options.propsData
    opts._parentVnode = options._parentVnode
    opts._parentListeners = options._parentListeners
    opts._renderChildren = options._renderChildren
    opts._componentTag = options._componentTag
    if (options.render) {
      opts.render = options.render
      opts.staticRenderFns = options.staticRenderFns
    }
  }

  function resolveConstructorOptions (vm: Component) {
    const Ctor = vm.constructor // vm的构造函数, 一般情况下就是Vue啊, 如果是Vue.extend创建的Vue对象可能就不是了吧?
    let options = Ctor.options  // 一般情况是挂在Vue上得options默认属性, 如果是Vue.extend创建的?
    // 处理Vue.extend的场景?
    if (Ctor.super) {
      const superOptions = Ctor.super.options
      const cachedSuperOptions = Ctor.superOptions
      if (superOptions !== cachedSuperOptions) {
        // super option changed
        Ctor.superOptions = superOptions
        options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
        if (options.name) {
          options.components[options.name] = Ctor
        }
      }
    }
    return options
  }
}
