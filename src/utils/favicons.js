const FAVICON_SERVICE_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'icons.duckduckgo.com',
  'favicon.im',
  'api.iowen.cn',
  'unavatar.io'
])

const FAVICON_PROVIDERS = [
  (hostname) => `https://favicon.im/${encodeURIComponent(hostname)}?larger=true`,
  (hostname) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`,
  (hostname) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`,
  (hostname) => `https://unavatar.io/${encodeURIComponent(hostname)}?fallback=false`
]

const DIRECT_FAVICON_PATHS = [
  '/apple-touch-icon.png',
  '/favicon-192x192.png',
  '/favicon-32x32.png',
  '/favicon.ico',
  '/favicon.png'
]

export function isAutoFaviconServiceUrl(value) {
  try {
    return FAVICON_SERVICE_HOSTS.has(new URL(String(value)).hostname)
  } catch {
    return false
  }
}

export function buildFaviconCandidates(hostname) {
  const host = String(hostname || '').trim().toLowerCase()
  if (!host) return []

  const rootHost = host.replace(/^www\./, '')
  const hosts = rootHost === host ? [host] : [host, rootHost]
  const urls = FAVICON_PROVIDERS.map((provider) => provider(host))

  hosts.forEach((currentHost) => {
    DIRECT_FAVICON_PATHS.forEach((directPath) => {
      urls.push(`https://${currentHost}${directPath}`)
    })
  })

  return urls.filter((value, index, all) => all.indexOf(value) === index)
}
