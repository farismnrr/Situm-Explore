import type { ExpoWebGLRenderingContext } from 'expo-gl'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type NativeThreeCompatibility = {
  context: WebGLRenderingContext
  actualContextType: string
  multisampleFallbacks: () => number
  parseGltf: (bytes: ArrayBuffer) => Promise<Awaited<ReturnType<GLTFLoader['parseAsync']>>>
}

/**
 * Expo GL exposes a WebGL2-shaped context but does not implement the
 * multisample renderbuffer path Three uses for transmission render targets.
 * Keep the real GLB materials intact and downgrade only that renderbuffer
 * allocation to ordinary storage inside this one native compatibility seam.
 */
export function createNativeThreeCompatibility(gl: ExpoWebGLRenderingContext): NativeThreeCompatibility {
  let multisampleFallbackCount = 0
  const actualConstructor = gl.constructor
  const context = new Proxy(gl as unknown as object, {
    get(target, property) {
      if (property === 'renderbufferStorageMultisample') {
        return (renderbuffer: unknown, _samples: unknown, internalFormat: unknown, width: unknown, height: unknown) => {
          multisampleFallbackCount++
          const storage = Reflect.get(target, 'renderbufferStorage', target)
          if (typeof storage !== 'function') throw new Error('Native GL renderbuffer storage is unavailable.')
          return storage.call(target, renderbuffer, internalFormat, width, height)
        }
      }
      if (property === 'constructor') return actualConstructor
      const value = Reflect.get(target, property, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as unknown as WebGLRenderingContext

  return {
    context,
    actualContextType: gl.constructor?.name || 'unknown',
    multisampleFallbacks: () => multisampleFallbackCount,
    parseGltf: parseGltfBytes,
  }
}

function parseGltfBytes(bytes: ArrayBuffer) {
  const restore = installGltfNavigatorCompatibility()
  return new GLTFLoader().parseAsync(bytes, '').finally(restore)
}

function installGltfNavigatorCompatibility() {
  const runtime = globalThis as typeof globalThis & { navigator?: { userAgent?: unknown } }
  const descriptor = Object.getOwnPropertyDescriptor(runtime, 'navigator')
  const current = runtime.navigator
  if (current && typeof current.userAgent === 'string') return () => undefined

  Object.defineProperty(runtime, 'navigator', {
    configurable: true,
    enumerable: descriptor?.enumerable ?? false,
    value: { ...(current ?? {}), userAgent: 'Android' },
    writable: true,
  })

  return () => {
    if (descriptor) Object.defineProperty(runtime, 'navigator', descriptor)
    else delete (runtime as unknown as { navigator?: unknown }).navigator
  }
}
