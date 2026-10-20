export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 5) {
    return Response.json({ error: "Enter a more complete street address." }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${query}, Philippines`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "ph");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Aspen local business registration address lookup",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return Response.json({ error: "Address search is temporarily unavailable." }, { status: response.status });
    }

    const results = (await response.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
    }>;

    return Response.json(
      results
        .filter((result) => Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon)))
        .map((result) => ({
          id: result.place_id,
          label: result.display_name,
          coordinates: [Number(result.lon), Number(result.lat)] as [number, number],
          type: result.type,
        })),
    );
  } catch {
    return Response.json({ error: "Address search is temporarily unavailable." }, { status: 502 });
  }
}
