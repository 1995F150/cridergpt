import { useState, useEffect } from 'react';

const STORAGE_KEY = 'crider-gpt-selected-model';
const DEFAULT_MODEL = 'cridergpt-5.0';

// Migrate old model ids -> new CriderGPT lineup
const LEGACY_MAP: Record<string, string> = {
  'gpt-3.5-turbo': 'cridergpt-4.1',
  'gpt-4o-mini': 'cridergpt-5.0',
  'gpt-4o': 'cridergpt-5.0-pro',
};

export const useModelSelection = () => {
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const migrated = LEGACY_MAP[saved] || saved;
    if (migrated !== saved) {
      localStorage.setItem(STORAGE_KEY, migrated);
    }
    setSelectedModel(migrated);
  }, []);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem(STORAGE_KEY, modelId);
  };

  return {
    selectedModel,
    setSelectedModel: handleModelChange,
  };
};
