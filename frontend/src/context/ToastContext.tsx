import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  show: (title: string, message?: string, type?: ToastType, duration?: number) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (title: string, message?: string, type: ToastType = 'info', duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, message, type, duration }]);
      setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const success = useCallback((title: string, message?: string, duration?: number) => show(title, message, 'success', duration), [show]);
  const error = useCallback((title: string, message?: string, duration?: number) => show(title, message, 'error', duration), [show]);
  const info = useCallback((title: string, message?: string, duration?: number) => show(title, message, 'info', duration), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, info }}>
      {children}
      
      {/* Toast Portal/Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { title, message, type, duration = 4000 } = toast;

  // Icon mapping
  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const barColor = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-rose-500' : 'bg-blue-500';

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden pointer-events-auto flex flex-col relative w-full translate-x-0 transition-transform duration-300 animate-slide-in"
      style={{
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)'
      }}
    >
      <div className="p-4 flex gap-3 items-start">
        {renderIcon()}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 leading-tight">{title}</h4>
          {message && <p className="text-xs text-gray-500 mt-1 leading-normal">{message}</p>}
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xs font-bold leading-none p-0.5"
        >
          &times;
        </button>
      </div>

      {/* Draining Time Progress Bar */}
      <div className="w-full bg-gray-100 h-1 absolute bottom-0 left-0">
        <div 
          className={`h-full ${barColor}`}
          style={{
            animation: `shrink ${duration}ms linear forwards`
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes slideIn {
          from { transform: translateX(110%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
