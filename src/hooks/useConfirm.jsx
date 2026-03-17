import { useState, useCallback } from "react";
import { ConfirmDialog } from "../components/ui/index.jsx";
import React from "react";

// UX-02 FIX: window.confirm → non-blocking custom dialog
export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setState({ message, resolve, ...options });
    });
  }, []);

  const handleClose = useCallback((result) => {
    if (state) {
      state.resolve(result);
      setState(null);
    }
  }, [state]);

  const dialog = state ? (
    <ConfirmDialog
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      danger={state.danger !== false}
      onConfirm={() => handleClose(true)}
      onCancel={() => handleClose(false)}
    />
  ) : null;

  return { confirm, dialog };
}
