"use client";

import { Camera, ImageIcon, Loader2 } from "lucide-react";
import { useRef, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { buttonClass } from "@/components/ui/styles";
import { compressImage } from "@/lib/client/image";
import { uploadPhoto } from "../actions";

/** Tombol ambil foto (kamera belakang) dan pilih dari galeri. Foto diperkecil dulu sebelum diunggah. */
export function PhotoUploader({ workOrderId, photoType, label }: { workOrderId: number; photoType: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleFiles(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = ""; // memungkinkan memilih foto yang sama lagi
    if (files.length === 0) return;

    startTransition(async () => {
      let saved = 0;
      for (const file of files) {
        const formData = new FormData();
        formData.set("photo", await compressImage(file));
        const result = await uploadPhoto(workOrderId, photoType, formData);
        if (result.status === "error") {
          toast.show({ type: "error", message: result.message });
          break;
        }
        saved += 1;
      }
      if (saved > 0) toast.show({ type: "success", message: saved === 1 ? "Foto tersimpan." : `${saved} foto tersimpan.` });
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => cameraRef.current?.click()} disabled={pending} className={buttonClass("primary")}>
        {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Camera aria-hidden="true" className="size-4" />}
        {pending ? "Mengunggah…" : `Foto ${label.toLowerCase()}`}
      </button>
      <button type="button" onClick={() => galleryRef.current?.click()} disabled={pending} className={buttonClass("secondary")}>
        <ImageIcon aria-hidden="true" className="size-4" />
        Dari galeri
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => handleFiles(e.currentTarget)} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => handleFiles(e.currentTarget)} />
    </div>
  );
}
