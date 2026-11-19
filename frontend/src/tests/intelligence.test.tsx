import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { setDevMockOptions } from '../api/config'
import { IntelligencePage } from '../pages/Intelligence/IntelligencePage'

describe('Intelligence Suite Screen Tests', () => {
  beforeEach(() => {
    setDevMockOptions({
      slowNetwork: false,
      failNextCall: false,
      returnEmptyData: false,
    })
  })

  it('renders Intelligence Suite header and tabs', async () => {
    render(
      <MemoryRouter initialEntries={['/repos/1/intelligence']}>
        <Routes>
          <Route path="/repos/:id/intelligence" element={<IntelligencePage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      screen.getByText(/AI & Machine Learning Intelligence Suite/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /PR Review Agent/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ML Bug Propensity/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Automated Test Synthesis/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Sequence Flow & Latent Graph/i })
    ).toBeInTheDocument()
  })

  it('switches to ML Bug Propensity tab and renders defect metrics', async () => {
    render(
      <MemoryRouter initialEntries={['/repos/1/intelligence?tab=defects']}>
        <Routes>
          <Route path="/repos/:id/intelligence" element={<IntelligencePage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText(/High-Risk Files/i)).toBeInTheDocument()
    expect(screen.getByText(/Avg Defect Propensity/i)).toBeInTheDocument()
    expect(await screen.findByText(/shop\/orders\.py/i)).toBeInTheDocument()
  })

  it('renders PR Review Agent verdict and breaking contract risks', async () => {
    render(
      <MemoryRouter initialEntries={['/repos/1/intelligence?tab=pr&symbol_id=3']}>
        <Routes>
          <Route path="/repos/:id/intelligence" element={<IntelligencePage />} />
        </Routes>
      </MemoryRouter>
    )

    const btn = await screen.findByRole('button', { name: /Run Autonomous Review/i })
    fireEvent.click(btn)

    expect(await screen.findByText(/Architectural Gate Verdict/i)).toBeInTheDocument()
    expect(screen.getByText(/Blast Radius Risk Score/i)).toBeInTheDocument()
  })
})
