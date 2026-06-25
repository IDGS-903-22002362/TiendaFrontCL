import type { ReactNode } from "react";
import { toast as baseToast } from "@/hooks/use-toast";
import type { ToastActionElement } from "@/components/ui/toast";

type AppToastOptions = {
  title: ReactNode;
  description?: ReactNode;
  duration?: number;
  action?: ToastActionElement;
};

const DEFAULT_DURATION = 5000;
const ERROR_DURATION = 7000;

function showToast(
  variant: "default" | "destructive" | "success" | "warning",
  { title, description, duration, action }: AppToastOptions,
) {
  return baseToast({
    variant,
    title,
    description,
    duration: duration ?? (variant === "destructive" ? ERROR_DURATION : DEFAULT_DURATION),
    action,
  });
}

export function showSuccessToast(options: AppToastOptions) {
  return showToast("success", options);
}

export function showErrorToast(options: AppToastOptions) {
  return showToast("destructive", options);
}

export function showWarningToast(options: AppToastOptions) {
  return showToast("warning", options);
}

export function showInfoToast(options: AppToastOptions) {
  return showToast("default", options);
}

export { baseToast as toast };
