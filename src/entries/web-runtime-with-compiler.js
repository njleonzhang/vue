/* @flow */

import Vue from './web-runtime'
import { warn, cached } from 'core/util/index'
import { query, shouldDecodeTags } from 'web/util/index'
import { compileToFunctions } from 'web/compiler/index'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

const mount = Vue.prototype.$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el)

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  // 只有没有render函数的时候才做compliler，所有render函数优先级高于template和el
  if (!options.render) {
    let template = options.template
    let isFromDOM = false
    if (template) {
      // 如果有template参数
      if (typeof template === 'string') {
        // #开头的字符串会被当做querySelect来查找template
        if (template.charAt(0) === '#') {
          isFromDOM = true
          template = idToTemplate(template)
        }
      } else if (template.nodeType) {
        // template选项直接是一个dom elment
        isFromDOM = true
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // 如果有el参数
      isFromDOM = true
      template = getOuterHTML(el)
    }
    if (template) {
      const { render, staticRenderFns } = compileToFunctions(template, {
        warn,
        isFromDOM,
        shouldDecodeTags,
        delimiters: options.delimiters
      }, this) // 对template进行编译，得到render函数和staticRenderFns
      options.render = render
      options.staticRenderFns = staticRenderFns
    }
  }
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
