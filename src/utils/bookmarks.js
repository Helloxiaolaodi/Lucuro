import { uid } from '../data/defaults'
import { createBookmark, getBookmarkTree } from './storage'

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
  const walk = (items, parentTitle) => {
    const directCards = []
    items.forEach((node) => {
      if (!node) return
      if (node.url) {
        directCards.push(bookmarkCard(node))
        return
      }
      const folderTitle = node.title || 'Bookmarks'
      const pathTitle = parentTitle ? `${parentTitle} - ${folderTitle}` : folderTitle
      walk(node.children || [], pathTitle)
    })
    if (directCards.length) {
      pushOrMergeGroup(groups, parentTitle || 'Imported bookmarks', directCards)
    }
  }
  walk(nodes, '')
  return groups
}

function uniqueBookmarkNodes(nodes = []) {
  const seen = new Set()
  const result = []
  const visit = (items = []) => {
    items.forEach((node) => {
      if (!node || typeof node !== 'object') return
      if (seen.has(node)) return
      seen.add(node)
      result.push(node)
      if (Array.isArray(node.children) && node.children.length) visit(node.children)
    })
  }
  visit(nodes)
  return result
}

function pushOrMergeGroup(groups, title, cards) {
  const normalizedTitle = String(title || 'Imported bookmarks').trim()
  const existing = groups.find(
    (group) => String(group.title || '').trim().toLowerCase() === normalizedTitle.toLowerCase()
  )
  if (existing) {
    existing.children = dedupeCards([...existing.children, ...cards])
    return
  }
  groups.push({
    id: uid('category'),
    title: normalizedTitle,
    subtitle: '',
    children: dedupeCards(cards)
  })
}

function dedupeCards(cards = []) {
  const seen = new Set()
  const result = []
  cards.forEach((card) => {
    const key = `${normalizeBookmarkUrl(card.url)}|${String(card.title || '').trim().toLowerCase()}`
    if (!key || seen.has(key)) return
    seen.add(key)
    result.push(card)
  })
  return result
}

export async function createBookmarkFolder(title) {
  const result = await createBookmark({ title, type: 'folder' })
  return result?.id || null
}

export async function createBookmarkLink({ parentId, title, url }) {
  if (!parentId || !title || !url) return false
  const result = await createBookmark({ parentId, title, url })
  return Boolean(result?.id)
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

export async function fetchBrowserBookmarkGroups() {
  const tree = await getBookmarkTree()
  const root = tree?.[0]
  const candidates = [
    root?.children || [],
    root ? [root] : [],
    tree || []
  ]

  for (const nodes of candidates) {
    const groups = parseBookmarkTreeToGroups(nodes)
    if (groups.length) return groups
  }

  const uniqueNodes = uniqueBookmarkNodes(tree || [])
  if (uniqueNodes.length) {
    const directNodes = uniqueNodes.filter((node) => node?.url)
    const folderNodes = uniqueNodes.filter((node) => Array.isArray(node?.children))
    const fallbackGroups = parseBookmarkTreeToGroups(folderNodes)
    const directCards = parseBookmarkNodes(directNodes)
    if (directCards.length) {
      const existing = fallbackGroups.find(
        (group) => String(group.title || '').trim().toLowerCase() === 'imported bookmarks'
      )
      if (existing) {
        existing.children.push(...directCards)
      } else {
        fallbackGroups.push({
          id: uid('category'),
          title: 'Imported bookmarks',
          subtitle: '',
          children: directCards
        })
      }
    }
    if (fallbackGroups.length) return fallbackGroups
  }

  return []
}
