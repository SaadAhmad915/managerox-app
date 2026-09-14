import { destroySession } from "@/app/lib/auth-server";
import { handle, json } from "@/app/lib/http";

export async function POST() {
  return handle(async () => {
    await destroySession();
    return json({ message: "Logged out." });
  });
}
