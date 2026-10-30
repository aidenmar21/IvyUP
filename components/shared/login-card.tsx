"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/form-bits";
import { Logo } from "@/components/shared/logo";
import type { LoginState } from "@/lib/login-actions";

export function LoginCard({
  title,
  subtitle,
  identifierLabel,
  identifierType,
  action,
  next,
  footer,
  notice,
}: {
  title: string;
  subtitle: string;
  identifierLabel: string;
  identifierType: "email" | "username";
  action: (state: LoginState, form: FormData) => Promise<LoginState>;
  next?: string;
  footer?: React.ReactNode;
  notice?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [show, setShow] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Link href="/" aria-label="IvyUp home" className="w-fit">
          <Logo />
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl text-ink-900">{title}</h1>
          <p className="text-ink-600">{subtitle}</p>
        </div>
        {notice && <p className="rounded-md bg-brass-100 px-4 py-2 text-sm text-brass-700">{notice}</p>}
        <form action={formAction} className="flex flex-col gap-6">
          {next && <input type="hidden" name="next" value={next} />}
          <Field label={identifierLabel} htmlFor="identifier">
            <Input
              id="identifier"
              name="identifier"
              type={identifierType === "email" ? "email" : "text"}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={state.identifier}
              required
            />
          </Field>
          <Field label="Password" htmlFor="password" error={state.error}>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                className="pr-12"
                aria-invalid={!!state.error}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-600 hover:text-ink-900"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        {footer && <div className="text-sm text-ink-600">{footer}</div>}
      </div>
    </div>
  );
}
