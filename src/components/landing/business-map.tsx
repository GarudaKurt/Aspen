"use client";

import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import type { BusinessCardProps } from "./business-card";

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (content: string, options?: Record<string, unknown>) => LeafletMarker;
  remove: () => void;
};

type LeafletBounds = {
  contains: (point: [number, number]) => boolean;
};

type LeafletMap = {
  fitBounds: (bounds: unknown, options?: Record<string, unknown>) => LeafletMap;
  getBounds: () => LeafletBounds;
  invalidateSize: () => void;
  on: (event: string, handler: () => void) => LeafletMap;
  off: (event: string, handler: () => void) => LeafletMap;
  remove: () => void;
  setView: (center: [number, number], zoom: number) => LeafletMap;
};

type LeafletNamespace = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  marker: (
    position: [number, number],
    options?: Record<string, unknown>,
  ) => LeafletMarker;
  tileLayer: (
    url: string,
    options?: Record<string, unknown>,
  ) => { addTo: (map: LeafletMap) => void };
  latLngBounds: (points: [number, number][]) => unknown;
  divIcon: (options: Record<string, unknown>) => unknown;
};

declare global {
  interface Window {
    L?: LeafletNamespace;
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
  "cebu city": [10.3157, 123.8854],
  "mandaue city": [10.3236, 123.9223],
  "lapu-lapu city": [10.3103, 123.9494],
  "talisay city": [10.2447, 123.8494],
  "naga city": [10.2089, 123.758],
  "carcar city": [10.1061, 123.6402],
  "danao city": [10.5207, 124.027],
};

const markerGlyphs: Record<string, string> = {
  veterinary: '<path d="M10 2v6H4v4h6v6h4v-6h6V8h-6V2z" />',
  grooming: '<path d="m8 8 8 8M16 8l-8 8M6.5 6.5a2.5 2.5 0 1 0-5 0c0 2 2.5 4 2.5 4s2.5-2 2.5-4ZM22.5 6.5a2.5 2.5 0 1 1-5 0c0 2 2.5 4 2.5 4s2.5-2 2.5-4Z" />',
  boarding: '<path d="m3 11 9-8 9 8v9H3zM9 20v-5h6v5M8 11h.01M12 11h.01M16 11h.01" />',
  "pet supplies": '<path d="M7 8V6a5 5 0 0 1 10 0v2M5 8h14l1 13H4zM9 12h6" />',
  training: '<circle cx="8" cy="7" r="2.2"/><circle cx="16" cy="7" r="2.2"/><circle cx="5" cy="13" r="2"/><circle cx="19" cy="13" r="2"/><path d="M8 18c1.5-2 6.5-2 8 0v2H8z" />',
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

function getMarkerIcon(leaflet: LeafletNamespace, business: BusinessCardProps, count: number) {
  const isCluster = count > 1;
  const glyph = isCluster ? '<path d="M7 7h10v10H7zM4 10H2v10h10v-2M10 4V2h10v10h-2" />' : markerGlyphs[getCategoryKey(business)];
  const label = isCluster ? String(count) : "";

  return leaflet.divIcon({
    className: "aspen-map-marker",
    html: `<span class="aspen-map-pin" title="${escapeHtml(
      isCluster ? `${count} nearby businesses` : business.businessName,
    )}">
      <span class="aspen-map-pin__glyph">${label}<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg></span>
    </span>`,
    iconSize: [38, 46],
    iconAnchor: [19, 46],
  });
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

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);

  return new Promise<LeafletNamespace>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-aspen-leaflet="true"]',
    );

    const finish = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet failed to initialize."));
    };

    if (existingScript) {
      existingScript.addEventListener("load", finish, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Leaflet failed to load.")),
        { once: true },
      );
      return;
    }

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    stylesheet.dataset.aspenLeaflet = "true";
    document.head.appendChild(stylesheet);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.dataset.aspenLeaflet = "true";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Leaflet failed to load.")),
      { once: true },
    );
    document.body.appendChild(script);
  });
}

export function BusinessMap({ businesses, selectedCity }: BusinessMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!businesses.length || !mapElementRef.current) {
      mapRef.current?.remove();
      mapRef.current = null;
      return;
    }

    loadLeaflet()
      .then((leaflet) => {
        if (cancelled || !mapElementRef.current) return;

        mapRef.current?.remove();
        const map = leaflet.map(mapElementRef.current, {
          scrollWheelZoom: false,
          zoomControl: true,
        });
        mapRef.current = map;

        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          })
          .addTo(map);

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
        const activeMarkers = new Map<string, LeafletMarker>();

        const renderVisibleMarkers = () => {
          const visibleGroups = markerGroups.filter((group) =>
            map.getBounds().contains(group.coordinates),
          );
          const visibleKeys = new Set(
            visibleGroups.map((group) => group.coordinates.join(",")),
          );

          activeMarkers.forEach((marker, key) => {
            if (!visibleKeys.has(key)) {
              marker.remove();
              activeMarkers.delete(key);
            }
          });

          visibleGroups.forEach((group) => {
            const key = group.coordinates.join(",");
            if (activeMarkers.has(key)) return;

            const marker = leaflet
              .marker(group.coordinates, {
                icon: getMarkerIcon(leaflet, group.businesses[0], group.businesses.length),
                title:
                  group.businesses.length > 1
                    ? `${group.businesses.length} businesses nearby`
                    : group.businesses[0].businessName,
              })
              .addTo(map)
              .bindPopup(
                group.businesses.length > 1
                  ? getClusterPopupContent(group)
                  : getPopupContent(group.businesses[0]),
                { maxWidth: 260 },
              );

            activeMarkers.set(key, marker);
          });
        };

        const handleMapMove = () => renderVisibleMarkers();
        map.on("moveend", handleMapMove);

        const normalizedCity = selectedCity.trim().toLowerCase();
        const selectedCenter = cityCoordinates[normalizedCity];

        if (normalizedCity === "all cities") {
          if (markerGroups.length === 1) {
            map.setView(markerGroups[0].coordinates, 13);
          } else if (markerGroups.length > 1) {
            map.fitBounds(
              leaflet.latLngBounds(markerGroups.map((group) => group.coordinates)),
              { padding: [30, 30] },
            );
          }
        } else if (selectedCenter) {
          map.setView(selectedCenter, 13);
        } else if (markerGroups.length) {
          map.setView(markerGroups[0].coordinates, 12);
        }

        window.setTimeout(() => {
          map.invalidateSize();
          renderVisibleMarkers();
        }, 50);

        return () => {
          map.off("moveend", handleMapMove);
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
        .aspen-map-marker { background: transparent; border: 0; }
        .aspen-map-pin { display: grid; place-items: center; width: 38px; height: 38px; color: #fff; background: #3c6355; border: 3px solid #fff; border-radius: 9999px 9999px 9999px 4px; transform: rotate(-45deg); box-shadow: 0 2px 8px rgba(23,24,23,.28); transition: transform .18s ease, background-color .18s ease, box-shadow .18s ease; }
        .aspen-map-pin__glyph { display: grid; place-items: center; width: 22px; height: 22px; transform: rotate(45deg); font-size: 12px; font-weight: 700; }
        .aspen-map-pin__glyph svg { width: 18px; height: 18px; }
        .aspen-map-marker:hover .aspen-map-pin { background: #315447; transform: rotate(-45deg) scale(1.12); box-shadow: 0 4px 12px rgba(23,24,23,.35); }
        .leaflet-popup-content-wrapper, .leaflet-popup-tip { border: 1px solid #dfe8e2; }
        .leaflet-control-zoom a { color: #3c6355 !important; }
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
