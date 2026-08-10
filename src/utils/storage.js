import browser from 'webextension-polyfill'

const extensionStorage = browser?.storage?.local || globalThis.chrome?.storage?.local
const extensionSyncStorage = browser?.storage?.sync || globalThis.chrome?.storage?.sync
const extensionBookmarks = browser?.bookmarks || globalThis.browser?.bookmarks || globalThis.chrome?.bookmarks

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

async function callApi(apiMethod, args = [], fallback = false) {
  try {
    const result = apiMethod(...args)
    if (result && typeof result.then === 'function') {
      const resolved = await result
      if (resolved !== undefined) return resolved
    } else if (result !== undefined) {
      return result
    }
  } catch {
    // Fall through to callback-style APIs, used by non-promisified Chrome contexts.
  }
  return new Promise((resolve) => {
    try {
      const result = apiMethod(...args, (value) => resolve(value === undefined ? fallback : value))
      if (result && typeof result.then === 'function') {
        result
          .then((value) => resolve(value === undefined ? fallback : value))
          .catch(() => resolve(fallback))
      }
    } catch {
      resolve(fallback)
    }
  })
}

export async function getBookmarkTree() {
  if (!extensionBookmarks?.getTree) {
    throw new Error('Bookmarks API is unavailable')
  }
  const tree = await callBookmarksApi(extensionBookmarks.getTree.bind(extensionBookmarks), [], [])
  return Array.isArray(tree) ? tree : []
}

export async function createBookmark(payload) {
  if (!extensionBookmarks?.create) return false
  const result = await callBookmarksApi(extensionBookmarks.create.bind(extensionBookmarks), [payload])
  return result && typeof result === 'object' ? result : false
}

async function callBookmarksApi(apiMethod, args = []) {
  try {
    const result = apiMethod(...args)
    if (result && typeof result.then === 'function') {
      return await result
    }
    if (result !== undefined) return result
  } catch (error) {
    // Some Chrome contexts only expose callback-style APIs. Calling the
    // method without a callback throws, so retry with a callback below.
    console.warn('[Lucuro] Falling back to callback-style bookmarks API', error)
  }

  return new Promise((resolve, reject) => {
    try {
      apiMethod(...args, (value) => {
        const lastError = globalThis.chrome?.runtime?.lastError
        if (lastError) {
          reject(new Error(lastError.message))
          return
        }
        resolve(value)
      })
    } catch (error) {
      reject(error)
    }
  })
}
