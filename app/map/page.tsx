import { Screen } from '@/components/Screen';
import { NextUp } from '@/components/NextUp';
import { MAP_PLACES, PLACES } from '@/data/trip';

export default function MapPage(): JSX.Element {
  const folded = PLACES.length - MAP_PLACES.length;

  return (
    <Screen eyebrow="All five lines" title="Map">
      <NextUp step="Build step 6">
        {`A real MapLibre map with a free raster style, ${MAP_PLACES.length} category-coloured pins, live position and filters by line and category. The data is ready: ${PLACES.length} places, ${folded} of them folded into the mall they sit inside so there are no stacked pins.`}
      </NextUp>
    </Screen>
  );
}
