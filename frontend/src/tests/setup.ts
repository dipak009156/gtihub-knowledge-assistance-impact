import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()

  const store: Record<string, string> = {}
  const mockStorage: Storage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k])
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    length: 0,
  }

  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  })
}

