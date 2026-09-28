import type { CSSProperties } from 'react'
import type { Swatch as SwatchT } from '../config/catalog'

/** CSS approximation of a material. Used on screen; the PDF uses the base color. */
export function swatchStyle({ color, accent = color, pattern = 'solid' }: SwatchT): CSSProperties {
  switch (pattern) {
    case 'speckle':
      return {
        backgroundColor: color,
        backgroundImage: [
          `radial-gradient(${accent} 1px, transparent 1.6px)`,
          `radial-gradient(${accent} 0.8px, transparent 1.4px)`,
          `radial-gradient(${accent}88 1.4px, transparent 2px)`,
        ].join(','),
        backgroundSize: '7px 7px, 11px 11px, 17px 17px',
        backgroundPosition: '0 0, 3px 5px, 8px 2px',
      }
    case 'veined':
      return {
        backgroundColor: color,
        backgroundImage: [
          `linear-gradient(115deg, transparent 38%, ${accent}aa 40%, transparent 43%)`,
          `linear-gradient(160deg, transparent 62%, ${accent}77 63.5%, transparent 66%)`,
          `linear-gradient(70deg, transparent 20%, ${accent}55 21%, transparent 23%)`,
        ].join(','),
      }
    case 'wood':
      return {
        backgroundColor: color,
        backgroundImage: `repeating-linear-gradient(92deg, transparent 0 5px, ${accent}66 5px 6px, transparent 6px 11px, ${accent}33 11px 13px)`,
      }
    case 'tile':
      return {
        backgroundColor: color,
        backgroundImage: [
          `linear-gradient(${accent} 1.5px, transparent 1.5px)`,
          `linear-gradient(90deg, ${accent} 1.5px, transparent 1.5px)`,
        ].join(','),
        backgroundSize: '100% 12px, 24px 24px',
        backgroundPosition: '0 0, 0 0',
      }
    case 'metal':
      return {
        backgroundColor: color,
        backgroundImage: `linear-gradient(135deg, ${accent} 0%, ${color} 35%, #ffffff66 50%, ${color} 65%, ${accent} 100%)`,
      }
    default:
      return { backgroundColor: color }
  }
}

export function Swatch({ swatch, className = '' }: { swatch: SwatchT; className?: string }) {
  return <span className={`inline-block shrink-0 rounded-lg border border-black/10 ${className}`} style={swatchStyle(swatch)} />
}
