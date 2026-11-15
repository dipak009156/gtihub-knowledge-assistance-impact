import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/Auth/LoginPage'
import { RegisterPage } from './pages/Auth/RegisterPage'
import { ChatPage } from './pages/Chat/ChatPage'
import { CodePage } from './pages/Code/CodePage'
import { GraphPage } from './pages/Graph/GraphPage'
import { HomePage } from './pages/Home/HomePage'
import { HotspotsPage } from './pages/Hotspots/HotspotsPage'
import { ImpactPage } from './pages/Impact/ImpactPage'
import { PrivacyPage } from './pages/Legal/PrivacyPage'
import { TermsPage } from './pages/Legal/TermsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OverviewPage } from './pages/Overview/OverviewPage'
import { ProgressPage } from './pages/Progress/ProgressPage'
import { SettingsPage } from './pages/Settings/SettingsPage'
import { ValidationPage } from './pages/Validation/ValidationPage'
import { ThemeProvider } from './theme/ThemeContext'
import './theme/theme.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              {/* Landing & Public Marketing */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />

              {/* Standalone settings fallback */}
              <Route path="/settings" element={<SettingsPage />} />

              {/* Ingestion Progress route */}
              <Route path="/repos/:id/progress" element={<ProgressPage />} />

              {/* Main Project Layout with left sidebar */}
              <Route path="/repos/:id" element={<Layout />}>
                <Route index element={<OverviewPage />} />
                <Route path="code" element={<CodePage />} />
                <Route path="graph" element={<GraphPage />} />
                <Route path="impact" element={<ImpactPage />} />
                <Route path="hotspots" element={<HotspotsPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="validation" element={<ValidationPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* 404 Route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
