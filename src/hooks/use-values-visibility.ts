import { useState, useEffect } from 'react';

export function useValuesVisibility() {
  const [valuesHidden, setValuesHidden] = useState(() => {
    // Get initial state from localStorage or default to false
    const saved = localStorage.getItem('valuesHidden');
    return saved === 'true';
  });

  useEffect(() => {
    // Listen for changes from other tabs/components
    const handleVisibilityChange = (e: CustomEvent) => {
      setValuesHidden(e.detail);
    };

    // Listen for storage changes (in case another tab changes the setting)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'valuesHidden') {
        setValuesHidden(e.newValue === 'true');
      }
    };

    window.addEventListener('valuesVisibilityChanged', handleVisibilityChange as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('valuesVisibilityChanged', handleVisibilityChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleValuesVisibility = () => {
    const newValue = !valuesHidden;
    setValuesHidden(newValue);
    localStorage.setItem('valuesHidden', String(newValue));
    
    // Dispatch a custom event so other components can listen for changes
    window.dispatchEvent(new CustomEvent('valuesVisibilityChanged', { detail: newValue }));
  };

  return {
    valuesHidden,
    toggleValuesVisibility,
  };
}