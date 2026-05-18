import { useEffect, useRef } from 'react';

/**
 * useScanner — Detecta lecturas de pistola de código de barras USB.
 *
 * Las pistolas USB actúan como teclado: envían los caracteres del código
 * muy rápido (< 50ms entre teclas) y terminan con la tecla Enter.
 * Este hook distingue la escritura humana (lenta) de la pistola (rápida).
 *
 * @param {(codigo: string) => void} onScan — Callback cuando se detecta un escaneo
 * @param {boolean} activo — Si false, el listener no está registrado
 */
export function useScanner(onScan, activo = true) {
  const bufferRef       = useRef('');
  const lastKeyTimeRef  = useRef(0);
  const THRESHOLD_MS    = 50; // ms entre teclas — pistola es más rápido que esto

  useEffect(() => {
    if (!activo) return;

    function handleKeyDown(e) {
      const now = Date.now();

      if (e.key === 'Enter') {
        const codigo = bufferRef.current.trim();
        if (codigo.length > 0) {
          onScan(codigo);
        }
        bufferRef.current = '';
        return;
      }

      // Ignorar teclas de control
      if (e.key.length !== 1) return;

      // Si pasó demasiado tiempo desde la última tecla, reiniciar buffer
      // (podría ser escritura manual)
      const delta = now - lastKeyTimeRef.current;
      if (delta > 300 && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      bufferRef.current   += e.key;
      lastKeyTimeRef.current = now;
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, activo]);
}

export default useScanner;
