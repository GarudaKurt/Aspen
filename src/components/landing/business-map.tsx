"use client";

import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import type { BusinessCardProps } from "./business-card";

type MapLibreBounds = {
  getEast: () => number;
  getNorth: () => number;
  getSouth: () => number;
  getWest: () => number;
};

type MapLibreMap = {
  addControl: (control: unknown, position?: string) => MapLibreMap;
  fitBounds: (
    bounds: [[number, number], [number, number]],
    options?: Record<string, unknown>,
  ) => MapLibreMap;
  getBounds: () => MapLibreBounds;
  on: (event: string, handler: () => void) => MapLibreMap;
  off: (event: string, handler: () => void) => MapLibreMap;
  once: (event: string, handler: () => void) => MapLibreMap;
  remove: () => void;
  resize: () => void;
  setCenter: (center: [number, number]) => MapLibreMap;
  setZoom: (zoom: number) => MapLibreMap;
};

type MapLibreMarker = {
  remove: () => void;
  setLngLat: (coordinates: [number, number]) => MapLibreMarker;
  addTo: (map: MapLibreMap) => MapLibreMarker;
};

type MapLibrePopup = {
  remove: () => void;
  setHTML: (html: string) => MapLibrePopup;
  setLngLat: (coordinates: [number, number]) => MapLibrePopup;
  addTo: (map: MapLibreMap) => MapLibrePopup;
};

type MapLibreNamespace = {
  Map: new (options: Record<string, unknown>) => MapLibreMap;
  Marker: new (options: Record<string, unknown>) => MapLibreMarker;
  Popup: new (options?: Record<string, unknown>) => MapLibrePopup;
  NavigationControl: new () => unknown;
};

declare global {
  interface Window {
    maplibregl?: MapLibreNamespace;
  }
}

type BusinessMapProps = {
  businesses: BusinessCardProps[];
  selectedCity: string;
};

type PositionedBusiness = {
  business: BusinessCardProps;
  coordinates: [number, number];
};

type MarkerGroup = {
  coordinates: [number, number];
  businesses: BusinessCardProps[];
};

const cityCoordinates: Record<string, [number, number]> = {
  "cebu city": [123.8854, 10.3157],
  "mandaue city": [123.9223, 10.3236],
  "lapu-lapu city": [123.9494, 10.3103],
  "talisay city": [123.8494, 10.2447],
  "naga city": [123.758, 10.2089],
  "carcar city": [123.6402, 10.1061],
  "danao city": [124.027, 10.5207],
};

const markerGlyphs: Record<string, string> = {
  veterinary: '<path d="M10 2v6H4v4h6v6h4v-6h6V8h-6V2z" />',
  grooming:
    '<path d="m8 8 8 8M16 8 8 16M6.5 6.5a2.5 2.5 0 1 0-5 0c0 2 2.5 4 2.5 4s2.5-2 2.5-4ZM22.5 6.5a2.5 2.5 0 1 1-5 0c0 2 2.5 4 2.5 4s2.5-2 2.5-4Z" />',
  boarding:
    '<path d="m3 11 9-8 9 8v9H3zM9 20v-5h6v5M8 11h.01M12 11h.01M16 11h.01" />',
  "pet supplies":
    '<path d="M7 8V6a5 5 0 0 1 10 0v2M5 8h14l1 13H4zM9 12h6" />',
  training:
    '<circle cx="8" cy="7" r="2.2"/><circle cx="16" cy="7" r="2.2"/><circle cx="5" cy="13" r="2"/><circle cx="19" cy="13" r="2"/><path d="M8 18c1.5-2 6.5-2 8 0v2H8z" />',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

function getCoordinates(business: BusinessCardProps) {
  const city = business.location.split(",")[0]?.trim().toLowerCase();
  return cityCoordinates[city] ?? null;
}

function getRating(value: string) {
  return value.split(" ")[0] ?? value;
}

function getCategoryKey(business: BusinessCardProps) {
  const value = business.services.toLowerCase();
  if (value.includes("vet") || value.includes("veter")) return "veterinary";
  if (value.includes("groom")) return "grooming";
  if (value.includes("board")) return "boarding";
  if (value.includes("supply")) return "pet supplies";
  return "training";
}

function createMarkerElement(
  business: BusinessCardProps,
  count: number,
) {
  const isCluster = count > 1;
  const glyph = isCluster
    ? '<path d="M7 7h10v10H7zM4 10H2v10h10v-2M10 4V2h10v10h-2" />'
    : markerGlyphs[getCategoryKey(business)];
  const element = document.createElement("button");

  element.type = "button";
  element.className = "aspen-map-pin";
  element.title = isCluster
    ? `${count} nearby businesses`
    : business.businessName;
  element.setAttribute(
    "aria-label",
    isCluster
      ? `${count} nearby businesses`
      : `View ${business.businessName} on the map`,
  );
  element.innerHTML = `
    <span class="aspen-map-pin__glyph">
      ${isCluster ? count : ""}
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>
    </span>
  `;

  return element;
}

function getPopupContent(business: BusinessCardProps) {
  const slug = business.slug ?? "";
  const image = business.images?.[0]?.src;
  const imageMarkup = image
    ? `<img src="${escapeHtml(image)}" alt="" style="width:100%;height:96px;object-fit:cover;border-radius:10px 10px 0 0;" />`
    : "";
  const profileHref = `/business-profile/${encodeURIComponent(slug)}`;

  return `
    <div style="width:220px;overflow:hidden;font-family:inherit;color:#171817;">
      ${imageMarkup}
      <div style="padding:10px;">
        <strong style="display:block;font-size:15px;color:#3c6355;">${escapeHtml(business.businessName)}</strong>
        <span style="display:block;margin-top:4px;font-size:12px;color:#69736d;">${escapeHtml(business.location)}</span>
        <div style="display:flex;gap:6px;margin-top:8px;font-size:12px;">
          <span style="color:#d39b00;">★ ${escapeHtml(getRating(business.rating))}</span>
          <span style="color:#69736d;">· ${escapeHtml(business.services)}</span>
        </div>
        <strong style="display:block;margin-top:7px;font-size:13px;">Starts at ${escapeHtml(business.priceStarts)}</strong>
        <a href="${profileHref}" style="display:inline-block;margin-top:10px;color:#3c6355;font-size:12px;font-weight:600;text-decoration:underline;">View business profile</a>
      </div>
    </div>
  `;
}

function getClusterPopupContent(group: MarkerGroup) {
  return `
    <div style="width:240px;font-family:inherit;color:#171817;">
      <strong style="display:block;color:#3c6355;">${group.businesses.length} businesses nearby</strong>
      <div style="display:grid;gap:8px;margin-top:10px;">
        ${group.businesses
          .map(
            (business) => `<a href="/business-profile/${encodeURIComponent(
              business.slug ?? "",
            )}" style="color:#3c6355;font-size:12px;font-weight:600;text-decoration:underline;">${escapeHtml(
              business.businessName,
            )}</a>`,
          )
          .join("")}
      </div>
    </div>
  `;
}

