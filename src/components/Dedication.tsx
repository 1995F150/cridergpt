
import React, { useState } from 'react';

export function Dedication() {
  const [showMessage, setShowMessage] = useState(false);

  const toggleMessage = () => {
    setShowMessage(!showMessage);
  };

  return (
    <div className="min-h-screen bg-pink-50 flex justify-center items-center p-4">
      <div 
        className="text-center cursor-pointer p-6 rounded-xl bg-pink-100 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl max-w-md mx-auto"
        onClick={toggleMessage}
      >
        <div className="text-2xl font-semibold text-pink-800 mb-2">
          💖 Carli — August 14th, 2025
        </div>
        
        {showMessage && (
          <div className="mt-4 text-xl text-pink-700 transition-opacity duration-300 opacity-100">
            "I love you. You're the one. Always."
          </div>
        )}
      </div>
    </div>
  );
}
