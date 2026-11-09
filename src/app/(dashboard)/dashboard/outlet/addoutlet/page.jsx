"use client";

import OutletForm from "../_components/OutletForm";
import { ToastProvider } from "@/components/ui/use-toast";

export default function AddOutletPage() {
  return (
    <ToastProvider>
      <OutletForm mode="create" />
    </ToastProvider>
  );
}
