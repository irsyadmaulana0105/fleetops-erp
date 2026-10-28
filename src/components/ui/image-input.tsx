"use client";

import { useContext, useId, useRef, useState } from "react";
import { compressImage } from "@/lib/client/image";
import { FormStateContext } from "./form";
import { inputClass } from "./styles";

/**
 * Pilih foto lalu perkecil di browser sebelum dikirim bersama form.
 * Input yang terlihat tidak punya `name`; berkas hasil kompresi dipasang ke input tersembunyi
 * bernama `name` sehingga hanya foto yang sudah diperkecil yang ikut terkirim.
 */
export function ImageInput({ name, label, hint }: { name: string; label: string; hint?: string }) {
  const id = useId();
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const error = useContext(FormStateContext).fieldErrors?.[name]?.[0];

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const transfer = new DataTransfer();
    if (!file) {
      if (hiddenRef.current) hiddenRef.current.files = transfer.files;
      setInfo(null);
      return;
    }
    setBusy(true);
    const compressed = await compressImage(file);
    transfer.items.add(compressed);
    if (hiddenRef.current) hiddenRef.current.files = transfer.files;
    setInfo(`${Math.max(1, Math.round(compressed.size / 1024))} KB siap diunggah`);
    setBusy(false);
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-800`}
      />
      <input ref={hiddenRef} type="file" name={name} tabIndex={-1} aria-hidden="true" className="sr-only" />
      {busy && <p className="mt-1 text-xs text-slate-500">Memperkecil foto…</p>}
      {info && !busy && <p className="mt-1 text-xs text-slate-500">{info}</p>}
      {hint && !error && !info && !busy && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}
