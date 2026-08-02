import { Card, Screen, SectionHeading } from '@/components/Screen';
import { BOOKINGS, COSTS, FERRY } from '@/data/trip';
import type { CostRow } from '@/data/trip';

const num = (n: number): string => n.toLocaleString('en-MY');
const myr = (n: number): string => `RM ${num(n)}`;
const myrRange = (low: number, high: number): string =>
  low === high ? myr(low) : `${myr(low)}–${num(high)}`;

function Row({ row }: { row: CostRow }): JSX.Element {
  return (
    <li className="rule-b px-gutter py-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className="min-w-0 tracking-[-0.01em]">{row.label}</span>
        <span className="numeric shrink-0 font-semibold">
          {myrRange(row.lowMYR, row.highMYR)}
        </span>
      </div>
      {row.note ? (
        <p className="mt-1 text-caption text-muted">{row.note}</p>
      ) : null}
    </li>
  );
}

export default function CostsPage(): JSX.Element {
  const onTheDayLow = COSTS.onTheDay.reduce((n, r) => n + r.lowMYR, 0);
  const onTheDayHigh = COSTS.onTheDay.reduce((n, r) => n + r.highMYR, 0);

  return (
    <Screen eyebrow="Reference" title="Costs">
      <SectionHeading>Booked and fixed</SectionHeading>
      <ul>
        {COSTS.booked.map((row) => (
          <Row key={row.label} row={row} />
        ))}
      </ul>
      <p className="numeric flex justify-between px-gutter pt-3 font-semibold">
        <span>Paid already</span>
        <span>{myr(COSTS.bookedTotalMYR)}</span>
      </p>

      <SectionHeading>Paid on the day</SectionHeading>
      <ul>
        {COSTS.onTheDay.map((row) => (
          <Row key={row.label} row={row} />
        ))}
      </ul>
      <p className="numeric flex justify-between px-gutter pt-3 font-semibold">
        <span>On the day</span>
        <span>{myrRange(onTheDayLow, onTheDayHigh)}</span>
      </p>

      <div className="mt-8 px-gutter">
        <Card className="p-5">
          <p className="eyebrow">Trip total, excluding shopping</p>
          {/* Two lines, because a range this wide will not fit on one at 390px
              and shrinking it would lose the signage weight. */}
          <p
            className="numeric mt-3 text-display font-bold leading-[0.95] tracking-[-0.035em]"
            style={{ color: 'var(--line-text)' }}
          >
            {myr(COSTS.totalLowMYR)}
            <span className="block text-[1.25rem] font-semibold text-muted">to</span>
            {myr(COSTS.totalHighMYR)}
          </p>
        </Card>
      </div>

      <SectionHeading>The bookings</SectionHeading>
      <ul>
        {BOOKINGS.map((b) => (
          <li key={b.hotel} className="rule-b px-gutter py-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-semibold tracking-[-0.01em]">{b.hotelName}</span>
              <span className="numeric shrink-0 font-semibold">{myr(b.priceMYR)}</span>
            </div>
            <p className="mt-1 text-caption text-muted">
              {b.nights} {b.nights === 1 ? 'night' : 'nights'} · {b.room}
            </p>
            {b.note ? <p className="mt-1 text-caption text-muted">{b.note}</p> : null}
          </li>
        ))}
        <li className="rule-b px-gutter py-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-semibold tracking-[-0.01em]">
              Ferry · {FERRY.operator}
            </span>
            <span className="numeric shrink-0 font-semibold">
              {myr(FERRY.returnFareMYR)}
            </span>
          </div>
          <p className="mt-1 text-caption text-muted">{FERRY.fareCovers}</p>
          <p className="mt-1 text-caption text-muted">
            Her fare is {myr(FERRY.infantFareMYR)} each way and is not included —
            buy it at the Puteri Harbour counter with her passport.
          </p>
        </li>
      </ul>
    </Screen>
  );
}
