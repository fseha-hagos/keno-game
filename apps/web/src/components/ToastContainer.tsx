import React, { useEffect, useState } from 'react';
import { toast, ToastItem } from '../services/toast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${
            t.type === 'success'
              ? 'toast-success'
              : t.type === 'error'
              ? 'toast-error'
              : ''
          }`}
        >
          {t.type === 'success' && <CheckCircle2 size={16} />}
          {t.type === 'error' && <AlertCircle size={16} />}
          {t.type === 'info' && <Info size={16} />}
          <div>
            <div style={{ fontWeight: 800 }}>{t.title}</div>
            {t.message && (
              <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
                {t.message}
              </div>
            )}
          </div>
          <button
            onClick={() => toast.remove(t.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              marginLeft: '8px',
              padding: '2px',
              opacity: 0.7,
              display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
