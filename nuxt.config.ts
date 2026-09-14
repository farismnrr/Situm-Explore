export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  app: {
    head: {
      title: 'Situm Explore',
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png?v=20260911' },
        { rel: 'shortcut icon', type: 'image/png', href: '/favicon.png?v=20260911' }
      ]
    }
  },
  modules: ['@nuxt/ui', 'nuxt-auth-utils', '@nuxt/eslint', 'nuxt-agentation'],
  icon: {
    provider: 'none',
    clientBundle: { scan: true }
  },
  css: ['~/assets/css/main.css'],
  colorMode: { preference: 'light', fallback: 'light', classSuffix: '' },
  runtimeConfig: {
    session: { name: 'nuxt-session', password: process.env.NUXT_SESSION_PASSWORD || '', maxAge: 60 * 60 * 24 * 7, sessionHeader: 'x-nuxt-session', cookie: { secure: process.env.NUXT_SESSION_COOKIE_SECURE === 'true' } },
    databaseUrl: process.env.DATABASE_URL,
    databaseSchema: process.env.DATABASE_SCHEMA || '',
    otel: { serviceName: process.env.OTEL_SERVICE_NAME || 'situm-explore', endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '', protocol: process.env.OTEL_EXPORTER_OTLP_PROTOCOL || 'http/protobuf' },
    oauth: { google: { clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID || '', clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET || '', redirectURL: process.env.NUXT_OAUTH_GOOGLE_REDIRECT_URL || '' } },
    workspaceCredentialEncryptionKey: process.env.NUXT_WORKSPACE_CREDENTIAL_ENCRYPTION_KEY || '',
    clickhouse: { url: process.env.CLICKHOUSE_URL || 'http://localhost:8124', user: process.env.CLICKHOUSE_USER || '', password: process.env.CLICKHOUSE_PASSWORD || '', database: process.env.CLICKHOUSE_DB || '' },
    situm3d: {
      assetDir: process.env.NUXT_SITUM3D_ASSET_DIR || '',
      modelBaseUrl: process.env.NUXT_SITUM3D_MODEL_BASE_URL || ''
    },
    sensioEnv: {
      baseUrl: process.env.SENSIO_ENV_URL || process.env.SENSIO_ENV_BASE_URL || 'http://100.99.88.53:3002',
      configToken: process.env.SENSIO_ENV_TOKEN || process.env.SENSIO_ENV_CONFIG_TOKEN || '',
      configTokenFile: process.env.SENSIO_ENV_CONFIG_TOKEN_FILE || '',
      workspaceId: process.env.SENSIO_ENV_WORKSPACE || process.env.SENSIO_ENV_WORKSPACE_ID || 'berjaya-inovasi-global',
      projectId: process.env.SENSIO_ENV_PROJECT || process.env.SENSIO_ENV_PROJECT_ID || 'shared'
    },
    mobileRelease: {
      s3Prefix: process.env.NUXT_MOBILE_RELEASE_S3_PREFIX || 'situm-explore/android',
      publicBaseUrl: process.env.NUXT_MOBILE_RELEASE_PUBLIC_BASE_URL || 'https://situm.devoutsys.com'
    },
    public: {
      mobile: {
        appScheme: process.env.NUXT_PUBLIC_MOBILE_APP_SCHEME || 'situm-explore',
        universalLinkBaseUrl: process.env.NUXT_PUBLIC_MOBILE_UNIVERSAL_LINK_BASE_URL || '',
        androidStoreUrl: process.env.NUXT_PUBLIC_MOBILE_ANDROID_STORE_URL || '',
        iosStoreUrl: process.env.NUXT_PUBLIC_MOBILE_IOS_STORE_URL || '',
        androidDownloadUrl: process.env.NUXT_PUBLIC_MOBILE_ANDROID_DOWNLOAD_URL || 'https://situm.devoutsys.com/api/mobile/android/download',
        iosDownloadUrl: process.env.NUXT_PUBLIC_MOBILE_IOS_DOWNLOAD_URL || ''
      }
    }
  }
})
