const PSGC_BASE_URL = "https://psgc.cloud/api/v2";

type LocationItem = {
  code?: string;
  name?: string;
  type?: string;
  province?: { code?: string; name?: string } | string;
  city_municipality?: { code?: string; name?: string } | string;
};

function getName(value: LocationItem["province"] | LocationItem["city_municipality"]) {
  return typeof value === "string" ? value : value?.name;
}

function normalizeItems(payload: unknown) {
  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "data" in payload
      ? (payload as { data?: unknown }).data
      : [];

  if (!Array.isArray(items)) return [];

  return (items as LocationItem[])
    .filter((item) => item.code && item.name)
    .map((item) => ({
      code: item.code as string,
      name: formatDisplayName(item.name as string),
      type: item.type,
      province: getName(item.province),
      cityMunicipality: getName(item.city_municipality),
    }));
}

function formatDisplayName(name: string) {
  const trimmed = name.trim();
  return trimmed.startsWith("City of ") ? `${trimmed.slice(8)} City` : trimmed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level");
  const province = searchParams.get("province");
  const city = searchParams.get("city");

  let endpoint: string;
  if (level === "provinces") {
    endpoint = `${PSGC_BASE_URL}/provinces`;
  } else if (level === "cities" && province) {
    endpoint = `${PSGC_BASE_URL}/provinces/${encodeURIComponent(province)}/cities-municipalities`;
  } else if (level === "barangays" && city) {
    endpoint = `${PSGC_BASE_URL}/cities-municipalities/${encodeURIComponent(city)}/barangays`;
  } else {
    return Response.json({ error: "A valid location level and parent are required." }, { status: 400 });
  }

  try {
    let response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!response.ok && level === "barangays" && city?.endsWith(" City")) {
      const apiCityName = `City of ${city.slice(0, -5)}`;
      response = await fetch(`${PSGC_BASE_URL}/cities-municipalities/${encodeURIComponent(apiCityName)}/barangays`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      });
    }

    if (!response.ok) {
      return Response.json({ error: "Location data is temporarily unavailable." }, { status: response.status });
    }

    return Response.json(normalizeItems(await response.json()), {
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return Response.json({ error: "Location data is temporarily unavailable." }, { status: 502 });
  }
}
