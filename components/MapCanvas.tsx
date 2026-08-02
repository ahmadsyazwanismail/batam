'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { lineById, MAP_PLACES, type Category, type LineId, type Place } from '@/data/trip';
import { MAP_BOUNDS, MAP_STYLE } from '@/lib/mapStyle';
import type { LatLon } from '@/lib/geo';

/**
 * The real map.
 *
 * Pins are drawn in the **line** colour with the **category** glyph inside.
 * The brief asked for category-coloured pins, but §7 is explicit that line
 * colour always encodes which day something belongs to and is never
 * decorative — colouring by category on one screen would quietly break that.
 * The glyph carries the category instead, which is what the colour was for.
 */
export function MapCanvas({
  selectedLines,
  selectedCategories,
  you,
  accuracy,
  onSelect,
  focus,
}: {
  selectedLines: ReadonlySet<LineId>;
  selectedCategories: ReadonlySet<Category>;
  you: LatLon | null;
  accuracy: number | null;
  onSelect: (key: string) => void;
  /** Recentre on this place when it changes. */
  focus: string | null;
}): JSX.Element {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Map<string, { marker: Marker; element: HTMLElement }>>(
    new Map(),
  );
  const youMarker = useRef<Marker | null>(null);

  // --- create once --------------------------------------------------------
  useEffect(() => {
    if (!container.current || map.current) return;

    const instance = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE,
      bounds: MAP_BOUNDS,
      fitBoundsOptions: { padding: 36 },
      attributionControl: { compact: true },
      // A toddler will touch this. Rotation only confuses.
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: true,
    });
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.current = instance;

    const created = markers.current;
    for (const place of MAP_PLACES) {
      const element = buildPin(place);
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect(place.key);
      });
      const marker = new maplibregl.Marker({ element, anchor: 'bottom' })
        .setLngLat([place.lon, place.lat])
        .addTo(instance);
      // MapLibre stamps every custom marker with aria-label="Map marker",
      // which would leave 33 identically named buttons on the screen. Put the
      // real name back after it has had its way.
      element.setAttribute('aria-label', `${place.name}, line ${place.line}`);
      created.set(place.key, { marker, element });
    }

    return () => {
      created.forEach(({ marker }) => marker.remove());
      created.clear();
      youMarker.current?.remove();
      youMarker.current = null;
      instance.remove();
      map.current = null;
    };
  }, [onSelect]);

  // --- filters: fade, never remove ---------------------------------------
  useEffect(() => {
    for (const place of MAP_PLACES) {
      const entry = markers.current.get(place.key);
      if (!entry) continue;

      const onLine = selectedLines.size === 0 || selectedLines.has(place.line);
      const inCategory =
        selectedCategories.size === 0 || selectedCategories.has(place.category);
      const dimmed = !onLine || !inCategory;

      entry.element.style.opacity = dimmed ? '0.15' : '1';
      entry.element.style.pointerEvents = dimmed ? 'none' : 'auto';
      entry.element.style.zIndex = dimmed ? '0' : '1';
    }
  }, [selectedLines, selectedCategories]);

  // --- you ----------------------------------------------------------------
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    if (!you) {
      youMarker.current?.remove();
      youMarker.current = null;
      return;
    }

    if (!youMarker.current) {
      youMarker.current = new maplibregl.Marker({ element: buildYou() })
        .setLngLat([you.lon, you.lat])
        .addTo(instance);
    } else {
      youMarker.current.setLngLat([you.lon, you.lat]);
    }

    const halo = youMarker.current.getElement().querySelector<HTMLElement>('[data-halo]');
    if (halo && accuracy !== null) {
      // Scale the accuracy halo to real metres at this latitude and zoom.
      const metresPerPixel =
        (156543.03392 * Math.cos((you.lat * Math.PI) / 180)) /
        Math.pow(2, instance.getZoom());
      const px = Math.min(180, Math.max(18, (accuracy / metresPerPixel) * 2));
      halo.style.width = `${px}px`;
      halo.style.height = `${px}px`;
    }
  }, [you, accuracy]);

  // --- focus --------------------------------------------------------------
  useEffect(() => {
    if (!focus || !map.current) return;
    const place = MAP_PLACES.find((p) => p.key === focus);
    if (!place) return;
    map.current.easeTo({
      center: [place.lon, place.lat],
      zoom: Math.max(map.current.getZoom(), 14.5),
      duration: 550,
    });
  }, [focus]);

  return (
    <div
      ref={container}
      className="h-full w-full"
      role="application"
      aria-label="Map of every station. The list on the Places screen carries the same information."
    />
  );
}

