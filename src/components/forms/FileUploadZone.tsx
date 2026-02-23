'use client';

import { useCallback, useState, useRef } from 'react';

interface FileUploadZoneProps {
  label: string;
  accept?: string;
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  status?: string;
  className?: string;
}

export default function FileUploadZone({
  label,
  accept = '.csv,.xlsx,.xls,.pdf,.txt,.png,.jpg,.jpeg',
  onFileSelect,
  isProcessing,
  status,
  className = '',
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleClick = () => fileInputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-navy mb-2">{label}</label>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-gold bg-gold/5'
            : 'border-border hover:border-gold/50 hover:bg-surface-alt'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        {isProcessing ? (
          <div className="space-y-3">
            <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gold font-semibold">{status || 'Processing...'}</p>
            <p className="text-xs text-muted">This may take a moment</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
              <span className="text-xl text-gold">&#8593;</span>
            </div>
            <p className="text-sm text-foreground">
              Drop file here or <span className="text-gold font-semibold cursor-pointer hover:underline">browse</span>
            </p>
            <p className="text-xs text-muted">CSV, PDF, TXT, or image files</p>
          </div>
        )}
      </div>
    </div>
  );
}
