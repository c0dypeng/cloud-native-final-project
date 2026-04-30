import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold tracking-tight text-center">
              登入
            </CardTitle>
            <CardDescription className="text-base text-center">
              輸入您的電子郵件和密碼以登入帳戶
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <LoginForm redirectTo={redirectTo} />
            <p className="text-center text-sm text-muted-foreground">
              帳戶由管理員建立
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
