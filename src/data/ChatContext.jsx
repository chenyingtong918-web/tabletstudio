import React, { createContext, useState } from 'react';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [sessions, setSessions] = useState([]);

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
    <ChatContext.Provider value={{ sessions, addSession, updateSession }}>
      {children}
    </ChatContext.Provider>
  );
};
