export default defineEventHandler((event) => {
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setResponseHeader(event, 'X-Frame-Options', 'DENY')
  setResponseHeader(event, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  setResponseHeader(event, 'Content-Security-Policy-Report-Only', "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
  if (useRuntimeConfig(event).session.cookie.secure) {
    setResponseHeader(event, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  removeResponseHeader(event, 'X-Powered-By')
})
