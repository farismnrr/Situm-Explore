// Safe, broadly-applicable response headers. A strict Content-Security-Policy
// is intentionally NOT set here yet. The primary web Map is now app-owned,
// but the repository still retains a separately verified Situm Viewer utility
// whose hosted iframe/script/connect origin set has never been proven by a
// current live network trace. Per this repo's "no evidence, no implementation"
// rule, CSP remains a separate evidence-backed security change rather than a
// guessed allowlist.
export default defineEventHandler((event) => {
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setResponseHeader(event, 'X-Frame-Options', 'DENY')
  setResponseHeader(event, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
})
