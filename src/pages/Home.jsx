import React, { useState, useRef, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatContext } from '../data/ChatContext';
import { Search, PenTool, Code, Paperclip, ArrowUp, Bot, User, Plus, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiService } from '../services/api';
import './Home.css';

const Home = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sessions, addSession, updateSession } = useContext(ChatContext);
  
  const activeSession = id ? sessions.find(s => s.id === id) : null;
  const messages = activeSession ? activeSession.messages : [];

  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setQuery('');
    setSelectedImages([]);
  }, [id]);

  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImages(prev => [...prev, {
        url: e.target.result,
        name: file.name
      }]);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (indexToRemove) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const onFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(handleFileSelect);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        const file = item.getAsFile();
        if (file) handleFileSelect(file);
        break;
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    files.forEach(handleFileSelect);
  };

  const features = [
    {
      title: 'Spec Assistant',
      description: 'Query adaptation rules or upload your design to validate against tablet specs.',
      icon: <Search size={20} />,
    },
    {
      title: 'Design Generator',
      description: 'Automatically generate multi-breakpoint layouts from a single design.',
      icon: <PenTool size={20} />,
    },
    {
      title: 'Code Generator',
      description: 'Generate responsive layout code (XML/Compose) for developers.',
      icon: <Code size={20} />,
    },
  ];

  // Auto scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleQuery = async () => {
    if (!query.trim() && selectedImages.length === 0) return;
    
    let finalContent = query.trim() || '请分析以下图片';
    if (selectedImages.length > 0) {
      finalContent = [
        { type: 'text', text: query.trim() || '请分析以下图片' },
        ...selectedImages.map(img => ({
          type: 'image_url',
          image_url: { url: img.url }
        }))
      ];
    }
    
    const newMessages = [...messages, { role: 'user', content: finalContent }];
    
    let currentId = id;
    if (!currentId) {
      currentId = Date.now().toString();
      const title = query.trim().slice(0, 20) || 'Image Review';
      addSession(currentId, title, newMessages);
      // Optional: Add a slight delay so context updates before navigation if needed, 
      // but React router handles sync well.
      navigate(`/c/${currentId}`);
    } else {
      updateSession(currentId, newMessages);
    }
    
    setQuery('');
    setSelectedImages([]);
    setIsTyping(true);

    // Create placeholder for AI response
    updateSession(currentId, prev => [...prev, { role: 'system', content: '' }]);

    await aiService.streamMessage(newMessages, (fullText) => {
      updateSession(currentId, prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = fullText;
        return updated;
      });
    });
    
    setIsTyping(false);
  };

  return (
    <div className="home-container">
      {messages.length === 0 ? (
        <div className="home-content">
          <header className="home-header">
            <h1 className="title">Welcome to Tablet Studio</h1>
            <p className="subtitle">
              Your personal AI assistant for multi-breakpoint tablet design adaptation
            </p>
          </header>

          <section className="features-grid">
            {features.map((feature) => (
              <div key={feature.title} className="card feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.description}</p>
              </div>
            ))}
          </section>
        </div>
      ) : (
        <div className="chat-history">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper ${msg.role}`}>
              <div className={`message-content ${msg.role}`}>
                {msg.content === '' && msg.role === 'system' && isTyping ? (
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                ) : (
                  <>
                    {Array.isArray(msg.content) && msg.content.some(c => c.type === 'image_url') && (
                      <div className="chat-message-images">
                        {msg.content.filter(c => c.type === 'image_url').map((img, i) => (
                          <img key={i} src={img.image_url.url} alt="attached" className="chat-message-image" />
                        ))}
                      </div>
                    )}
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                      }}
                    >
                      {Array.isArray(msg.content) 
                        ? (msg.content.find(c => c.type === 'text')?.text || '')
                        : msg.content}
                    </ReactMarkdown>
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      <div className="home-chat-wrapper">
         <div 
           className="home-chat-input-container"
           onDragOver={handleDragOver}
           onDrop={handleDrop}
         >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*"
              multiple
              onChange={onFileChange} 
            />
            {selectedImages.length > 0 && (
              <div className="image-preview-container">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="image-preview-wrapper">
                    <img src={img.url} alt="preview" className="image-preview-thumbnail" />
                    <button className="image-preview-close" onClick={() => removeImage(idx)}>
                      <X size={14} strokeWidth={3} />
                    </button>
                    <div className="image-tooltip">{img.name}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="home-chat-input-wrapper">
              <input 
                type="text" 
                placeholder="Initiate a query or ask Tablet Studio..." 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    handleQuery();
                  }
                }}
                onPaste={handlePaste}
                className="home-chat-input"
              />
            </div>
            <div className="home-chat-actions">
               <div className="chat-actions-left">
                 <button className="chat-attach-btn" onClick={() => fileInputRef.current?.click()} title="Upload Image">
                   <Plus size={24} />
                 </button>
               </div>
               <button className="chat-send-btn" onClick={handleQuery} disabled={!query.trim() && selectedImages.length === 0}>
                 <ArrowUp size={18} strokeWidth={2.5} />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Home;
