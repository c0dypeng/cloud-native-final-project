import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const errorMessage = message || "抱歉，您的身份驗證出現問題";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-destructive">
              驗證錯誤
            </CardTitle>
            <CardDescription className="text-base">
              請查看以下錯誤並重試
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-5">
              <p className="text-base text-destructive">{errorMessage}</p>
            </div>
            <Button asChild className="w-full h-11 text-base">
              <Link href="/login">返回登入</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
