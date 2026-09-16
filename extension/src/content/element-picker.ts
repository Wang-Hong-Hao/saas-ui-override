import { countMatches, EXTENSION_PREFIX, isExtensionElement, OVERLAY_ATTRIBUTE } from './dom-utils'
import { generateSelector } from './selector-generator'
import type { ElementSelectedPayload } from '../shared/messages'

const HIGHLIGHT_OUTLINE = '2px solid #1677ff'
const HIGHLIGHT_OUTLINE_OFFSET = '2px'

export type StopReason = 'selected' | 'cancelled'

interface PickerCallbacks {
  onSelect(payload: ElementSelectedPayload): void
  onStopped(reason: StopReason): void
}

interface SavedOutline {
  outline: string
  outlineOffset: string
}

/**
 * 元素选择器:mouseover 高亮(仅 outline,退出时恢复)、浮层提示、
 * click 锁定并阻止穿透、ESC 退出。
 */
export class ElementPicker {
  private active = false
  private hovered: Element | null = null
  private locked: Element | null = null
  private tooltip: HTMLDivElement | null = null
  private savedOutlines = new WeakMap<Element, SavedOutline>()
  private readonly callbacks: PickerCallbacks

  constructor(callbacks: PickerCallbacks) {
    this.callbacks = callbacks
  }

  get isActive(): boolean {
    return this.active
  }

  start(): void {
    if (this.active) return
    this.clearLocked()
    this.active = true
    document.addEventListener('mouseover', this.handleMouseOver, true)
    document.addEventListener('click', this.handleClick, true)
    document.addEventListener('mousedown', this.blockEvent, true)
    document.addEventListener('mouseup', this.blockEvent, true)
    document.addEventListener('contextmenu', this.blockEvent, true)
    document.addEventListener('keydown', this.handleKeyDown, true)
    window.addEventListener('scroll', this.handleScroll, true)
    window.addEventListener('resize', this.handleScroll)
  }

  stop(reason: StopReason): void {
    if (!this.active) return
    this.active = false
    document.removeEventListener('mouseover', this.handleMouseOver, true)
    document.removeEventListener('click', this.handleClick, true)
    document.removeEventListener('mousedown', this.blockEvent, true)
    document.removeEventListener('mouseup', this.blockEvent, true)
    document.removeEventListener('contextmenu', this.blockEvent, true)
    document.removeEventListener('keydown', this.handleKeyDown, true)
    window.removeEventListener('scroll', this.handleScroll, true)
    window.removeEventListener('resize', this.handleScroll)
    if (this.hovered) {
      this.restoreOutline(this.hovered)
      this.hovered = null
    }
    this.removeTooltip()
    this.callbacks.onStopped(reason)
  }

  clearLocked(): void {
    if (this.locked) {
      this.restoreOutline(this.locked)
      this.locked = null
    }
  }

  private applyHighlight(el: Element): void {
    if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return
    if (!this.savedOutlines.has(el)) {
      this.savedOutlines.set(el, { outline: el.style.outline, outlineOffset: el.style.outlineOffset })
    }
    el.style.outline = HIGHLIGHT_OUTLINE
    el.style.outlineOffset = HIGHLIGHT_OUTLINE_OFFSET
  }

  private restoreOutline(el: Element): void {
    const saved = this.savedOutlines.get(el)
    if (!saved || (!(el instanceof HTMLElement) && !(el instanceof SVGElement))) return
    el.style.outline = saved.outline
    el.style.outlineOffset = saved.outlineOffset
    this.savedOutlines.delete(el)
  }

  private handleMouseOver = (event: MouseEvent): void => {
    if (!this.active) return
    const target = event.target
    if (!(target instanceof Element) || isExtensionElement(target)) return
    if (target === this.hovered) return
    if (this.hovered) this.restoreOutline(this.hovered)
    this.hovered = target
    this.applyHighlight(target)
    this.updateTooltip(target)
  }

  private handleClick = (event: MouseEvent): void => {
    if (!this.active) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    const target = event.target
    if (!(target instanceof Element) || isExtensionElement(target)) return

    // 先恢复 hover 高亮再锁定,避免 stop() 把锁定高亮一并还原
    this.clearLocked()
    if (this.hovered) {
      this.restoreOutline(this.hovered)
      this.hovered = null
    }
    this.locked = target
    this.applyHighlight(target)

    const selector = generateSelector(target)
    this.callbacks.onSelect({
      tag: target.tagName.toLowerCase(),
      selector,
      matchCount: countMatches(selector),
      classes: Array.from(target.classList).filter((c) => !c.startsWith(EXTENSION_PREFIX)),
    })
    this.stop('selected')
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      this.stop('cancelled')
    }
  }

  private blockEvent = (event: Event): void => {
    if (!this.active) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
  }

  private handleScroll = (): void => {
    if (this.hovered) this.positionTooltip(this.hovered)
  }

  private ensureTooltip(): HTMLDivElement {
    if (this.tooltip) return this.tooltip
    const el = document.createElement('div')
    el.setAttribute(OVERLAY_ATTRIBUTE, '')
    el.style.cssText = [
      'position: fixed',
      'z-index: 2147483647',
      'pointer-events: none',
      'padding: 4px 8px',
      'border-radius: 4px',
      'background: #1677ff',
      'color: #fff',
      'font: 12px/1.5 monospace',
      'max-width: 60vw',
      'overflow: hidden',
      'text-overflow: ellipsis',
      'white-space: nowrap',
      'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25)',
    ].join(';')
    document.documentElement.appendChild(el)
    this.tooltip = el
    return el
  }

  private updateTooltip(target: Element): void {
    const tooltip = this.ensureTooltip()
    const selector = generateSelector(target)
    tooltip.textContent = `${target.tagName.toLowerCase()}  ${selector}`
    tooltip.style.visibility = 'hidden'
    this.positionTooltip(target)
    tooltip.style.visibility = 'visible'
  }

  private positionTooltip(target: Element): void {
    const tooltip = this.tooltip
    if (!tooltip) return
    const rect = target.getBoundingClientRect()
    const top = rect.top - tooltip.offsetHeight - 6
    tooltip.style.top = `${Math.max(top >= 0 ? top : rect.bottom + 6, 0)}px`
    const maxLeft = window.innerWidth - tooltip.offsetWidth - 8
    tooltip.style.left = `${Math.min(Math.max(rect.left, 8), Math.max(maxLeft, 8))}px`
  }

  private removeTooltip(): void {
    this.tooltip?.remove()
    this.tooltip = null
  }
}
