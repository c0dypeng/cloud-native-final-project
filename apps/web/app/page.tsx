import { redirect } from "next/navigation";
import { getToken } from "@/utils/auth/server";

export default async function RootPage() {
  const token = await getToken();
  redirect(token ? "/dashboard" : "/login");
}
