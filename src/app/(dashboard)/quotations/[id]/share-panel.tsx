"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useRef, useState } from "react";
import { buttonClass, inputClass } from "@/components/ui/styles";

/** Tautan persetujuan untuk klien: salin, atau buka WhatsApp dengan pesan yang sudah terisi. */
export function SharePanel({ url, whatsappUrl, expiresLabel, expired }: { url: string; whatsappUrl: string; expiresLabel: string; expired: boolean }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Tanpa izin clipboard (mis. HTTP non-localhost): pilih teksnya agar bisa disalin dengan Ctrl+C.
      inputRef.current?.select();
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5" aria-labelledby="share-title">
      <h2 id="share-title" className="text-base font-semibold text-slate-900">
        Tautan persetujuan klien
      </h2>
      <p className="mt-1 text-sm text-slate-700">
        {expired ? (
          <span className="font-medium text-red-700">Tautan sudah kedaluwarsa pada {expiresLabel}. Buat ulang tautan untuk mengirim lagi.</span>
        ) : (
          <>Klien membuka tautan ini tanpa login untuk menyetujui, meminta revisi, atau menolak. Berlaku sampai {expiresLabel}.</>
        )}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input ref={inputRef} readOnly value={url} aria-label="Tautan persetujuan" onFocus={(event) => event.currentTarget.select()} className={`${inputClass} font-mono text-xs`} />
        <div className="flex gap-2">
          <button type="button" onClick={copy} className={buttonClass("secondary")}>
            {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
            {copied ? "Tersalin" : "Salin"}
          </button>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className={buttonClass("primary")}>
            <MessageCircle aria-hidden="true" className="size-4" />
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
