"use client"

import { useToast } from "@/hooks/use-toast"
import {
  AppNotificationLayout,
  toastVariantToAppVariant,
} from "@/components/ui/app-notification"
import {
  Toast,
  ToastClose,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const appVariant = toastVariantToAppVariant(variant)

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="w-full p-4 pr-12">
              <AppNotificationLayout
                variant={appVariant}
                title={title ?? "Aviso"}
                description={description}
                role={appVariant === "error" ? "alert" : "status"}
              />
              {action ? <div className="mt-3 px-1">{action}</div> : null}
            </div>
            <ToastClose
              aria-label="Cerrar notificación"
              onClick={() => dismiss(id)}
            />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
