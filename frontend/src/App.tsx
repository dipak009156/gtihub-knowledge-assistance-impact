import { useEffect, useState } from 'react'

type Status = 'loading' | 'ok' | 'error'

export default function App() {
  const [api, setApi] = useState<Status>('loading')
  const [db, setDb] = useState<Status>('loading')

  useEffect(() => {
    fetch('/api/health')
      .then((r) => setApi(r.ok ? 'ok' : 'error'))
      .catch(() => setApi('error'))
    fetch('/api/health/db')
      .then((r) => setDb(r.ok ? 'ok' : 'error'))
      .catch(() => setDb('error'))
  }, [])

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 32 }}>
      <h1>GitHub Knowledge Assistance</h1>
      <p>Backend: {api}</p>
      <p>Database: {db}</p>
    </main>
  )
}
