
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-8 py-3.5 font-bold transition-all duration-300 text-sm flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-mPolyGreen text-white hover:bg-mPolyGreen/90 active:scale-95 shadow-lg shadow-mPolyGreen/20",
    secondary: "bg-mPolyYellow text-neutral-900 hover:bg-mPolyYellow/90 active:scale-95 shadow-lg shadow-mPolyYellow/20",
    danger: "bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-lg shadow-red-600/20",
    outline: "bg-transparent border-2 border-neutral-200 text-neutral-900 hover:border-mPolyGreen hover:text-mPolyGreen transition-colors active:scale-95"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
