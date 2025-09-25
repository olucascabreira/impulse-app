import React, { useState } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  description?: string;
}

export function ColorPicker({ value, onChange, label, description }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState(value);

  const handleConfirm = () => {
    onChange(tempColor);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempColor(value);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      
      <div className="flex items-center gap-3">
        <div 
          className="w-8 h-8 rounded border cursor-pointer"
          style={{ backgroundColor: value }}
          onClick={() => setIsOpen(true)}
        />
        <span className="text-sm font-mono">{value.toUpperCase()}</span>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50"
            onClick={handleCancel}
          />
          <div className="relative bg-background border rounded-lg p-6 z-50 w-80">
            <h4 className="font-medium mb-4">Escolher Cor</h4>
            
            <div className="mb-4">
              <div 
                className="w-full h-12 rounded border mb-2"
                style={{ backgroundColor: tempColor }}
              />
              <input
                type="text"
                value={tempColor}
                onChange={(e) => setTempColor(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            
            <input
              type="color"
              value={tempColor}
              onChange={(e) => setTempColor(e.target.value)}
              className="w-full h-10 cursor-pointer"
            />
            
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-md border bg-background text-sm hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}