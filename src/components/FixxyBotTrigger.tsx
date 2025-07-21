import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import FixxyBot from './FixxyBot';

const FixxyBotTrigger: React.FC = () => {
  const [isFixxyOpen, setIsFixxyOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsFixxyOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-40"
        size="icon"
      >
        <Bot className="w-6 h-6" />
      </Button>
      
      <FixxyBot 
        isOpen={isFixxyOpen} 
        onClose={() => setIsFixxyOpen(false)} 
      />
    </>
  );
};

export default FixxyBotTrigger;