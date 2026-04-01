import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

// TODO (Person 2): wire up login server action with JWT cookie auth
export default function LoginPage() {
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
            <form className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">
                  電子郵件
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
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
                  required
                  className="h-11 text-base"
                />
              </div>
              <button
                type="submit"
                className="w-full h-11 text-base bg-primary text-primary-foreground rounded-md"
              >
                登入
              </button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              帳戶由管理員建立
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
