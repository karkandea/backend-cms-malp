'use client';

import { createContext, useContext } from "react";

const DialogContext = createContext(null);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within <Dialog />");
  }
  return context;
}

export function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogContent({ className = "", children }) {
  const { open, onOpenChange } = useDialogContext();
  if (!open) return null;

  const handleOverlayClick = () => {
    onOpenChange?.(false);
  };

  const handleContentClick = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 px-4"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-md rounded-3xl bg-white shadow-2xl ${className}`}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className = "", children }) {
  return <div className={["px-6 pt-6", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function DialogFooter({ className = "", children }) {
  return (
    <div
      className={["flex items-center justify-end gap-3 px-6 pb-6", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ className = "", children }) {
  return (
    <h3 className={["text-lg font-semibold text-slate-900", className].filter(Boolean).join(" ")}>
      {children}
    </h3>
  );
}

export function DialogDescription({ className = "", children }) {
  return (
    <p className={["mt-2 text-sm text-slate-500", className].filter(Boolean).join(" ")}>
      {children}
    </p>
  );
}
