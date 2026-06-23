import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose }) => {
  const [token, setToken] = useState('');

  useEffect(() => {
    if (isOpen) {
      const savedToken = localStorage.getItem('figma_pat') || '';
      setToken(savedToken);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('figma_pat', token.trim());
    onClose();
  };

  return (
    <>
      <div className="popover-backdrop" onClick={onClose}></div>
      <div className="settings-popover" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        
        <div className="modal-body">
          <div className="setting-group">
            <label htmlFor="figma-token">Figma Personal Access Token</label>
            <p className="setting-desc">Required to fetch design data from Figma links.</p>
            <input 
              id="figma-token"
              type="password" 
              placeholder="figd_xxxxxxxxxxxxxx" 
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="setting-input"
            />
          </div>
        </div>

        <footer className="modal-footer">
          <button className="settings-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="settings-save-btn" onClick={handleSave}>Save</button>
        </footer>
      </div>
    </>
  );
};

export default SettingsModal;
