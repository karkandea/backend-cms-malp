'use client';

import { forwardRef } from "react";

const BASE_STYLES =
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS = {
  default: "bg-blue-600 text-white shadow-sm hover:bg-blue-500",
  outline:
    "border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-600",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
  destructive: "bg-rose-600 text-white hover:bg-rose-500",
};

export const Button = forwardRef(function Button(
  { variant = "default", className = "", type = "button", ...props },
  ref,
) {
  const variantClass = VARIANTS[variant] ?? VARIANTS.default;
  const classes = [BASE_STYLES, variantClass, className].filter(Boolean).join(" ");
  return <button ref={ref} type={type} className={classes} {...props} />;
});
