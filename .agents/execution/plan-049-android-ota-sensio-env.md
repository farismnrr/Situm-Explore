# Execution Brief — Plan 049 Android OTA via Sensio Env + S3

Branch: `plan/049-android-ota-sensio-env`
Base: fetched `origin/main` at `9a569c5c8ca816904cca6699cdb1f27b47d17d9a`

## Authority

The user explicitly authorized starting/fixing Android OTA, using the existing Sensio Env S3 configuration, targeting production API/domain `https://situm.devoutsys.com`, and starting the human release version line at `v0.1.0`.

Do not deploy/reconfigure the already-deployed production web/backend as part of this plan unless required for the OTA server contract. Do not weaken S3 privacy or TLS validation. Do not expose Sensio Env/S3 secrets.

## Execution order

Codebase-serial execution is mandatory:

1. `web`: add the narrow backend OTA/Sensio Env/S3 delivery boundary and focused verification.
2. `mobile`: repoint update feed, set `0.1.0` release baseline, add private-S3 publisher and focused verification.
3. release packaging/publish attempt for Android arm64.

## Known external production condition

At plan start, live diagnostics showed `situm.devoutsys.com` resolving to `202.59.166.142`, presenting a Let's Encrypt certificate whose subject is `CN=testgadaiemas.devoutsys.com`, and serving a `Web Panel Home`/`GadaiEmasMobile` root response. Treat this as an external production routing/TLS blocker. Never bypass it in the APK with insecure TLS.

## Release identity

- semantic version: `0.1.0`
- Android package: `com.situm.explore`
- Android versionCode: `4` because historical shipped release evidence reached versionCode `3`
- environment: `production`
- API base: `https://situm.devoutsys.com`
- ABI: `arm64-v8a` only

## Sensio Env source

Use the protected internal snapshot contract. The current global shared scope is `berjaya-inovasi-global/shared`; the internal snapshot exposes the required S3 keys to a valid service token and keeps them out of Git/client artifacts.

Never print or persist `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, or the Sensio Env config token.
