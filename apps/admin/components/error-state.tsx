import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";

interface ErrorStateProps {
  title?: string;
  message?: string;
}

export function ErrorState({
  title,
  message,
}: ErrorStateProps) {
  const t = useTranslations("error");
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title ?? t("loadTitle")}</AlertTitle>
      <AlertDescription>{message ?? t("loadMessage")}</AlertDescription>
    </Alert>
  );
}
