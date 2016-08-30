/* @flow */

import { mergeOptions } from '../util/index'

// 在Vue上挂一个mixin方法, 用于修改Vue.options的值
export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    Vue.options = mergeOptions(Vue.options, mixin)
  }
}
