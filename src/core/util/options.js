/* @flow */

import Vue from '../instance/index'
import config from '../config'
import { warn } from './debug'
import { set } from '../observer/index'
import {
  extend,
  isObject,
  isPlainObject,
  hasOwn,
  camelize,
  capitalize,
  isBuiltInTag
} from 'shared/util'

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
const strats = config.optionMergeStrategies

/**
 * Options with restrictions
 */
 // optionMergeStrategies可以自定义,在这里进行处理异常
 // https://vuejs.org.cn/guide/mixins.html#u81EA_u5B9A_u4E49_u9009_u9879_u5408_u5E76_u7B56_u7565
if (process.env.NODE_ENV !== 'production') {
  strats.el = strats.propsData = function (parent, child, vm, key) {
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    return defaultStrat(parent, child)
  }

  strats.name = function (parent, child, vm) {
    if (vm && child) {
      warn(
        'options "name" can only be used as a component definition option, ' +
        'not during instance creation.'
      )
    }
    return defaultStrat(parent, child)
  }
}

/**
 * Helper that recursively merges two data objects together.
 */
function mergeData (to: Object, from: ?Object): Object {
  let key, toVal, fromVal
  for (key in from) {
    toVal = to[key]
    fromVal = from[key]
    if (!hasOwn(to, key)) {
      // 只merge from有但是to没有的属性, 有冲突的话以to为准, 所以to肯定要是child,也就是子组件
      set(to, key, fromVal)
    } else if (isObject(toVal) && isObject(fromVal)) {
      mergeData(toVal, fromVal)
    }
  }
  return to
}

/**
 * Data
 */
strats.data = function (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    // 是组件的时候
    // in a Vue.extend merge, both should be functions
    // https://vuejs.org.cn/guide/components.html#组件选项问题
    if (!childVal) {
      return parentVal
    }
    if (typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.

    // 有点绕, 不过确实如此, data如果是函数, 则merge完了还应该是函数,
    // 此处分别执行2个data函数, 然后返回merge的函数. 例:

    // data() {
    //   return {
    //     a: 1
    //   }
    // }
    //
    // data() {
    //   return {
    //     b: 2
    //   }
    // }
    // merge 完了应该是:
    // data() {
    //   return {
    //     a: 1,
    //     b: 2
    //   }
    // }

    return function mergedDataFn () {
      return mergeData(
        // 此处的this是什么?
        childVal.call(this),
        parentVal.call(this)
      )
    }
  } else if (parentVal || childVal) {
    // instance时, 即new Vue()时, merge本身的option和Vue的一些default值
    return function mergedInstanceDataFn () {
      // instance merge
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm)
        : childVal
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm)
        : undefined
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}

/**
 * Hooks and param attributes are merged as arrays.
 */
function mergeHook (
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  return childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal) // childVal可能是array么?
        ? childVal
        : [childVal]
    : parentVal
}

config._lifecycleHooks.forEach(hook => {
  strats[hook] = mergeHook
})

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */
 // 哪里体现3方merge了?
function mergeAssets (parentVal: ?Object, childVal: ?Object): Object {
  const res = Object.create(parentVal || null)
  return childVal
    ? extend(res, childVal)
    : res
}

config._assetTypes.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */

 // watch 的值被merge成了Array
strats.watch = function (parentVal: ?Object, childVal: ?Object): ?Object {
  /* istanbul ignore if */
  if (!childVal) return parentVal
  if (!parentVal) return childVal
  const ret = {}
  extend(ret, parentVal)
  for (const key in childVal) {
    let parent = ret[key]
    const child = childVal[key]
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    ret[key] = parent
      ? parent.concat(child)
      : [child]
  }
  return ret
}

/**
 * Other object hashes.
 */
strats.props =
strats.methods =
strats.computed = function (parentVal: ?Object, childVal: ?Object): ?Object {
  if (!childVal) return parentVal
  if (!parentVal) return childVal
  const ret = Object.create(null)
  extend(ret, parentVal)
  extend(ret, childVal)
  return ret
}

// 以child的值为准
/**
 * Default strategy.
 */
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * Make sure component options get converted to actual
 * constructors.
 */
 // 处理注册语法糖等, https://vuejs.org.cn/guide/components.html#注册语法糖
function normalizeComponents (options: Object) {
  if (options.components) {
    const components = options.components
    let def
    for (const key in components) {
      const lower = key.toLowerCase()
      if (isBuiltInTag(lower) || config.isReservedTag(lower)) {
        process.env.NODE_ENV !== 'production' && warn(
          'Do not use built-in or reserved HTML elements as component ' +
          'id: ' + key
        )
        continue
      }
      def = components[key]
      if (isPlainObject(def)) {
        components[key] = Vue.extend(def)
      }
    }
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
 // 处理https://vuejs.org.cn/api/#props
function normalizeProps (options: Object) {
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  }
  options.props = res
}

/**
 * Normalize raw function directives into object format.
 */

 // 指令直接传入一个函数的场景
 // https://vuejs.org.cn/guide/custom-directive.html
function normalizeDirectives (options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  // 处理本次传入的options的components属性
  normalizeComponents(child)
  // 处理本次传入的options的props属性
  normalizeProps(child)
  // 处理本次传入的options的directives属性
  normalizeDirectives(child)

  // 处理https://vuejs.org.cn/api/#extends
  const extendsFrom = child.extends
  if (extendsFrom) {
    parent = typeof extendsFrom === 'function'
      ? mergeOptions(parent, extendsFrom.options, vm)
      : mergeOptions(parent, extendsFrom, vm)
  }

  // 处理https://vuejs.org.cn/api/#mixins
  if (child.mixins) {
    for (let i = 0, l = child.mixins.length; i < l; i++) {
      let mixin = child.mixins[i]
      if (mixin.prototype instanceof Vue) {
        mixin = mixin.options
      }
      parent = mergeOptions(parent, mixin, vm)
    }
  }
  const options = {}
  let key
  for (key in parent) {
    mergeField(key)
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      // child有,但是parent没有的key
      mergeField(key)
    }
  }
  function mergeField (key) {
    const strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  const assets = options[type]
  const res = assets[id] ||
    // camelCase ID
    assets[camelize(id)] ||
    // Pascal Case ID
    assets[capitalize(camelize(id))]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
