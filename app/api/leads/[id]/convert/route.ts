import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/app/lib/auth-server";
import { convertLead } from "@/app/lib/convert";
import { handle, json, parse } from "@/app/lib/http";
import { presentLead } from "@/app/lib/present";
import { idParam, named } from "@/app/lib/query";

const schema = z.object({
  title: z.string().trim().max(255).nullish(),
  value: z.number().int().min(0).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    await requireUser();

    const id = idParam((await params).id);
    const input = await parse(request, schema);
    const db = await getDb();

    const result = await convertLead(db, id, input);

    if (!result.ok) {
      return result.reason === "not-found"
        ? json({ message: "Not found." }, 404)
        : json({ message: "This lead has already been converted." }, 422);
    }

    const [owner] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, result.lead.ownerId ?? 0))
      .limit(1);

    return json(
      {
        lead: presentLead(result.lead, {
          owner: named(owner),
          contactId: result.contactId,
          dealId: result.dealId,
        }),
        contactId: String(result.contactId),
        dealId: String(result.dealId),
      },
      201,
    );
  });
}
