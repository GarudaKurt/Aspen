import { calendarRangeSchema } from "@/features/tenant-calendar/schemas";
import { calendarFailure, loadCalendar } from "@/features/tenant-calendar/server";

export async function GET(request: Request) {
  const parsed = calendarRangeSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: "Choose a valid business and date range (maximum 43 days)." }, { status: 400 });
  try {
    return Response.json(await loadCalendar(parsed.data), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const failure = calendarFailure(error);
    return Response.json({ error: failure.error }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
  }
}