function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);

  return new Promise<MapLibreNamespace>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-aspen-maplibre="true"]',
    );

    const finish = () => {
      if (window.maplibregl) resolve(window.maplibregl);
      else reject(new Error("MapLibre failed to initialize."));
    };

    if (existingScript) {
      existingScript.addEventListener("load", finish, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("MapLibre failed to load.")),
        { once: true },
      );
      return;
    }

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href =
      "https://unpkg.com/maplibre-gl@6.13.0/dist/maplibre-gl.css";
    stylesheet.dataset.aspenMaplibre = "true";
    document.head.appendChild(stylesheet);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/maplibre-gl@6.13.0/dist/maplibre-gl.js";
    script.async = true;
    script.dataset.aspenMaplibre = "true";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("MapLibre failed to load.")),
      { once: true },
    );
    document.body.appendChild(script);
  });
}

function isWithinBounds(
  bounds: MapLibreBounds,
  coordinates: [number, number],
) {
  const [longitude, latitude] = coordinates;
  return (
    longitude >= bounds.getWest() &&
    longitude <= bounds.getEast() &&
    latitude >= bounds.getSouth() &&
    latitude <= bounds.getNorth()
  );
}

export function BusinessMap({ businesses, selectedCity }: BusinessMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!businesses.length || !mapElementRef.current) {
      mapRef.current?.remove();
      mapRef.current = null;
      return;
    }

    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !mapElementRef.current) return;

        mapRef.current?.remove();
        const map = new maplibregl.Map({
          container: mapElementRef.current,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: cityCoordinates["cebu city"],
          zoom: 10,
          attributionControl: true,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl(), "top-right");

        const positionedBusinesses = businesses
          .map((business) => ({
            business,
            coordinates: getCoordinates(business),
          }))
          .filter(
            (item): item is PositionedBusiness => Boolean(item.coordinates),
          );

        const groupedBusinesses = new Map<string, MarkerGroup>();

        positionedBusinesses.forEach(({ business, coordinates }) => {
          const key = coordinates.join(",");
          const group = groupedBusinesses.get(key);

          if (group) {
            group.businesses.push(business);
          } else {
            groupedBusinesses.set(key, { coordinates, businesses: [business] });
          }
        });

        const markerGroups = Array.from(groupedBusinesses.values());
        const activeMarkers = new Map<string, MapLibreMarker>();
        const activePopups = new Map<string, MapLibrePopup>();

        const renderVisibleMarkers = () => {
          const visibleGroups = markerGroups.filter((group) =>
            isWithinBounds(map.getBounds(), group.coordinates),
          );
          const visibleKeys = new Set(
            visibleGroups.map((group) => group.coordinates.join(",")),
          );

          activeMarkers.forEach((marker, key) => {
            if (!visibleKeys.has(key)) {
              marker.remove();
              activeMarkers.delete(key);
              activePopups.get(key)?.remove();
              activePopups.delete(key);
            }
          });

          visibleGroups.forEach((group) => {
            const key = group.coordinates.join(",");
            if (activeMarkers.has(key)) return;

            const markerElement = createMarkerElement(
              group.businesses[0],
              group.businesses.length,
            );
            const marker = new maplibregl.Marker({ element: markerElement })
              .setLngLat(group.coordinates)
              .addTo(map);

            const popup = new maplibregl.Popup({ maxWidth: "260px" })
              .setHTML(
                group.businesses.length > 1
                  ? getClusterPopupContent(group)
                  : getPopupContent(group.businesses[0]),
              )
              .setLngLat(group.coordinates);

            markerElement.addEventListener("click", () => {
              popup.addTo(map);
              activePopups.set(key, popup);
            });

            activeMarkers.set(key, marker);
          });
        };

        const initializeMap = () => {
          const normalizedCity = selectedCity.trim().toLowerCase();
          const selectedCenter = cityCoordinates[normalizedCity];

          if (normalizedCity === "all cities") {
            if (markerGroups.length === 1) {
              map.setCenter(markerGroups[0].coordinates).setZoom(13);
            } else if (markerGroups.length > 1) {
              map.fitBounds(
                [
                  [
                    Math.min(...markerGroups.map((group) => group.coordinates[0])),
                    Math.min(...markerGroups.map((group) => group.coordinates[1])),
                  ],
                  [
                    Math.max(...markerGroups.map((group) => group.coordinates[0])),
                    Math.max(...markerGroups.map((group) => group.coordinates[1])),
                  ],
                ],
                { padding: 30, maxZoom: 12 },
              );
            }
          } else if (selectedCenter) {
            map.setCenter(selectedCenter).setZoom(13);
          } else if (markerGroups.length) {
            map.setCenter(markerGroups[0].coordinates).setZoom(12);
          }

          map.resize();
          renderVisibleMarkers();
        };

        map.once("load", initializeMap);
        map.on("moveend", renderVisibleMarkers);

        return () => {
          map.off("moveend", renderVisibleMarkers);
          activeMarkers.forEach((marker) => marker.remove());
          activePopups.forEach((popup) => popup.remove());
          map.remove();
        };
      })
      .catch(() => {
        if (!cancelled && mapElementRef.current) {
          mapElementRef.current.dataset.mapError = "true";
        }
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [businesses, selectedCity]);

  return (
    <section className="px-6 py-12 sm:px-10 sm:py-16 lg:px-[130px] 2xl:px-16">
      <style>{`
        .aspen-map-pin { display:grid; place-items:center; width:38px; height:38px; padding:0; border:3px solid #fff; border-radius:9999px 9999px 9999px 4px; background:#3c6355; color:#fff; cursor:pointer; transform:rotate(-45deg); box-shadow:0 2px 8px rgba(23,24,23,.28); transition:transform .18s ease, background-color .18s ease, box-shadow .18s ease; }
        .aspen-map-pin__glyph { display:grid; place-items:center; width:22px; height:22px; transform:rotate(45deg); font-size:12px; font-weight:700; }
        .aspen-map-pin__glyph svg { width:18px; height:18px; }
        .aspen-map-pin:hover, .aspen-map-pin:focus-visible { background:#315447; transform:rotate(-45deg) scale(1.12); box-shadow:0 4px 12px rgba(23,24,23,.35); outline:3px solid rgba(60,99,85,.28); outline-offset:2px; }
        .maplibregl-popup-content-wrapper, .maplibregl-popup-tip { border:1px solid #dfe8e2; }
        .maplibregl-ctrl-group button { color:#3c6355; }
      `}</style>
      <div className="mx-auto max-w-[1440px] 2xl:max-w-[1680px]">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5714e]">
              Explore by location
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[#3c6355] sm:text-4xl">
              Explore Pet Services Near You
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#69736d] sm:text-base">
              Browse nearby providers on the map and open a profile to learn more or request an appointment.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#69736d]">
            <MapPin className="size-4 text-[#3c6355]" />
            {businesses.length} available {businesses.length === 1 ? "business" : "businesses"}
          </div>
        </div>

        {businesses.length ? (
          <div className="relative overflow-hidden rounded-2xl border border-[#dfe8e2] bg-[#eaf0ed] shadow-sm">
            <div
              ref={mapElementRef}
              aria-label="Interactive map of matching pet-service businesses"
              className="h-[360px] w-full sm:h-[440px]"
            />
            <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] text-[#69736d] shadow-sm">
              Pan the map to discover businesses in nearby cities.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d8d8d8] bg-[#faf9f6] px-6 py-14 text-center">
            <MapPin className="mx-auto size-9 text-[#3c6355]" />
            <h3 className="mt-3 text-lg font-semibold text-[#3c6355]">
              No businesses match these filters
            </h3>
            <p className="mt-2 text-sm text-[#777b78]">
              Try another search term or service category to explore the map.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
