'use client';

import { forwardRef } from "react";

export const Switch = forwardRef(function Switch(
  { checked = false, disabled = false, onCheckedChange, className = "", ...props },
  ref,
) {
  const handleClick = () => {
    if (disabled) return;
    onCheckedChange?.(!checked);
  };

  const baseClasses =
    "relative inline-flex h-6 w-11 items-center rounded-full transition";
  const stateClasses = checked ? "bg-emerald-500" : "bg-slate-300";
  const disabledClasses = disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer";

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={[baseClasses, stateClasses, disabledClasses, className].filter(Boolean).join(" ")}
      {...props}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-[22px]" : "translate-x-[6px]"
        }`}
      />
      <span className="sr-only">Toggle</span>
    </button>
  );
});
