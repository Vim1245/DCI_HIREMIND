import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string; message?: string }> = ({
  size = 'md',
  text,
  message,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size];

  const displayText = text || message;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-500">
      <div
        className={`${sizeClasses} border-teal-500 border-t-transparent rounded-full animate-spin`}
      />
      {displayText && <p className="mt-3 text-sm font-medium text-slate-400">{displayText}</p>}
    </div>
  );
};
