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
          backgroundColor: '#ffffff',
        }}
      >
        <header
          style={{
            borderBottom: '1px solid #e5e7eb',
            padding: '0 24px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: '15px',
                color: '#111827',
                letterSpacing: '-0.01em',
              }}
            >
              CausalFunnel
            </span>
            <nav style={{ display: 'flex', gap: '4px' }}>
              {[
                { to: '/sessions', label: 'Sessions' },
                { to: '/heatmap', label: 'Heatmap' },
              ].map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  style={({ isActive }) => ({
                    padding: '6px 12px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: isActive ? '#111827' : '#6b7280',
                    backgroundColor: isActive ? '#f3f4f6' : 'transparent',
                    transition: 'background-color 0.15s',
                  })}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <a
            href={`${DEMO_ORIGIN}/demo/home.html`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '13px',
              color: '#6b7280',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Demo Store
          </a>
        </header>

        <main
          style={{
            flex: 1,
            padding: '32px 24px',
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
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
                <div style={{ padding: '64px 16px', textAlign: 'center' }}>
                  <p
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#111827',
                    }}
                  >
                    Page not found
                  </p>
                  <NavLink
                    to="/sessions"
                    style={{
                      color: '#6b7280',
                      textDecoration: 'underline',
                      fontSize: '13px',
                    }}
                  >
                    Go to Sessions
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
