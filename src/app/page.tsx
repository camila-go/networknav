import { redirect } from "next/navigation";

/**
 * Default entry: sign-in. Marketing / event info lives at `/welcome`.
 */
export default function RootPage() {
  redirect("/login");
}
