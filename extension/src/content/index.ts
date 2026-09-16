import { ElementPicker } from './element-picker'
import { classCssExists, countMatches } from './dom-utils'
import { applyPreview, clearPreview } from './preview-applier'
import type { CommandResult, ContentCommand, PickerEvent } from '../shared/messages'

function emit(event: PickerEvent): void {
  // side panel 可能未打开,忽略连接失败
  void chrome.runtime.sendMessage(event).catch(() => {})
}

const picker = new ElementPicker({
  onSelect: (payload) => emit({ type: 'picker:selected', payload }),
  onStopped: (reason) => emit({ type: reason === 'selected' ? 'picker:stopped' : 'picker:cancelled' }),
})

chrome.runtime.onMessage.addListener(
  (message: ContentCommand, _sender, sendResponse: (result: CommandResult) => void) => {
    switch (message.type) {
      case 'picker:start':
        picker.start()
        sendResponse({ ok: true })
        break
      case 'picker:stop':
        picker.stop('cancelled')
        sendResponse({ ok: true })
        break
      case 'selector:count':
        sendResponse({ ok: true, matchCount: countMatches(message.selector) })
        break
      case 'preview:apply':
        applyPreview(message.rules)
        sendResponse({ ok: true })
        break
      case 'preview:clear':
        clearPreview()
        sendResponse({ ok: true })
        break
      case 'class:exists':
        sendResponse({ ok: true, exists: classCssExists(message.className) })
        break
      case 'page:host':
        sendResponse({ ok: true, host: location.host })
        break
      case 'rules:check':
        sendResponse({ ok: true, matchCounts: message.selectors.map((s) => countMatches(s)) })
        break
      default:
        sendResponse({ ok: false, error: 'unknown command' })
    }
    return false
  },
)
