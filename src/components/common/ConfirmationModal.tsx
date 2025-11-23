import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'success' | 'danger' | 'warning';
  icon?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger',
  icon,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    success: {
      border: 'border-green-500/30',
      shadow: 'shadow-green-500/20',
      gradient: 'from-green-400 to-emerald-500',
      button: 'from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800',
      buttonShadow: 'hover:shadow-green-500/50',
    },
    danger: {
      border: 'border-red-500/30',
      shadow: 'shadow-red-500/20',
      gradient: 'from-red-400 to-red-500',
      button: 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
      buttonShadow: 'hover:shadow-red-500/50',
    },
    warning: {
      border: 'border-amber-500/30',
      shadow: 'shadow-amber-500/20',
      gradient: 'from-amber-400 to-yellow-500',
      button: 'from-amber-600 to-yellow-700 hover:from-amber-700 hover:to-yellow-800',
      buttonShadow: 'hover:shadow-amber-500/50',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className={`bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full border-2 ${styles.border} shadow-2xl ${styles.shadow} animate-[fadeInUp_0.3s_ease-out]`}>
        {icon && (
          <div className="flex justify-center mb-6">
            {icon}
          </div>
        )}

        <h3 className={`text-2xl font-bold text-center mb-3 bg-gradient-to-r ${styles.gradient} bg-clip-text text-transparent`}>
          {title}
        </h3>
        <p className="text-gray-300 text-center mb-8 leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 bg-gradient-to-r ${styles.button} text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl ${styles.buttonShadow} hover:-translate-y-0.5`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
