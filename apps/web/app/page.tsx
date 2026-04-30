import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utils/auth/server";

export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
