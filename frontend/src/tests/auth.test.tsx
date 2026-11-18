import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { GitHubLoginModal } from '../components/GitHubLoginModal'
import { AuthProvider } from '../context/AuthContext'
import { LoginPage } from '../pages/Auth/LoginPage'
import { RegisterPage } from '../pages/Auth/RegisterPage'

describe('Auth & GitHub Login Components', () => {
  it('GitHubLoginModal renders modal header and options correctly', () => {
    const handleClose = vi.fn()
    const handleSuccess = vi.fn()

    render(
      <AuthProvider>
        <GitHubLoginModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      </AuthProvider>
    )

    expect(screen.getByRole('heading', { name: /connect github account/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /authorize via github oauth/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /username/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /token \(private repos\)/i })).toBeInTheDocument()
  })

  it('GitHubLoginModal switches between tabs and allows typing username', () => {
    render(
      <AuthProvider>
        <GitHubLoginModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />
      </AuthProvider>
    )

    const input = screen.getByPlaceholderText('e.g. dipak009156')
    expect(input).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'dipak009156' } })
    expect((input as HTMLInputElement).value).toBe('dipak009156')
  })

  it('GitHubLoginModal switches to Token tab and displays token input', () => {
    render(
      <AuthProvider>
        <GitHubLoginModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />
      </AuthProvider>
    )

    const tokenTab = screen.getByRole('button', { name: /token \(private repos\)/i })
    fireEvent.click(tokenTab)

    expect(screen.getByLabelText(/personal access token/i)).toBeInTheDocument()
    expect(screen.getByText(/Enables cloning private repositories/i)).toBeInTheDocument()
  })

  it('RegisterPage renders GitHub Sign-Up button and opens modal when clicked', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </MemoryRouter>
    )

    const githubBtn = screen.getByRole('button', { name: /sign up with github/i })
    expect(githubBtn).toBeInTheDocument()

    fireEvent.click(githubBtn)
    expect(screen.getByRole('heading', { name: /connect github account/i })).toBeInTheDocument()
  })

  it('LoginPage renders GitHub Sign-In button and opens modal when clicked', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    )

    const githubBtn = screen.getByRole('button', { name: /continue with github/i })
    expect(githubBtn).toBeInTheDocument()

    fireEvent.click(githubBtn)
    expect(screen.getByRole('heading', { name: /sign in with github/i })).toBeInTheDocument()
  })
})
