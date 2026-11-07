import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { setDevMockOptions } from '../api/config'
import { ChatPage } from '../pages/Chat/ChatPage'
import { HomePage } from '../pages/Home/HomePage'
import { HotspotsPage } from '../pages/Hotspots/HotspotsPage'
import { ImpactPage } from '../pages/Impact/ImpactPage'
import { OverviewPage } from '../pages/Overview/OverviewPage'
import { ProgressPage } from '../pages/Progress/ProgressPage'
import { ValidationPage } from '../pages/Validation/ValidationPage'

describe('Screen tests', () => {
  beforeEach(() => {
    setDevMockOptions({
      slowNetwork: false,
      failNextCall: false,
      returnEmptyData: false,
    })
  })

  it('Home: shows a friendly message for an invalid link and does not submit', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(/pallets\/click/i)
    const button = screen.getByRole('button', { name: /analyze/i })

    fireEvent.change(input, { target: { value: 'https://notgithub.com/bad/repo' } })
    fireEvent.click(button)

    expect(
      await screen.findByText(/Only public github.com links work/i)
    ).toBeInTheDocument()
  })

  it('Home: renders 3-step explainer and ready-made demo examples', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>
    )

    expect(
      screen.getByText(/Pick a function. See what breaks if you change it/i)
    ).toBeInTheDocument()
    expect(await screen.findByText('shop-app')).toBeInTheDocument()
  })

  it('Progress: renders 3-step stepper and status', async () => {
    render(
      <MemoryRouter initialEntries={['/repos/2/progress']}>
        <Routes>
          <Route path="/repos/:id/progress" element={<ProgressPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText(/Queued/i)).toBeInTheDocument()
    expect(screen.getByText(/Analyzing/i)).toBeInTheDocument()
    expect(screen.getByText(/Ready/i)).toBeInTheDocument()
  })

  it('Overview: renders metric stat cards and top 5 hotspots', async () => {
    render(
      <MemoryRouter initialEntries={['/repos/1']}>
        <Routes>
          <Route path="/repos/:id" element={<OverviewPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByText(/Python Files/i, {}, { timeout: 3000 })
    ).toBeInTheDocument()
    expect(screen.getByText('Functions')).toBeInTheDocument()
    expect(
      await screen.findByText(/Top 5 Hotspot Files/i, {}, { timeout: 3000 })
    ).toBeInTheDocument()
  })

  it('Overview: renders empty state when returnEmptyData is toggled', async () => {
    setDevMockOptions({ returnEmptyData: true })

    render(
      <MemoryRouter initialEntries={['/repos/1']}>
        <Routes>
          <Route path="/repos/:id" element={<OverviewPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByText('No history found', {}, { timeout: 3000 })
    ).toBeInTheDocument()
  })

  it('Overview: renders error state with retry button when next call fails', async () => {
    setDevMockOptions({ failNextCall: true })

    render(
      <MemoryRouter initialEntries={['/repos/1']}>
        <Routes>
          <Route path="/repos/:id" element={<OverviewPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByText(/We could not reach the server/i, {}, { timeout: 3000 })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('Impact: renders function search input and depth slider', async () => {
    render(
      <MemoryRouter initialEntries={['/repos/1/impact?symbol_id=3&depth=2']}>
        <Routes>
          <Route path="/repos/:id/impact" element={<ImpactPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByText(/Blast Radius & Impact Analysis/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/How far to look \(Depth\)/i)
    ).toBeInTheDocument()
    expect(
      await screen.findByText('create_order', {}, { timeout: 3000 })
    ).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('Hotspots: renders file table with column headers', async () => {
    render(
      <MemoryRouter initialEntries={['/repos/1/hotspots']}>
        <Routes>
          <Route path="/repos/:id/hotspots" element={<HotspotsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByText(/shop\/orders.py/i, {}, { timeout: 3000 })
    ).toBeInTheDocument()
  })

  it('Chat: sends a question and receives an answer with citations', async () => {
    render(
      <MemoryRouter initialEntries={['/repos/1/chat']}>
        <Routes>
          <Route path="/repos/:id/chat" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      screen.getByText(/Verifiable Codebase Assistant/i)
    ).toBeInTheDocument()

    const suggestionBtn = screen.getByRole('button', {
      name: 'Where is payment handled?',
    })
    fireEvent.click(suggestionBtn)

    await waitFor(
      () => {
        expect(
          screen.getByText(/Payments are handled by charge_card/i)
        ).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    expect(screen.getByText(/shop\/payment.py:8-29/i)).toBeInTheDocument()
  })

  it('Validation: renders precision/recall table across variants', async () => {
    render(
      <MemoryRouter initialEntries={['/repos/1/validation']}>
        <Routes>
          <Route path="/repos/:id/validation" element={<ValidationPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByText(/Validation & Empirical Proof/i)
    ).toBeInTheDocument()
    expect(
      await screen.findByText(
        /Combined \(Graph \+ History\)/i,
        {},
        { timeout: 3000 }
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Precision@5')).toBeInTheDocument()
    expect(screen.getByText('Recall@5')).toBeInTheDocument()
  })
})
