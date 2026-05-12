'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface SignaturePadProps {
  label: string;
  value: string | undefined;
  onChange: (dataUrl: string) => void;
  nameValue?: string;
}

export default function SignaturePad({ label, value, onChange, nameValue }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Resize canvas to match container
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * 2; // 2x for retina
      canvas.height = 200 * 2;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Restore existing signature
  useEffect(() => {
    if (value && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx.drawImage(img, 0, 0);
        setHasDrawn(true);
      };
      img.src = value;
    }
  }, [value]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // On first stroke, paint an opaque dark background so the exported
    // PNG carries its own contrast layer — cream strokes remain visible
    // when the dataURL is rendered on light surfaces (e.g., PDF/print).
    if (!hasDrawn) {
      ctx.fillStyle = '#131316'; // --color-bg-3
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    // Cream literal (matches --color-text) — Canvas 2D API requires a literal hex
    ctx.strokeStyle = '#ece5d3';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = () => {
    setIsDrawing(false);
    if (hasDrawn && canvasRef.current) {
      onChange(canvasRef.current.toDataURL());
    }
  };

  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawn(false);
    onChange('');
  };

  const autoSign = useCallback(() => {
    if (!nameValue || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    // Paint opaque dark background so exported PNG carries its own contrast
    // (cream stroke + dark fill survives rendering on light surfaces).
    ctx.fillStyle = '#131316'; // --color-bg-3
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    const scale = canvasRef.current.width / canvasRef.current.getBoundingClientRect().width;
    ctx.font = `italic ${28 * scale}px Georgia, serif`;
    // Cream literal (matches --color-text) — Canvas 2D API requires a literal hex
    ctx.fillStyle = '#ece5d3';
    ctx.textAlign = 'center';
    ctx.fillText(nameValue, canvasRef.current.width / 2, canvasRef.current.height / 2 + 10);
    setHasDrawn(true);
    onChange(canvasRef.current.toDataURL());
  }, [nameValue, onChange]);

  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-medium text-text">{label}</label>
      <div ref={containerRef} className="border border-line rounded-lg overflow-hidden bg-bg-3">
        <canvas
          ref={canvasRef}
          className="w-full h-[150px] sm:h-[120px] cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clear}
          aria-label="Clear signature"
          className="px-3 py-2 sm:py-1 text-[13px] text-text-dim hover:text-danger border border-line rounded transition-colors min-h-[44px] sm:min-h-0"
        >
          Clear
        </button>
        {nameValue && (
          <button
            type="button"
            onClick={autoSign}
            aria-label="Auto-sign from name"
            className="px-3 py-2 sm:py-1 text-[13px] text-text hover:text-gold-brand border border-line rounded transition-colors min-h-[44px] sm:min-h-0"
          >
            Auto-sign from name
          </button>
        )}
      </div>
    </div>
  );
}
