"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { useRef, useLayoutEffect, useState, useCallback, useEffect } from "react"
import { debounce } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()
  const toastRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [heights, setHeights] = useState<Map<string, number>>(new Map())
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Debounced height update to prevent rapid state changes
  const updateHeight = useCallback(
    debounce((id: string, newHeight: number) => {
      setHeights((prevHeights) => {
        const currentHeight = prevHeights.get(id) || 0
        
        // Only update if height changed significantly (more than 1px)
        if (Math.abs(currentHeight - newHeight) > 1) {
          const newMap = new Map(prevHeights)
          newMap.set(id, newHeight)
          return newMap
        }
        
        return prevHeights
      })
    }, 50), // 50ms debounce
    []
  )

  // Initialize ResizeObserver once
  useEffect(() => {
    if (!resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-toast-id')
          if (id && entry.contentRect.height > 0) {
            updateHeight(id, entry.contentRect.height)
          }
        })
      })
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
    }
  }, [updateHeight])

  // Observe toast elements
  useLayoutEffect(() => {
    const observer = resizeObserverRef.current
    if (!observer) return

    // Observe new toasts
    toastRefs.current.forEach((element, id) => {
      if (element && !heights.has(id)) {
        observer.observe(element)
        // Initial height measurement
        const initialHeight = element.offsetHeight
        if (initialHeight > 0) {
          updateHeight(id, initialHeight)
        }
      }
    })

    // Cleanup removed toasts
    const currentToastIds = new Set(toasts.map(t => t.id))
    heights.forEach((_, id) => {
      if (!currentToastIds.has(id)) {
        setHeights((prev) => {
          const newMap = new Map(prev)
          newMap.delete(id)
          return newMap
        })
        const element = toastRefs.current.get(id)
        if (element && observer) {
          observer.unobserve(element)
        }
        toastRefs.current.delete(id)
      }
    })
  }, [toasts, heights, updateHeight])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast 
            key={id} 
            {...props}
            ref={(element: any) => {
              if (element) {
                toastRefs.current.set(id, element)
                element.setAttribute('data-toast-id', id)
              } else {
                toastRefs.current.delete(id)
              }
            }}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
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