import toast from 'react-hot-toast';

/**
 * Show success toast notification
 */
export const showSuccess = (message) => {
  return toast.success(message, {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb',
      borderRadius: '10px',
      padding: '14px 16px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    iconTheme: {
      primary: '#28a745',
      secondary: '#fff',
    },
  });
};

/**
 * Show error toast notification
 */
export const showError = (message) => {
  return toast.error(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
      borderRadius: '10px',
      padding: '14px 16px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    iconTheme: {
      primary: '#dc3545',
      secondary: '#fff',
    },
  });
};

/**
 * Show loading toast notification
 */
export const showLoading = (message = 'Loading...') => {
  return toast.loading(message, {
    position: 'top-right',
    style: {
      background: '#fff3cd',
      color: '#856404',
      border: '1px solid #ffeaa7',
      borderRadius: '10px',
      padding: '14px 16px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
  });
};

/**
 * Show info toast notification
 */
export const showInfo = (message) => {
  return toast(message, {
    duration: 3000,
    position: 'top-right',
    icon: 'ℹ️',
    style: {
      background: '#d1ecf1',
      color: '#0c5460',
      border: '1px solid #bee5eb',
      borderRadius: '10px',
      padding: '14px 16px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
  });
};

/**
 * Dismiss a specific toast
 */
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAll = () => {
  toast.dismiss();
};

// Export default toast for custom usage
export default toast;
