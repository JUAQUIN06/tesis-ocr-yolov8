import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// Las dimensiones de la hoja rotada forman parte del layout para que ninguna
// esquina quede fuera del área desplazable, incluso con zoom en móvil.
export function RotatableDocument({ zoom, rotation, children }: { zoom: number; rotation: number; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const width = host.current?.clientWidth ?? 0
      const height = content.current?.offsetHeight ?? 0
      setSize((current) => current.width === width && current.height === height ? current : { width, height })
    })
    observer.observe(host.current!)
    observer.observe(content.current!)
    return () => observer.disconnect()
  }, [])
  const sideways = rotation % 180 !== 0
  const x = rotation === 90 ? size.height * zoom : rotation === 180 ? size.width * zoom : 0
  const y = rotation === 180 ? size.height * zoom : rotation === 270 ? size.width * zoom : 0
  return <div ref={host} className="rotation-host">
    <div className="rotation-frame" style={{ width: size.width ? (sideways ? size.height : size.width) * zoom : '100%', height: size.width ? (sideways ? size.width : size.height) * zoom : undefined }}>
      <div ref={content} className="rotation-content" style={{ width: size.width || '100%', transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${zoom})` }}>{children}</div>
    </div>
  </div>
}
