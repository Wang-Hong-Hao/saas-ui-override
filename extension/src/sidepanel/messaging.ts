import type { CommandResult, ContentCommand } from '../shared/messages'

export async function getActiveTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id ?? null
}

export async function sendToContent(tabId: number, message: ContentCommand): Promise<CommandResult> {
  return (await chrome.runtime.sendMessage({ target: 'content', tabId, message })) as CommandResult
}
