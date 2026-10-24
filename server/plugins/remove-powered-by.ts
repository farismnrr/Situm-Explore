export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response) => {
    for (const header of Object.keys(response.headers ?? {})) {
      if (header.toLowerCase() === 'x-powered-by') {
        delete response.headers?.[header]
      }
    }
  })
})
