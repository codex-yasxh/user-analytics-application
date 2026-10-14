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

const NAV_ITEMS = [
  {
    to: '/sessions',
    label: 'Sessions',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="12" height="10" rx="1.5" />
        <path d="M2 6h12" />
        <path d="M5 6v7" />
      </svg>
    ),
  },
  {
    to: '/heatmap',
    label: 'Heatmap',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="8" cy="8" r="6" />
        <circle cx="8" cy="8" r="3" />
        <circle cx="8" cy="8" r="1" />
      </svg>
    ),
  },
];

function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            width: '200px',
            flexShrink: 0,
            borderRight: '1px solid #f3f4f6',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 0',
          }}
        >
          <div
            style={{
              padding: '0 20px',
              marginBottom: '32px',
            }}
          >
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
          </div>

          <nav
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              padding: '0 8px',
              flex: 1,
            }}
          >
            {NAV_ITEMS.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isActive ? '#111827' : '#6b7280',
                  backgroundColor: isActive ? '#f3f4f6' : 'transparent',
                  transition: 'background-color 0.15s',
                })}
              >
                {icon}
                {label}
              </NavLink>
            ))}
          </nav>

          <div style={{ padding: '0 20px' }}>
            <a
              href={`${DEMO_ORIGIN}/demo/home.html`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '12px',
                color: '#9ca3af',
                textDecoration: 'none',
              }}
            >
              Open Demo Store &rarr;
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: '32px 40px',
            maxWidth: '1200px',
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
