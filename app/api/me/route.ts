import { requireUser } from "@/app/lib/auth-server";
import { handle, initialsOf, json } from "@/app/lib/http";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();

    return json({
      id: String(user.id),
      firstName: user.name.split(" ")[0],
      fullName: user.name,
      email: user.email,
      role: user.role,
      initials: initialsOf(user.name),
    });
  });
}
