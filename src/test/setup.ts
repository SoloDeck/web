import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// jsdom has no IntersectionObserver, and `useScrollReveal` calls the constructor
// directly — so every test rendering a `RevealOnScroll` subtree would throw
// ReferenceError. Report the target as visible immediately so revealed content is
// assertable; nothing in the app depends on the reveal being deferred.
class NoopIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ''
  readonly scrollMargin = ''
  readonly thresholds: readonly number[] = []
  // Explicit field, not a constructor parameter property — tsconfig sets
  // `erasableSyntaxOnly`, which forbids the shorthand.
  private readonly cb: IntersectionObserverCallback
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb
  }
  observe(target: Element): void {
    this.cb([{ isIntersecting: true, target } as IntersectionObserverEntry], this)
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}
vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver)

// Node 26 ships a native (disabled) `localStorage` global that shadows jsdom's
// Storage, leaving both `localStorage` and `window.localStorage` undefined. The
// app guards every storage access with try/catch so it degrades silently, but
// tests need a real, resettable Storage. Install a Map-backed polyfill.
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length(): number {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

function installStorage(name: 'localStorage' | 'sessionStorage'): Storage {
  const value = new MemoryStorage()
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, name, { value, configurable: true, writable: true })
  }
  return value
}

// Install once at module load — before any source module (e.g. configs/axios)
// caches a storage reference — then reset contents (not the instance) per test.
const localStorageRef = installStorage('localStorage')
const sessionStorageRef = installStorage('sessionStorage')

beforeEach(() => {
  localStorageRef.clear()
  sessionStorageRef.clear()
})

// Unmount React trees and reset jsdom between tests to avoid cross-test leakage.
afterEach(() => {
  cleanup()
})
