import React, { useContext } from 'react';
import GeneratorCanvas from '../components/GeneratorCanvas';
import { ChatContext } from '../data/ChatContext';
import './Lab.css';

const Lab = () => {
  return (
    <div className="lab-container">
      <GeneratorCanvas />
    </div>
  );
};

export default Lab;
