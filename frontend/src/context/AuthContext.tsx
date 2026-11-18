import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  getCurrentUser,
  getGithubAuthUrl,
  loginUser,
  loginWithGithubToken,
  loginWithGithubUser,
  registerUser,
} from '../api/client'
import type { User } from '../api/types'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  setSession: (user: User, token: string) => void
  logout: () => void
  loginWithGitHubOAuth: () => Promise<{ configured: boolean; url: string | null }>
  loginWithToken: (token: string) => Promise<User>
  loginWithUsername: (username: string) => Promise<User>
  loginWithCredentials: (email: string, password?: string) => Promise<User>
  registerWithCredentials: (name: string, email: string, password?: string) => Promise<User>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const USER_KEY = 'gka_user'
const TOKEN_KEY = 'gka_token'

const getStorage = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      return window.localStorage.getItem(key)
    }
  } catch {
    // ignore
  }
  return null
}

const setStorage = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // ignore
  }
}

const removeStorage = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.removeItem === 'function') {
      window.localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = getStorage(USER_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState<string | null>(() => {
    return getStorage(TOKEN_KEY)
  })
  const [loading, setLoading] = useState(false)

  // Verify / refresh session on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = getStorage(TOKEN_KEY)
      if (savedToken) {
        try {
          const freshUser = await getCurrentUser()
          if (freshUser && freshUser.id) {
            setUser(freshUser)
            setStorage(USER_KEY, JSON.stringify(freshUser))
          }
        } catch {
          // Token invalid or backend offline, keep cached user
        }
      }
    }
    initAuth()
  }, [])

  const setSession = (newUser: User, newToken: string) => {
    setUser(newUser)
    setToken(newToken)
    setStorage(USER_KEY, JSON.stringify(newUser))
    setStorage(TOKEN_KEY, newToken)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    removeStorage(USER_KEY)
    removeStorage(TOKEN_KEY)
  }

  const loginWithGitHubOAuth = async () => {
    const config = await getGithubAuthUrl()
    return config
  }

  const loginWithToken = async (ghToken: string) => {
    setLoading(true)
    try {
      const res = await loginWithGithubToken(ghToken)
      setSession(res.user, res.token)
      return res.user
    } finally {
      setLoading(false)
    }
  }

  const loginWithUsername = async (username: string) => {
    setLoading(true)
    try {
      const res = await loginWithGithubUser(username)
      setSession(res.user, res.token)
      return res.user
    } finally {
      setLoading(false)
    }
  }

  const loginWithCredentials = async (email: string, password?: string) => {
    setLoading(true)
    try {
      const res = await loginUser(email, password)
      setSession(res.user, res.token)
      return res.user
    } finally {
      setLoading(false)
    }
  }

  const registerWithCredentials = async (name: string, email: string, password?: string) => {
    setLoading(true)
    try {
      const res = await registerUser(name, email, password)
      setSession(res.user, res.token)
      return res.user
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && user.id),
        setSession,
        logout,
        loginWithGitHubOAuth,
        loginWithToken,
        loginWithUsername,
        loginWithCredentials,
        registerWithCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

const defaultAuth: AuthContextType = {
  user: null,
  token: null,
  loading: false,
  isAuthenticated: false,
  setSession: () => {},
  logout: () => {},
  loginWithGitHubOAuth: async () => ({ configured: false, url: null }),
  loginWithToken: async () => ({ id: 0, username: '' }),
  loginWithUsername: async () => ({ id: 0, username: '' }),
  loginWithCredentials: async () => ({ id: 0, username: '' }),
  registerWithCredentials: async () => ({ id: 0, username: '' }),
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  return context || defaultAuth
}
