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

/**
 * CARTO ships a matching dark basemap, so the map follows the theme rather
 * than being a rectangle of daylight in the middle of a dark app. Both sets
 * cache in the same service-worker tile store, which is capped, so switching
 * theme costs downloads once and nothing after.
 */
function style(variant: 'light_all' | 'dark_all', backdrop: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      carto: {
        type: 'raster',
        tiles: ['a', 'b', 'c'].map(
          (host) => `https://${host}.basemaps.cartocdn.com/rastertiles/${variant}/{z}/{x}/{y}@2x.png`,
        ),
        tileSize: 256,
        maxzoom: 19,
        attribution: CARTO_ATTRIBUTION,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        // The app's own ground, so an unloaded tile reads as part of the page
        // rather than as a hole in it.
        paint: { 'background-color': backdrop },
      },
      {
        id: 'carto',
        type: 'raster',
        source: 'carto',
        paint: { 'raster-saturation': -0.35, 'raster-contrast': -0.05 },
      },
    ],
  };
}

export const MAP_STYLE = style('light_all', '#F6F4EF');
export const MAP_STYLE_DARK = style('dark_all', '#0F1613');

export function mapStyle(dark: boolean): StyleSpecification {
  return dark ? MAP_STYLE_DARK : MAP_STYLE;
}

/** Batam, framed so all 33 pins fit on a 390px screen. */
export const MAP_BOUNDS: [[number, number], [number, number]] = [
  [103.94, 0.95],
  [104.09, 1.19],
];
