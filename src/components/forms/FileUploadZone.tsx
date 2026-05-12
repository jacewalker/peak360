'use client';

import { useCallback, useState, useRef, Fragment } from 'react';

export type ProcessingStage = 'uploading' | 'reading' | 'interpreting' | 'done' | 'error' | 'warning' | null;

interface FileUploadZoneProps {
  label: string;
  accept?: string;
  onFileSelect: (file: File) => void;
  processingStage?: ProcessingStage;
  doneMessage?: string;
  errorMessage?: string;
  warningMessage?: string;
  className?: string;
}

const STEPS = [
  { key: 'uploading', label: 'Upload' },
  { key: 'reading', label: 'AI Scan' },
  { key: 'interpreting', label: 'AI Extract' },
  { key: 'done', label: 'Complete' },
] as const;

const STAGE_CONTENT: Record<string, { title: string; subtitle: string }> = {
  uploading: { title: 'Uploading file...', subtitle: 'Sending your document to the server' },
  reading: { title: 'AI is reading your document', subtitle: 'Scanning and identifying data...' },
  interpreting: { title: 'AI is extracting values', subtitle: 'Mapping data to form fields...' },
  done: { title: 'Extraction complete!', subtitle: '' },
  error: { title: 'Extraction failed', subtitle: 'Please try again or enter values manually' },
  warning: { title: 'Heads up', subtitle: 'There may be an issue with this document' },
};

function ProcessingStepper({ stage, doneMessage, errorMessage, warningMessage }: {
  stage: Exclude<ProcessingStage, null>;
  doneMessage?: string;
  errorMessage?: string;
  warningMessage?: string;
}) {
  const isDone = stage === 'done';
  const isError = stage === 'error';
  const isWarning = stage === 'warning';
  const stageIndex = STEPS.findIndex(s => s.key === stage);
  const content = STAGE_CONTENT[stage];

  return (
    <div className="py-2 space-y-5">
      {/* Step indicator */}
      {!isError && !isWarning && (
        <div className="flex items-center max-w-[300px] mx-auto">
          {STEPS.map((step, i) => {
            const isCompleted = isDone || stageIndex > i;
            const isActive = !isDone && step.key === stage;
            const isPending = !isDone && stageIndex < i;

            return (
              <Fragment key={step.key}>
                {/* Step circle + label */}
                <div className="flex flex-col items-center relative">
                  <div
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium
                      transition-all duration-500
                      ${isCompleted ? 'bg-status-good text-bg' : ''}
                      ${isActive ? 'bg-gold-brand text-bg shadow-[0_0_0_4px_rgba(201,162,74,0.15)]' : ''}
                      ${isPending ? 'bg-bg-2 text-text-faint border border-line' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`
                      text-[11px] font-medium mt-1.5 whitespace-nowrap absolute -bottom-4.5
                      transition-colors duration-300
                      ${isCompleted ? 'text-status-good' : ''}
                      ${isActive ? 'text-gold-brand font-medium' : ''}
                      ${isPending ? 'text-text-faint' : ''}
                    `}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connecting line */}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-1.5 mb-4">
                    <div
                      className={`
                        h-[2px] rounded-full transition-all duration-700
                        ${(isDone || stageIndex > i) ? 'bg-status-good' : ''}
                        ${(!isDone && stageIndex === i) ? 'bg-gradient-to-r from-gold-brand to-line' : ''}
                        ${(!isDone && stageIndex < i) ? 'bg-line' : ''}
                      `}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Large center icon */}
      <div className="flex justify-center pt-2">
        {stage === 'uploading' && (
          <div className="w-14 h-14 rounded-2xl bg-bg-2 flex items-center justify-center animate-pulse">
            <svg className="w-7 h-7 text-text" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
        )}

        {stage === 'reading' && (
          <div className="relative inline-flex">
            <div className="w-14 h-14 rounded-2xl bg-gold-brand/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-gold-brand animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="absolute -top-1.5 -right-2.5 bg-gold-brand text-bg text-[11px] font-medium px-1.5 py-0.5 rounded-full tracking-wider shadow-sm font-mono">
              AI
            </span>
          </div>
        )}

        {stage === 'interpreting' && (
          <div className="relative inline-flex">
            <div className="w-14 h-14 rounded-2xl bg-gold-brand/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-gold-brand animate-[spin_3s_linear_infinite]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <span className="absolute -top-1.5 -right-2.5 bg-gold-brand text-bg text-[11px] font-medium px-1.5 py-0.5 rounded-full tracking-wider shadow-sm font-mono">
              AI
            </span>
          </div>
        )}

        {stage === 'done' && (
          <div className="w-14 h-14 rounded-2xl bg-status-good/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-status-good" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        {stage === 'warning' && (
          <div className="w-14 h-14 rounded-2xl bg-gold-brand/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gold-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        )}

        {stage === 'error' && (
          <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Description text */}
      <div className="text-center">
        <p className={`text-[13px] font-medium ${isWarning ? 'text-gold-brand' : isError ? 'text-danger' : isDone ? 'text-status-good' : 'text-text'}`}>
          {content.title}
        </p>
        <p className="text-[13px] text-text-dim mt-0.5">
          {isDone
            ? (doneMessage || content.subtitle)
            : isWarning
              ? (warningMessage || content.subtitle)
              : isError
                ? (errorMessage || content.subtitle)
                : content.subtitle
          }
        </p>
      </div>
    </div>
  );
}

export default function FileUploadZone({
  label,
  accept = '.csv,.xlsx,.xls,.pdf,.txt,.png,.jpg,.jpeg,.heic,.heif,.tiff,.tif,.bmp,.webp,.avif,.svg',
  onFileSelect,
  processingStage,
  doneMessage,
  errorMessage,
  warningMessage,
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

  const handleClick = () => {
    if (!processingStage || processingStage === 'warning') fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className={className}>
      <label className="block text-[13px] font-medium text-text mb-2">{label}</label>
      <div
        onClick={handleClick}
        onDragOver={!processingStage ? handleDragOver : undefined}
        onDragLeave={!processingStage ? handleDragLeave : undefined}
        onDrop={!processingStage ? handleDrop : undefined}
        className={`
          rounded-lg p-4 sm:p-6 text-center transition-all duration-300
          ${processingStage
            ? processingStage === 'done'
              ? 'border-2 border-status-good/40 bg-status-good/[0.06]'
              : processingStage === 'warning'
                ? 'border-2 border-gold-brand/40 bg-gold-brand/[0.06]'
                : processingStage === 'error'
                  ? 'border-2 border-danger/40 bg-danger/[0.06]'
                  : 'border-2 border-gold-brand/30 bg-gold-brand/[0.03]'
            : `border-2 border-dashed cursor-pointer ${
                isDragging
                  ? 'border-gold-brand bg-gold-brand/[0.06]'
                  : 'border-line hover:border-gold-brand/50 hover:bg-bg-2'
              }`
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="absolute w-0 h-0 opacity-0 overflow-hidden"
        />
        {processingStage ? (
          <ProcessingStepper stage={processingStage} doneMessage={doneMessage} errorMessage={errorMessage} warningMessage={warningMessage} />
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-full bg-gold-brand/10 flex items-center justify-center mx-auto">
              <span className="text-[20px] text-gold-brand">&#8593;</span>
            </div>
            <p className="text-[13px] text-text">
              Drop file here or <span className="text-gold-brand font-medium cursor-pointer hover:underline">browse</span>
            </p>
            <p className="text-[13px] text-text-dim">CSV, PDF, TXT, or image files</p>
          </div>
        )}
      </div>
    </div>
  );
}
