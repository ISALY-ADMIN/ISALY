"use client"

import { useToast } from "@/hooks/use-toast"
import { EmojiText } from "@/components/ui/Emoji"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{typeof title === "string" ? <EmojiText text={title} /> : title}</ToastTitle>}
              {description && (
                <ToastDescription>{typeof description === "string" ? <EmojiText text={description} /> : description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
