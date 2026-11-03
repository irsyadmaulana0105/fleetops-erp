"use client";

import { Camera, ImageIcon, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
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

  const [webcamOpen, setWebcamOpen] = useState(false);

  /**
   * Di HP/tablet, atribut `capture` langsung membuka kamera belakang. Di laptop dan PC atribut itu
   * diabaikan (browser hanya menampilkan jendela pilih berkas), jadi di sana kamera dibuka lewat
   * pratinjau webcam. Perangkat dikenali dari user agent, bukan dari layar sentuh, karena banyak
   * laptop punya layar sentuh.
   */
  function openCamera() {
    const ua = navigator.userAgent;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (mobile) {
      cameraRef.current?.click();
      return;
    }
    setWebcamOpen(true);
  }

  function handleFiles(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = ""; // memungkinkan memilih foto yang sama lagi
    upload(files);
  }

  function upload(files: File[]) {
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
      <button type="button" onClick={openCamera} disabled={pending} className={buttonClass("primary")}>
        {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Camera aria-hidden="true" className="size-4" />}
        {pending ? "Mengunggah…" : `Foto ${label.toLowerCase()}`}
      </button>
      <button type="button" onClick={() => galleryRef.current?.click()} disabled={pending} className={buttonClass("secondary")}>
        <ImageIcon aria-hidden="true" className="size-4" />
        Dari galeri
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => handleFiles(e.currentTarget)} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => handleFiles(e.currentTarget)} />
      {webcamOpen && (
        <WebcamDialog
          onClose={() => setWebcamOpen(false)}
          onCapture={(file) => {
            setWebcamOpen(false);
            upload([file]);
          }}
          onFallback={() => {
            setWebcamOpen(false);
            galleryRef.current?.click();
          }}
        />
      )}
    </div>
  );
}

/** Pratinjau webcam dengan tombol ambil foto, untuk laptop dan komputer tanpa layar sentuh. */
function WebcamDialog({ onClose, onCapture, onFallback }: { onClose: () => void; onCapture: (file: File) => void; onFallback: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    let stream: MediaStream | null = null;
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Kamera laptop hanya bisa dipakai lewat localhost atau HTTPS. Buka aplikasi lewat alamat yang aman, atau pilih foto dari berkas.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play().catch(() => undefined);
        }
      })
      .catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : "";
        setError(
          name === "NotAllowedError"
            ? "Izin kamera ditolak. Izinkan kamera untuk situs ini di pengaturan browser, atau pilih foto dari berkas."
            : name === "NotFoundError"
              ? "Kamera tidak ditemukan di perangkat ini. Pilih foto dari berkas."
              : "Kamera tidak dapat dibuka. Pilih foto dari berkas.",
        );
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function snap() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], "kamera.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label="Ambil foto dengan kamera"
      className="m-auto w-[min(92vw,640px)] rounded-xl p-4 backdrop:bg-slate-900/60"
    >
      <div className="flex flex-col gap-3">
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : (
          <video ref={videoRef} playsInline muted onPlaying={() => setReady(true)} className="aspect-video w-full rounded-lg bg-slate-900 object-cover" />
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>
            Batal
          </button>
          {error ? (
            <button type="button" onClick={onFallback} className={buttonClass("primary")}>
              Pilih dari berkas
            </button>
          ) : (
            <button type="button" onClick={snap} disabled={!ready} className={buttonClass("primary")}>
              <Camera aria-hidden="true" className="size-4" />
              Ambil foto
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
