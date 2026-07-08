"use client";

import { useCallback, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: "red" | "yellow" | "green";
}

/**
 * Drop-in replacement for the browser's `confirm()` that renders the app's
 * styled ConfirmDialog instead. Usage:
 *
 *   const { confirm, dialog } = useConfirm();
 *   if (!(await confirm({ title: "Delete this item?", message: "..." }))) return;
 *   // render {dialog} once, anywhere in the component's JSX
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setLoading(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleCancel = () => {
    resolver.current?.(false);
    resolver.current = null;
    setOptions(null);
  };

  const handleConfirm = () => {
    resolver.current?.(true);
    resolver.current = null;
    setOptions(null);
  };

  const dialog = options ? (
    <ConfirmDialog
      title={options.title}
      message={options.message}
      confirmText={options.confirmText ?? "Confirm"}
      confirmColor={options.confirmColor ?? "red"}
      loading={loading}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
    />
  ) : null;

  return { confirm, dialog };
}
