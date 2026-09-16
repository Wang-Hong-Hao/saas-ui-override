import type { ContentRequest } from '../shared/messages'

// 点击扩展图标打开 side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: unknown) => console.error('[saas-ui-override] setPanelBehavior failed', error))

// sidepanel → content script 消息路由(side panel 无法直接定位 tab,经 background 携带 tabId 转发)
chrome.runtime.onMessage.addListener((message: ContentRequest, _sender, sendResponse) => {
  if (message?.target !== 'content' || typeof message.tabId !== 'number') return false
  chrome.tabs.sendMessage(message.tabId, message.message).then(
    (response) => sendResponse(response),
    (error: unknown) =>
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
  )
  return true
})
