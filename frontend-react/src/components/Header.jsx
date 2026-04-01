const navItems = [
  { id: 'dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
  { id: 'alerts', icon: 'fas fa-exclamation-triangle', label: 'Alerts' },
  { id: 'resources', icon: 'fas fa-truck', label: 'Resources' },
  { id: 'reports', icon: 'fas fa-bell', label: 'Emergency Help' },
];

export default function Header({ activeSection, onNavigate }) {
  return (
    <header className="header">
      <div className="container">
        <div className="logo">
          <i className="fas fa-shield-alt"></i>
          <h1>
            Disaster Management
            <span
              style={{
                fontSize: '0.7rem',
                background: '#f1c40f',
                color: '#000',
                padding: '2px 6px',
                borderRadius: '4px',
                verticalAlign: 'middle',
                marginLeft: '5px',
              }}
            >
              AI POWERED
            </span>
          </h1>
        </div>

        <nav className="nav">
          <ul className="nav-menu">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`nav-link nav-button ${
                    activeSection === item.id ? 'active' : ''
                  }`}
                  onClick={() => onNavigate(item.id)}
                >
                  <i className={item.icon}></i> {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
