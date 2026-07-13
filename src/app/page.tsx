import { redirect } from "next/navigation";
import { getUserOrNull } from "@/lib/lms/auth";

export default async function Home() {
  const user = await getUserOrNull();
  redirect(user ? "/learn" : "/login");
}
