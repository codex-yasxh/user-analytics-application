import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
} from 'react-router-dom';
import { SessionsView } from './views/SessionsView.js';
import { JourneyView } from './views/JourneyView.js';
import { HeatmapView } from './views/HeatmapView.js';
import { DEMO_ORIGIN } from './api.js';

function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fcfcfd',
        }}
      >
        {/* Navigation Bar */}
        <header
          style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            padding: '0.75rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: '1.125rem',
                color: '#111827',
                letterSpacing: '-0.02em',
              }}
            >
              CausalFunnel{' '}
              <span
                style={{
                  color: '#2563eb',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Analytics
              </span>
            </div>
            <nav style={{ display: 'flex', gap: '0.5rem' }}>
              <NavLink
                to="/sessions"
                style={({ isActive }) => ({
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1d4ed8' : '#4b5563',
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                })}
              >
                Sessions
              </NavLink>
              <NavLink
                to="/heatmap"
                style={({ isActive }) => ({
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1d4ed8' : '#4b5563',
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                })}
              >
                Heatmap
              </NavLink>
            </nav>
          </div>

          <div>
            <a
              href={`${DEMO_ORIGIN}/demo/home.html`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.875rem',
                color: '#2563eb',
                textDecoration: 'none',
                padding: '0.375rem 0.75rem',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                fontWeight: 500,
              }}
            >
              Open Demo Store &rarr;
            </a>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            padding: '2rem',
            maxWidth: '1440px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/sessions" replace />} />
            <Route path="/sessions" element={<SessionsView />} />
            <Route path="/sessions/:id" element={<JourneyView />} />
            <Route path="/heatmap" element={<HeatmapView />} />
            <Route
              path="*"
              element={
                <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    404 - Page Not Found
                  </h2>
                  <p style={{ color: '#6b7280' }}>
                    The requested dashboard page does not exist.
                  </p>
                  <NavLink
                    to="/sessions"
                    style={{ color: '#2563eb', textDecoration: 'none' }}
                  >
                    Return to Sessions
                  </NavLink>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
