
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, className = '' }) => {
  return (
    <div className={`bg-white border border-neutral-100 card-shadow p-6 ${className}`}>
      {title && (
        <h3 className="text-base font-bold mb-6 text-neutral-900 border-b border-neutral-50 pb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};
