import type { StyleSpecification } from 'maplibre-gl';

/**
 * A free raster style, declared inline.
 *
 * Not Google Maps — that needs a billed key. Not a vector style either: vector
 * tiles need a glyph and sprite endpoint, which is a second and third thing to
 * be offline for. Raster tiles are one request each, they cache in the service
 * worker like any other image, and a tile that never arrives leaves a gap
 * rather than breaking the map.
 */

const CARTO_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>';

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: CARTO_ATTRIBUTION,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      // Paper, so an unloaded tile reads as part of the app rather than a hole.
      paint: { 'background-color': '#F4F3EE' },
    },
    {
      id: 'carto',
      type: 'raster',
      source: 'carto',
      paint: { 'raster-saturation': -0.35, 'raster-contrast': -0.05 },
    },
  ],
};

/** Batam, framed so all 33 pins fit on a 390px screen. */
export const MAP_BOUNDS: [[number, number], [number, number]] = [
  [103.94, 0.95],
  [104.09, 1.19],
];
