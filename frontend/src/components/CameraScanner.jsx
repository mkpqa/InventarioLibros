import { useEffect, useRef, useState } from 'react';
import './CameraScanner.css';

/**
 * CameraScanner — Escáner de código de barras vía cámara del dispositivo.
 * Usa la librería html5-qrcode.
 *
 * Props:
 *   onDetected: (codigo: string) => void — llamado cuando se detecta un código
 *   onClose: () => void — cierra el escáner
 */
function CameraScanner({ onDetected, onClose }) {
  const containerRef = useRef(null);
  const scannerRef   = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let scanner = null;

    async function iniciarEscaner() {
      try {
        // Importación dinámica para no aumentar el bundle si no se usa
        const { Html5Qrcode } = await import('html5-qrcode');

        scanner = new Html5Qrcode('camera-scanner-container');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' }, // Cámara trasera
          {
            fps: 10,
            qrbox: { width: 260, height: 120 },
            aspectRatio: 1.6,
          },
          (decodedText) => {
            // Código detectado — detener cámara y notificar
            scanner.stop().catch(() => {});
            onDetected(decodedText);
          },
          () => {} // Error de scan por frame — ignorar
        );
      } catch (err) {
        setError(
          err?.message?.includes('Permission')
            ? 'Permiso de cámara denegado. Habilita el acceso en tu navegador.'
            : `No se pudo iniciar la cámara: ${err?.message || 'Error desconocido'}`
        );
      }
    }

    iniciarEscaner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onDetected]);

  return (
    <div className="camera-modal-overlay">
      <div className="camera-modal">
        <div className="camera-modal__header">
          <h3 className="camera-modal__title">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="9" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 4.5V3.75A1.5 1.5 0 017.5 2.25h3A1.5 1.5 0 0112 3.75V4.5" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            Escanear con cámara
          </h3>
          <button className="camera-modal__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {error ? (
          <div className="camera-error">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#BA1A1A" strokeWidth="1.5"/>
              <path d="M20 13v8M20 25v2" stroke="#BA1A1A" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p>{error}</p>
            <button className="btn-outline" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <>
            <div className="camera-viewfinder">
              <div id="camera-scanner-container" ref={containerRef} />
              <div className="camera-viewfinder__corners">
                <div className="corner corner--tl"/>
                <div className="corner corner--tr"/>
                <div className="corner corner--bl"/>
                <div className="corner corner--br"/>
              </div>
            </div>
            <p className="camera-hint">
              Apunta la cámara al código de barras del libro
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default CameraScanner;
