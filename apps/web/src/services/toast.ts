type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: ToastListener[] = [];

  subscribe(listener: ToastListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  show(title: string, message?: string, type: ToastType = 'info') {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const item: ToastItem = { id, title, message, type };
    this.toasts.push(item);
    this.notify();

    setTimeout(() => {
      this.remove(id);
    }, 3500);
  }

  success(title: string, message?: string) {
    this.show(title, message, 'success');
  }

  error(title: string, message?: string) {
    this.show(title, message, 'error');
  }

  info(title: string, message?: string) {
    this.show(title, message, 'info');
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }
}

export const toast = new ToastManager();
export const toastSuccess = (title: string, message?: string) => toast.success(title, message);
export const toastError = (title: string, message?: string) => toast.error(title, message);
export const toastInfo = (title: string, message?: string) => toast.info(title, message);
