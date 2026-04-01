import { redirect } from "next/navigation";

// TODO (Person 2): replace with JWT cookie auth check
export default function RootPage() {
  redirect("/login");
}
