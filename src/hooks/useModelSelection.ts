
import { useState, useEffect } from 'react';

export const useModelSelection = () => {
  const [selectedModel, setSelectedModel] = useState<string>('gpt-3.5-turbo');

  // Load saved model preference from localStorage
  useEffect(() => {
    const savedModel = localStorage.getItem('crider-gpt-selected-model');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  // Save model preference to localStorage
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('crider-gpt-selected-model', modelId);
  };

  return {
    selectedModel,
    setSelectedModel: handleModelChange
  };
};
