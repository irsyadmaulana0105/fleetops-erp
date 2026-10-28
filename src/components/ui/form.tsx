"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { createContext, useActionState, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { idleState, type ActionState } from "@/lib/action-state";
import { Modal } from "./modal";
import { buttonClass, inputClass, type ButtonVariant } from "./styles";
import { useToast } from "./toast";

/* ────────────────────────────────────────────────────────────────────────────
 * Field — label + input + pesan galat, dibaca dari hasil server action terakhir.
 * ──────────────────────────────────────────────────────────────────────────── */

type FormStateValue = {
  fieldErrors?: Record<string, string[]>;
  /** Ada hanya setelah validasi gagal: isian terakhir yang dikirim pengguna. */
  values?: Record<string, string>;
};

export const FormStateContext = createContext<FormStateValue>({});

export type FieldOption = { value: string; label: string };

export type FieldProps = {
  name: string;
  label: string;
  kind?: "text" | "email" | "tel" | "number" | "password" | "textarea" | "select" | "checkbox" | "date" | "datetime-local";
  defaultValue?: string | number | boolean | null;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  options?: FieldOption[];
  min?: number;
  max?: number;
  rows?: number;
  autoComplete?: string;
};

export function Field({
  name,
  label,
  kind = "text",
  defaultValue,
  required,
  hint,
  placeholder,
  options,
  min,
  max,
  rows = 3,
  autoComplete,
}: FieldProps) {
  const { fieldErrors, values } = useContext(FormStateContext);
  const id = useId();
  const error = fieldErrors?.[name]?.[0];
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  // Setelah validasi gagal, tampilkan kembali isian pengguna (bukan nilai awal).
  const submitted = values?.[name];
  const initial = submitted ?? (defaultValue === null || defaultValue === undefined ? "" : String(defaultValue));

  const common = {
    id,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": required || undefined,
  } as const;

  if (kind === "checkbox") {
    const checked = values ? name in values : Boolean(defaultValue);
    return (
      <div>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
          <input
            key={String(checked)}
            type="checkbox"
            name={name}
            defaultChecked={checked}
            className="size-5 rounded border-slate-300 accent-amber-500"
            aria-describedby={describedBy}
          />
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="mt-1 pl-8 text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-red-600">
            *
          </span>
        )}
      </label>

      {kind === "textarea" ? (
        <textarea key={initial} {...common} rows={rows} defaultValue={initial} placeholder={placeholder} className={inputClass} />
      ) : kind === "select" ? (
        <select key={initial} {...common} defaultValue={initial} className={inputClass}>
          {initial === "" && (
            <option value="" disabled>
              Pilih…
            </option>
          )}
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          key={initial}
          {...common}
          type={kind}
          defaultValue={kind === "password" ? undefined : initial}
          placeholder={placeholder}
          min={min}
          max={max}
          inputMode={kind === "number" ? "numeric" : undefined}
          autoComplete={autoComplete ?? (kind === "password" ? "new-password" : "off")}
          className={inputClass}
        />
      )}

      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FormDialog — tombol pemicu + modal berisi form yang terhubung ke server action.
 * ──────────────────────────────────────────────────────────────────────────── */

const TRIGGER_ICON = { plus: Plus, pencil: Pencil, trash: Trash2 } as const;

type FormDialogProps = {
  /** Teks tombol pemicu. Untuk `iconOnly`, dipakai sebagai label aksesibilitas. */
  triggerLabel: string;
  triggerIcon?: keyof typeof TRIGGER_ICON;
  triggerVariant?: ButtonVariant;
  iconOnly?: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  /** Tombol kirim berwarna merah; dipakai untuk konfirmasi hapus (isi dialog berupa teks saja). */
  destructive?: boolean;
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
};

export function FormDialog({
  triggerLabel,
  triggerIcon,
  triggerVariant = "secondary",
  iconOnly = false,
  title,
  description,
  submitLabel,
  destructive = false,
  action,
  children,
}: FormDialogProps) {
  const [open, setOpen] = useState(false);
  const Icon = triggerIcon ? TRIGGER_ICON[triggerIcon] : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={iconOnly ? triggerLabel : undefined}
        title={iconOnly ? triggerLabel : undefined}
        className={iconOnly ? iconButtonClass(triggerVariant) : buttonClass(triggerVariant)}
      >
        {Icon && <Icon aria-hidden="true" className="size-4" />}
        {!iconOnly && triggerLabel}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description}>
        {/* Isi form hanya dipasang saat dialog terbuka, sehingga state & isian selalu segar setiap dibuka. */}
        {open && (
          <FormBody
            action={action}
            submitLabel={submitLabel}
            destructive={destructive}
            onDone={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          >
            {children}
          </FormBody>
        )}
      </Modal>
    </>
  );
}

function iconButtonClass(variant: ButtonVariant): string {
  return buttonClass(variant, "sm") + " !px-0 w-9";
}

type FormBodyProps = {
  action: FormDialogProps["action"];
  submitLabel: string;
  destructive: boolean;
  onDone: () => void;
  onCancel: () => void;
  children: ReactNode;
};

function FormBody({ action, submitLabel, destructive, onDone, onCancel, children }: FormBodyProps) {
  const toast = useToast();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Toast & penutupan dialog dipicu di sini (bukan lewat efek), karena setelah aksi sukses halaman server
  // dirender ulang dan dialog ini bisa ikut hilang (mis. tombol "Tandai dipesan" tak ada lagi setelah status berubah).
  const [state, formAction, pending] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result.status === "success") {
      toast.show({ type: "success", message: result.message });
      onDoneRef.current();
    }
    return result;
  }, idleState);

  const errorState = state.status === "error" ? state : null;

  return (
    <FormStateContext.Provider value={{ fieldErrors: errorState?.fieldErrors, values: errorState?.values }}>
      <form action={formAction} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {errorState && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
              {errorState.message}
            </p>
          )}
          {children}
        </div>
        <div className="pb-safe flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button type="button" onClick={onCancel} className={buttonClass("secondary")}>
            Batal
          </button>
          <button type="submit" disabled={pending} className={buttonClass(destructive ? "danger" : "primary")}>
            {pending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            {pending ? "Memproses…" : submitLabel}
          </button>
        </div>
      </form>
    </FormStateContext.Provider>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * PageForm — form satu halaman penuh (bukan dialog). Server action yang sukses
 * biasanya diakhiri `redirect(...)`, jadi tidak ada status sukses di sini.
 * ──────────────────────────────────────────────────────────────────────────── */

type PageFormProps = {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  cancelHref: string;
  children: ReactNode;
};

export function PageForm({ action, submitLabel, cancelHref, children }: PageFormProps) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const errorState = state.status === "error" ? state : null;

  return (
    <FormStateContext.Provider value={{ fieldErrors: errorState?.fieldErrors, values: errorState?.values }}>
      <form action={formAction} noValidate className="space-y-6">
        {errorState && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            {errorState.message}
          </p>
        )}
        {children}
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          <Link href={cancelHref} className={buttonClass("secondary")}>
            Batal
          </Link>
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            {pending ? "Menyimpan…" : submitLabel}
          </button>
        </div>
      </form>
    </FormStateContext.Provider>
  );
}
