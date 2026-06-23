import React, { createContext, useState } from 'react';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [sessions, setSessions] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [figmaData, setFigmaData] = useState(null);
  const [figmaImages, setFigmaImages] = useState(null);

  const addSession = (id, title, messages) => {
    setSessions((prev) => [
      { id, title, messages },
      ...prev
    ]);
  };

  const updateSession = (id, newMessagesOrCallback) => {
    setSessions((prev) => 
      prev.map(session => {
        if (session.id === id) {
          const updatedMessages = typeof newMessagesOrCallback === 'function' 
            ? newMessagesOrCallback(session.messages) 
            : newMessagesOrCallback;
          return { ...session, messages: updatedMessages };
        }
        return session;
      })
    );
  };

  return (
    <ChatContext.Provider value={{ 
        sessions, 
        addSession, 
        updateSession, 
        isTyping,
        setIsTyping,
        figmaData,
        setFigmaData,
        figmaImages,
        setFigmaImages
      }}>
      {children}
    </ChatContext.Provider>
  );
};
