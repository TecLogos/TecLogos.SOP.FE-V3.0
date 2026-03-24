import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

export default function useVirtualRange({
  enabled,
  itemCount,
  rowHeight,
  overscan = 6,
}) {
  const containerRef = useRef(null)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  useLayoutEffect(() => {
    if (!enabled) return
    const el = containerRef.current
    if (!el) return

    const update = () => setViewportHeight(el.clientHeight || 0)
    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)

    return () => ro.disconnect()
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const el = containerRef.current
    if (!el) return

    let raf = 0
    const onScroll = () => {
      const st = el.scrollTop
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setScrollTop(st))
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (raf) cancelAnimationFrame(raf)
      el.removeEventListener('scroll', onScroll)
    }
  }, [enabled])

  return useMemo(() => {
    if (!enabled || itemCount <= 0 || rowHeight <= 0) {
      return {
        containerRef,
        startIndex: 0,
        endIndex: itemCount,
        topSpacer: 0,
        bottomSpacer: 0,
        totalHeight: itemCount * rowHeight,
      }
    }

    const totalHeight = itemCount * rowHeight
    const rawStart = Math.floor(scrollTop / rowHeight)
    const rawEnd = Math.ceil((scrollTop + viewportHeight) / rowHeight)

    const startIndex = Math.max(0, rawStart - overscan)
    const endIndex = Math.min(itemCount, rawEnd + overscan)

    const topSpacer = startIndex * rowHeight
    const bottomSpacer = Math.max(0, totalHeight - endIndex * rowHeight)

    return { containerRef, startIndex, endIndex, topSpacer, bottomSpacer, totalHeight }
  }, [enabled, itemCount, overscan, rowHeight, scrollTop, viewportHeight])
}
