/**
 * Application routing configuration with dual-mode support.
 *
 * Automatically selects router type based on environment:
 * - Electron: HashRouter (works with file:// protocol)
 * - Web: BrowserRouter (cleaner URLs, server-side routing)
 *
 * Routes:
 * - / → Galaxy view (main family tree visualization)
 * - /timeline → Timeline view (horizontal chronological view)
 */

import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import { TimelinePage } from './pages/TimelinePage'
import { isElectron } from './utils/platform'

/**
 * Shared route definitions used by both router types.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/timeline" element={<TimelinePage />} />
    </Routes>
  )
}

/**
 * Dual-mode router component.
 *
 * Uses HashRouter for Electron (required for file:// protocol in production builds)
 * and BrowserRouter for web (cleaner URLs and better server-side routing).
 */
export function Router() {
  if (isElectron()) {
    return (
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    )
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