function buildPin(place: Place): HTMLElement {
  const { colour, onColour } = lineById(place.line);
  const el = document.createElement('button');
  el.type = 'button';
  el.setAttribute('aria-label', `${place.name}, line ${place.line}`);
  // The pin is drawn at 30×38 but the button is 44×44, with the extra as
  // transparent margin above and beside it. Nothing in this app is under 44px,
  // and a bigger visible pin would just collide with its neighbours. Anchoring
  // to the bottom keeps the tip on the coordinate.
  el.style.cssText = [
    'width:44px',
    'height:44px',
    'padding:0',
    'border:0',
    'background:transparent',
    'cursor:pointer',
    'transition:opacity 200ms',
    'display:flex',
    'align-items:flex-end',
    'justify-content:center',
  ].join(';');

  el.innerHTML = `
    <svg width="30" height="38" viewBox="0 0 30 38" aria-hidden="true">
      <path d="M15 37.2 4.6 21.8A12.6 12.6 0 1 1 25.4 21.8Z" fill="${colour}"/>
      <g stroke="${onColour}" stroke-width="1.7" fill="none"
         transform="translate(5.5 4.5) scale(0.95)">
        ${GLYPH[place.category]}
      </g>
    </svg>`;
  return el;
}

function buildYou(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'position:relative;width:18px;height:18px';
  el.innerHTML = `
    <span data-halo style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      background:#16181C22;border:1px solid #16181C44;border-radius:9999px;width:40px;height:40px"></span>
    <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:16px;height:16px;border-radius:9999px;background:#16181C;
      box-shadow:0 0 0 3px #FBFAF6"></span>`;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

/** Same 20-unit grid as CategoryIcon, inlined because these live in raw SVG. */
const GLYPH: Record<Category, string> = {
  hotel: '<path d="M3 16V6M3 10h9a4 4 0 0 1 4 4v2M3 16h14"/><circle cx="6.4" cy="7.4" r="1.3"/>',
  ferry:
    '<path d="M3 13.5c1.4 0 1.4 1.4 2.8 1.4s1.4-1.4 2.8-1.4 1.4 1.4 2.8 1.4 1.4-1.4 2.8-1.4 1.4 1.4 2.8 1.4"/><path d="M4.5 11 6 6h8l1.5 5M10 6V3.5"/>',
  land: '<path d="M2 15h16M4 15V9l6-4 6 4v6"/><path d="M8.2 15v-3.4h3.6V15"/>',
  beach:
    '<path d="M2 15.5c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"/><circle cx="14" cy="5.5" r="2.6"/><path d="M3 13 9.5 6.5"/>',
  food: '<path d="M5.5 3v6.5a2 2 0 0 0 4 0V3M7.5 9.5V17"/><path d="M14 17V3c-1.6.9-2.4 2.6-2.4 4.6S12.4 11 14 11"/>',
  shop: '<path d="M4 7h12l-1 10H5L4 7Z"/><path d="M7.4 7V5.4a2.6 2.6 0 0 1 5.2 0V7"/>',
  spa: '<path d="M10 17c0-4 2.6-7.5 6.5-8.4C16.5 12.6 14 17 10 17Z"/><path d="M10 17c0-4-2.6-7.5-6.5-8.4C3.5 12.6 6 17 10 17Z"/>',
  dino: '<path d="M4 16c0-4 2-7 5-8 0-2.5 1.8-4 4-4 1.6 0 2.6.8 3 1.6L14 6.6"/><path d="M9 8c-2.5 1.5-3.5 4-3.5 8M12.5 12c1 1.5 1.4 2.8 1.4 4"/>',
};
