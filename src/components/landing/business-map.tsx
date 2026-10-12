"use client";

import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import type { BusinessCardProps } from "./business-card";

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (content: string, options?: Record<string, unknown>) => LeafletMarker;
};

type LeafletMap = {
  fitBounds: (bounds: unknown, options?: Record<string, unknown>) => LeafletMap;
  remove: () => void;
  setView: (center: [number, number], zoom: number) => LeafletMap;
  invalidateSize: () => void;
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
      existingScript.addEventListener("error", () => reject(new Error("Leaflet failed to load.")), {
        once: true,
      });
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
    script.addEventListener("error", () => reject(new Error("Leaflet failed to load.")), {
      once: true,
    });
    document.body.appendChild(script);
  });
}

export function BusinessMap({ businesses }: BusinessMapProps) {
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
            (
              item,
            ): item is {
              business: BusinessCardProps;
              coordinates: [number, number];
            } => Boolean(item.coordinates),
          );

        const points = positionedBusinesses.map((item) => item.coordinates);

        positionedBusinesses.forEach(({ business, coordinates }) => {
          leaflet
            .marker(coordinates, {
              icon: leaflet.divIcon({
                className: "aspen-map-marker",
                html: '<span style="display:grid;place-items:center;width:34px;height:34px;border:3px solid white;border-radius:9999px;background:#3c6355;color:white;box-shadow:0 2px 8px rgba(23,24,23,.28);font-size:16px;">●</span>',
                iconSize: [34, 34],
                iconAnchor: [17, 17],
              }),
              title: business.businessName,
            })
            .addTo(map)
            .bindPopup(getPopupContent(business), { maxWidth: 260 });
        });

        if (points.length === 1) {
          map.setView(points[0], 13);
        } else if (points.length > 1) {
          map.fitBounds(leaflet.latLngBounds(points), { padding: [30, 30] });
        }
        window.setTimeout(() => map.invalidateSize(), 50);
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
  }, [businesses]);

  return (
    <section className="px-6 py-12 sm:px-10 sm:py-16 lg:px-[130px] 2xl:px-16">
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
            {businesses.length} matching {businesses.length === 1 ? "business" : "businesses"}
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
              Map positions use development coordinates for mock businesses.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d8d8d8] bg-[#faf9f6] px-6 py-14 text-center">
            <MapPin className="mx-auto size-9 text-[#3c6355]" />
            <h3 className="mt-3 text-lg font-semibold text-[#3c6355]">
              No businesses match these filters
            </h3>
            <p className="mt-2 text-sm text-[#777b78]">
              Try another city, search term, or service category to explore the map.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
