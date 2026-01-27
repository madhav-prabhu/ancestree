/**
 * Application routing configuration.
 *
 * Routes:
 * - / → Galaxy view (main family tree visualization)
 * - /timeline → Timeline view (horizontal chronological view)
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import { TimelinePage } from './pages/TimelinePage'

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/timeline" element={<TimelinePage />} />
      </Routes>
    </BrowserRouter>
  )
}
