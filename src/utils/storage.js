import browser from 'webextension-polyfill'

const extensionStorage = browser?.storage?.local || globalThis.chrome?.storage?.local
const extensionTabs = browser?.tabs || globalThis.chrome?.tabs
const extensionSyncStorage = browser?.storage?.sync || globalThis.chrome?.storage?.sync
const extensionBookmarks = browser?.bookmarks || globalThis.chrome?.bookmarks

export const storage = {
  async get(key) {
    if (extensionStorage) {
      const result = await extensionStorage.get(key)
      return result[key]
    }
    const raw = localStorage.getItem(key)
    try {
      return raw ? JSON.parse(raw) : null
    } catch {
      return raw
    }
  },

  async set(key, value) {
    const payload = { [key]: value }
    if (extensionStorage) {
      await extensionStorage.set(payload)
      return
    }
    localStorage.setItem(key, JSON.stringify(value))
  },

  async remove(key) {
    if (extensionStorage) {
      await extensionStorage.remove(key)
      return
    }
    localStorage.removeItem(key)
  }
}

export const syncStorage = {
  async get(key) {
    if (extensionSyncStorage) {
      const result = await extensionSyncStorage.get(key)
      return result[key]
    }
    return null
  },

  async set(key, value) {
    if (!extensionSyncStorage) return false
    await extensionSyncStorage.set({ [key]: value })
    return true
  },

  async remove(key) {
    if (extensionSyncStorage) {
      await extensionSyncStorage.remove(key)
    }
  }
}

export function onStorageChanged(callback) {
  const api = browser?.storage?.onChanged || globalThis.chrome?.storage?.onChanged
  if (!api?.addListener) return () => {}
  const listener = (changes, areaName) => callback(changes, areaName)
  api.addListener(listener)
  return () => {
    if (api.removeListener) api.removeListener(listener)
  }
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function isExtensionContext() {
  return Boolean(extensionStorage)
}

export function getExtensionRuntime() {
  return browser?.runtime || globalThis.chrome?.runtime || null
}

export function getExtensionTabs() {
  return extensionTabs
}

function promisify(apiMethod, ...args) {
  return new Promise((resolve) => {
    let settled = false
    const done = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    try {
      const result = apiMethod(...args, done)
      if (result && typeof result.then === 'function') {
        result.then(done).catch(() => done(false))
      }
    } catch {
      done(false)
    }
  })
}

export function getBookmarkTree() {
  if (!extensionBookmarks?.getTree) return Promise.resolve([])
  return promisify(extensionBookmarks.getTree.bind(extensionBookmarks))
}

export async function requestOptionalPermission(permission) {
  const api = browser?.permissions || globalThis.chrome?.permissions
  if (!api?.request) return true
  const request = { permissions: [permission] }
  const hasPermission = await promisify(api.contains.bind(api), request)
  if (hasPermission) return true
  return Boolean(await promisify(api.request.bind(api), request))
}

export async function hasOptionalPermission(permission) {
  const api = browser?.permissions || globalThis.chrome?.permissions
  if (!api?.contains) return true
  return Boolean(await promisify(api.contains.bind(api), { permissions: [permission] }))
}

export async function removeOptionalPermission(permission) {
  const api = browser?.permissions || globalThis.chrome?.permissions
  if (!api?.remove) return false
  return Boolean(await promisify(api.remove.bind(api), { permissions: [permission] }))
}

export function queryActiveTab() {
  if (!extensionTabs) {
    return Promise.resolve([{ title: window.document.title, url: window.location.href }])
  }
  return extensionTabs.query({ active: true, currentWindow: true })
}

export async function ensureOriginPermission(url) {
  let origin
  try {
    origin = new URL(url).origin
  } catch {
    return true
  }
  const permissionsApi = browser?.permissions || globalThis.chrome?.permissions
  if (!permissionsApi?.contains || !permissionsApi?.request) return true
  const permission = { origins: [`${origin}/*`] }
  try {
    const hasPermission = await permissionsApi.contains(permission)
    if (hasPermission) return true
    return Boolean(await permissionsApi.request(permission))
  } catch {
    return true
  }
}
