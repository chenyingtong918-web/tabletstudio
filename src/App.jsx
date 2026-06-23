import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Lab from './pages/Lab';
import { ChatProvider } from './data/ChatContext';

function App() {
  return (
    <ChatProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/c/:id" element={<Home />} />
              <Route path="/lab" element={<Lab />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ChatProvider>
  );
}

export default App;
