
import React from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-mPolyBlue/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="bg-white max-w-sm w-full card-shadow relative z-10 p-8 space-y-6 animate-slide-left border-t-8 border-mPolyBlue">
        <div className="space-y-2">
          <h3 className="text-xl font-black uppercase tracking-tighter text-neutral-900">{title}</h3>
          <p className="text-[11px] font-bold text-neutral-400 uppercase leading-relaxed tracking-wider">{message}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose} className="py-3">
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : 'primary'} 
            fullWidth 
            onClick={() => { onConfirm(); onClose(); }}
            className="py-3"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
