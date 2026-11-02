import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export function ToastContainer() {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'info';
        const isConflict = toast.type === 'conflict';

        return (
          <div
            key={toast.id}
            className={`toast ${isConflict ? 'toast-conflict' : isSuccess ? 'toast-success' : 'toast-info'}`}
          >
            {isConflict ? (
              <AlertTriangle size={17} color="var(--accent-rose)" />
            ) : isSuccess ? (
              <CheckCircle2 size={17} color="var(--accent-emerald)" />
            ) : (
              <Info size={17} color="var(--accent-primary)" />
            )}
            <span style={{ fontWeight: 500 }}>{toast.message}</span>
            {toast.action && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={toast.action.onClick}
                style={{ marginLeft: '8px' }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
