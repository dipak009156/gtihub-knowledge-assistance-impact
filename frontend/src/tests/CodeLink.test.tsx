import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CodeLink } from '../components/CodeLink'

describe('CodeLink component', () => {
  it('builds the correct URL with file, start line, and end line', () => {
    render(
      <MemoryRouter initialEntries={['/repos/42/overview']}>
        <Routes>
          <Route
            path="/repos/:id/overview"
            element={
              <CodeLink file="shop/cart.py" line={27} end={45}>
                Jump to cart
              </CodeLink>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    const link = screen.getByRole('link', { name: 'Jump to cart' })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe(
      '/repos/42/code?path=shop%2Fcart.py&line=27&end=45'
    )
  })

  it('uses explicit repoId prop if provided', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <CodeLink repoId={99} file="main.py" line={10}>
          Main line 10
        </CodeLink>
      </MemoryRouter>
    )

    const link = screen.getByRole('link', { name: 'Main line 10' })
    expect(link.getAttribute('href')).toBe('/repos/99/code?path=main.py&line=10')
  })
})

