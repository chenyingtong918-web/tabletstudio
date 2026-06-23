import { useContext, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Plus, Clock, PanelLeftClose, PanelLeftOpen, Settings, LayoutDashboard } from 'lucide-react';
import { ChatContext } from '../data/ChatContext';
import SettingsModal from './SettingsModal';
import './Navigation.css';

const Navigation = () => {
  const { sessions } = useContext(ChatContext);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsCollapsed(location.pathname === '/lab');
  }, [location.pathname]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  const navItems = [
    { path: '/', label: 'New Chat', icon: <Plus size={16} /> },
    { path: '/lab', label: 'Generator', icon: <LayoutDashboard size={16} /> },
  ];

  return (
    <nav className={`side-nav ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="nav-brand">
        {!isCollapsed && <span className="brand-name">Tablet Studio</span>}
        <button 
          onClick={toggleCollapse} 
          className="collapse-toggle-btn"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={20} strokeWidth={1.75} /> : <PanelLeftClose size={20} strokeWidth={1.75} />}
        </button>
      </div>
      <div className="nav-links">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={item.label}
          >
            {item.icon}
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </div>

      <div className="recent-section">
        {!isCollapsed && (
          <div className="recent-header">
            <span>Recent</span>
          </div>
        )}
        <div className="recent-list">
          {sessions.map((session) => (
            <NavLink 
              key={session.id} 
              to={`/c/${session.id}`} 
              className={({ isActive }) => `recent-item ${isActive ? 'active' : ''}`}
              title={session.title}
            >
              <Clock size={16} className="recent-icon" />
              {!isCollapsed && <span className="recent-text">{session.title}</span>}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="nav-footer">
        <button 
          className={`nav-item settings-btn ${isCollapsed ? 'collapsed' : ''}`}
          onClick={() => setIsSettingsOpen(true)}
          title="Settings"
        >
          <Settings size={16} />
          {!isCollapsed && <span>Settings</span>}
        </button>

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </div>
    </nav>
  );
};

export default Navigation;
