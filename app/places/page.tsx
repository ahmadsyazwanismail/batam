import { Screen } from '@/components/Screen';
import { NextUp } from '@/components/NextUp';
import { PLACES } from '@/data/trip';

export default function PlacesPage(): JSX.Element {
  return (
    <Screen eyebrow="Every station" title="Places">
      <NextUp step="Build steps 4 and 5">
        {`A searchable, filterable index of all ${PLACES.length} places, each row showing its distance from you — or from that day's hotel when location is off or you are not in Batam yet. Search already resolves mall tenants: "Renuin" finds Nagoya Hill.`}
      </NextUp>
    </Screen>
  );
}
