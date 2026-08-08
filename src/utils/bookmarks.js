import { uid } from '../data/defaults'
import {
  getBookmarkTree,
  hasOptionalPermission,
  removeOptionalPermission,
  requestOptionalPermission
} from './storage'

export function bookmarkCard(node) {
  const url = String(node.url || '').trim()
  return {
    id: uid('card'),
    icon: {
      source: 'image',
      src: `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=128`
    },
    title: node.title || url,
    url,
    openMethod: 1,
    lanUrl: '',
    description: '',
    tags: [],
    isVpnRequired: false,
    clickCount: 0,
    createdAt: Date.now(),
    sort: 99999
  }
}

export function parseBookmarkNodes(nodes = []) {
  return nodes
    .filter((node) => node?.url)
    .map(bookmarkCard)
}

export function parseBookmarkTreeToGroups(nodes = []) {
  const groups = []
  nodes.forEach((node) => {
    if (!node) return
    if (node.children?.length) {
      const children = parseBookmarkNodes(node.children)
      if (children.length) {
        groups.push({
          title: node.title || 'Imported bookmarks',
          subtitle: '',
          children
        })
      }
    } else if (node.url) {
      groups.push({
        title: 'Imported bookmarks',
        subtitle: '',
        children: [bookmarkCard(node)]
      })
    }
  })
  return groups
}

export function normalizeBookmarkUrl(url) {
  try {
    return new URL(url).href.replace(/\/$/, '').toLowerCase()
  } catch {
    return String(url || '').trim().toLowerCase()
  }
}

export function mergeBookmarkGroups(currentLinks, groups = []) {
  const links = Array.isArray(currentLinks) ? currentLinks : []
  const existingUrls = new Set(
    links.flatMap((category) => category.children.map((card) => normalizeBookmarkUrl(card.url)))
  )
  let addedCount = 0

  groups.forEach((group) => {
    const existing = links.find(
      (category) => String(category.title || '').trim().toLowerCase() === String(group.title || '').trim().toLowerCase()
    )
    const target = existing || {
      id: uid('category'),
      title: group.title || 'Imported bookmarks',
      subtitle: group.subtitle || '',
      sort: links.length,
      children: []
    }
    group.children.forEach((card) => {
      const urlKey = normalizeBookmarkUrl(card.url)
      if (!urlKey || existingUrls.has(urlKey)) return
      existingUrls.add(urlKey)
      target.children.push(card)
      addedCount += 1
    })
    if (!existing && target.children.length) links.push(target)
  })

  return { links, addedCount }
}

export async function ensureBookmarkPermission() {
  return requestOptionalPermission('bookmarks')
}

export async function hasBookmarkPermission() {
  return hasOptionalPermission('bookmarks')
}

export async function revokeBookmarkPermission() {
  return removeOptionalPermission('bookmarks')
}

export async function fetchBrowserBookmarkGroups() {
  const tree = await getBookmarkTree()
  const root = tree?.[0]
  return parseBookmarkTreeToGroups(root?.children || [])
}
