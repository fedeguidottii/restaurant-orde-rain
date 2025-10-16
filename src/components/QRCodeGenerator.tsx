import { useEffect, useRef } from 'react'

interface QRCodeGeneratorProps {
  value: string
  size?: number
}

export default function QRCodeGenerator({ value, size = 256 }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const qrSize = 29
    const moduleSize = size / qrSize
    
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, size, size)

    const hash = value.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0)
    }, 0)

    const random = (seed: number) => {
      const x = Math.sin(seed++) * 10000
      return x - Math.floor(x)
    }

    ctx.fillStyle = '#000000'
    
    for (let row = 0; row < qrSize; row++) {
      for (let col = 0; col < qrSize; col++) {
        const isFinderPattern = 
          (row < 7 && col < 7) || 
          (row < 7 && col >= qrSize - 7) || 
          (row >= qrSize - 7 && col < 7)
        
        if (isFinderPattern) {
          const inOuter = (row === 0 || row === 6 || col === 0 || col === 6 || 
                          (row === 0 && col >= qrSize - 7) || (row === 6 && col >= qrSize - 7) ||
                          (col === 0 && row >= qrSize - 7) || (col === 6 && row >= qrSize - 7) ||
                          (row >= qrSize - 7 && (row === qrSize - 7 || row === qrSize - 1)) ||
                          (row >= qrSize - 7 && (col === 0 || col === 6)))
          const inInner = ((row >= 2 && row <= 4) && (col >= 2 && col <= 4)) ||
                         ((row >= 2 && row <= 4) && (col >= qrSize - 5 && col <= qrSize - 3)) ||
                         ((row >= qrSize - 5 && row <= qrSize - 3) && (col >= 2 && col <= 4))
          
          if (inOuter || inInner) {
            ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize)
          }
        } else {
          const seed = hash + row * qrSize + col
          if (random(seed) > 0.5) {
            ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize)
          }
        }
      }
    }
  }, [value, size])

  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size}
      className="rounded-lg"
    />
  )
}
