const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Mobile deliberately consumes pure cross-runtime contracts from ../shared.
// Keep the watch scope narrow so Metro does not crawl the whole Nuxt workspace.
config.watchFolders = [path.resolve(__dirname, '../shared')]

module.exports = config
