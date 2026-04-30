"use client";

import { useActionState } from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { SubmitButton } from "@/components/submit-button";
import { login, type LoginFormState } from "@/utils/auth/actions";

const initialState: LoginFormState = {};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="redirect" value={redirectTo ?? ""} />
      <div className="space-y-2">
        <Label htmlFor="email" className="text-base">
          電子郵件
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="m@example.com"
          autoComplete="email"
          required
          defaultValue={state.email}
          className="h-11 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-base">
          密碼
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 text-base"
        />
      </div>
      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}
      <SubmitButton type="submit" className="w-full h-11 text-base">
        登入
      </SubmitButton>
    </form>
  );
}
