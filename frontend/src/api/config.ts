export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

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

