import * as Burnt from 'burnt';

export type ToastPreset = 'done' | 'error' | 'none';
export type AlertPreset = 'done' | 'error' | 'heart' | 'none';

export interface AppToastOptions {
  title: string;
  message?: string;
  preset?: ToastPreset;
  duration?: number;
  haptic?: 'success' | 'warning' | 'error' | 'none';
  shouldDismissByDrag?: boolean;
  from?: 'top' | 'bottom';
}

export interface AppAlertOptions {
  title: string;
  message?: string;
  preset?: AlertPreset;
  duration?: number;
  shouldDismissByTap?: boolean;
}

export const toast = (options: AppToastOptions) => {
  try {
    const preset = options.preset ?? 'done';
    return Burnt.toast({
      title: options.title,
      message: options.message,
      preset,
      duration: options.duration ?? 2.5,
      haptic: options.haptic ?? (preset === 'error' ? 'error' : 'success'),
      shouldDismissByDrag: options.shouldDismissByDrag ?? true,
      from: options.from ?? 'top',
    });
  } catch (e) {
    console.warn('[Burnt] toast error:', e);
  }
};

export const alert = (options: AppAlertOptions) => {
  try {
    const preset = options.preset ?? 'done';
    return Burnt.alert({
      title: options.title,
      message: options.message,
      preset,
      duration: options.duration ?? 2.5,
      shouldDismissByTap: options.shouldDismissByTap ?? true,
    });
  } catch (e) {
    console.warn('[Burnt] alert error:', e);
  }
};

export const toastSuccess = (title: string, message?: string, duration = 2.5) => {
  return toast({
    title,
    message,
    preset: 'done',
    haptic: 'success',
    duration,
  });
};

export const toastError = (title: string, message?: string, duration = 3.5) => {
  return toast({
    title,
    message,
    preset: 'error',
    haptic: 'error',
    duration,
  });
};

export const toastInfo = (title: string, message?: string, duration = 2.5) => {
  return toast({
    title,
    message,
    preset: 'none',
    duration,
  });
};

export const alertSuccess = (title: string, message?: string, duration = 2.5) => {
  return alert({
    title,
    message,
    preset: 'done',
    duration,
  });
};

export const alertError = (title: string, message?: string, duration = 3) => {
  return alert({
    title,
    message,
    preset: 'error',
    duration,
  });
};

export const dismissAllAlerts = () => {
  try {
    Burnt.dismissAllAlerts();
  } catch (e) {
    console.warn('[Burnt] dismissAllAlerts error:', e);
  }
};

export { Burnt };
