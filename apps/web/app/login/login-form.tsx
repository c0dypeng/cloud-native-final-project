"use client";

import { use, useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/utils/auth/actions";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

export function LoginForm({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ from?: string }>;
}) {
  const t = useTranslations("login");
  const params = use(searchParamsPromise);
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="from" value={params.from ?? ""} />
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="employee@huyouan.local"
              required
              disabled={pending}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending}
              className="h-11"
            />
          </div>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full h-11"
            loading={pending}
            loadingText={t("submitting")}
          >
            {t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
