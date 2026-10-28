"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { idleState } from "@/lib/action-state";
import { buttonClass, inputClass } from "@/components/ui/styles";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, idleState);
  const error = state.status === "error" ? state : null;

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {error.message}
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          defaultValue={error?.values?.email}
          aria-invalid={error?.fieldErrors?.email ? true : undefined}
          className={inputClass}
        />
        {error?.fieldErrors?.email && <p className="mt-1 text-xs font-medium text-red-700">{error.fieldErrors.email[0]}</p>}
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-800">
          Kata sandi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error?.fieldErrors?.password ? true : undefined}
          className={inputClass}
        />
        {error?.fieldErrors?.password && (
          <p className="mt-1 text-xs font-medium text-red-700">{error.fieldErrors.password[0]}</p>
        )}
      </div>

      <button type="submit" disabled={pending} className={`${buttonClass("primary")} w-full`}>
        {pending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        {pending ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
