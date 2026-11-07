// Tests run against the mock layer for standalone CI/Vitest execution.
// In dev and production, USE_MOCKS is FALSE by default (connecting directly to the live backend).
export const USE_MOCKS =
  import.meta.env.MODE === 'test'
    ? true
    : import.meta.env.VITE_USE_MOCKS === 'true'

export interface DevMockOptions {
  slowNetwork: boolean
  failNextCall: boolean
  returnEmptyData: boolean
}

let options: DevMockOptions = {
  slowNetwork: false,
  failNextCall: false,
  returnEmptyData: false,
}

const listeners = new Set<(opts: DevMockOptions) => void>()

export const getDevMockOptions = (): DevMockOptions => ({ ...options })

export const setDevMockOptions = (newOpts: Partial<DevMockOptions>) => {
  options = { ...options, ...newOpts }
  listeners.forEach((cb) => cb(options))
}

export const subscribeDevMockOptions = (cb: (opts: DevMockOptions) => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
