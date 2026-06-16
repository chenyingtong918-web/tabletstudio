import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { Plus, Clock } from 'lucide-react';
import { ChatContext } from '../data/ChatContext';
import './Navigation.css';

const Navigation = () => {
  const { sessions } = useContext(ChatContext);

  const navItems = [
    { path: '/', label: 'New Chat', icon: <Plus size={16} /> },
  ];

  return (
    <nav className="side-nav">
      <div className="nav-brand">
        <span className="brand-name">Tablet Studio</span>
      </div>
      <div className="nav-links">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="recent-section">
        <div className="recent-header">
          <span>Recent</span>
        </div>
        <div className="recent-list">
          {sessions.map((session) => (
            <NavLink 
              key={session.id} 
              to={`/c/${session.id}`} 
              className={({ isActive }) => `recent-item ${isActive ? 'active' : ''}`}
            >
              <Clock size={16} className="recent-icon" />
              <span className="recent-text">{session.title}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
