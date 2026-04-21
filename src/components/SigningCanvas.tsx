'use client';

import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface Props {
  onSignComplete: (base64Sign: string) => void;
  disabled?: boolean;
}

export const SigningCanvas = ({ onSignComplete, disabled }: Props) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const handleEnd = () => {
    // FIX: the old code had `|| true` which always set isEmpty to true
    if (sigCanvas.current) {
      setIsEmpty(sigCanvas.current.isEmpty());
    }
  };

  const handleConfirm = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      onSignComplete(dataUrl);
    }
  };

  return (
    <div className="space-y-4">
      <p className="font-body text-sm text-outline">Gambar tanda tangan Anda di area di bawah ini:</p>
      <div ref={containerRef} className="border-2 border-dashed border-outline-variant bg-surface-container-lowest rounded-DEFAULT p-1.5 touch-none transition-colors hover:border-outline">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="#191c1e"
          onEnd={handleEnd}
          canvasProps={{
            width: 500,
            height: 180,
            className: 'w-full rounded-DEFAULT touch-none',
            style: { maxWidth: '100%', height: 'auto' },
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={clear}
          className="btn-ghost btn-sm text-error"
          disabled={disabled}
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
          Hapus
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isEmpty || disabled}
          className="btn-primary"
        >
          <span className="material-symbols-outlined text-[18px]">draw</span>
          Kirim &amp; Tandatangani
        </button>
      </div>
    </div>
  );
};
