import { notFound } from 'next/navigation';
import { DayScreen } from '@/components/screens/DayScreen';
import { DAYS, type DayId } from '@/data/trip';

export function generateStaticParams(): { id: string }[] {
  return DAYS.map((d) => ({ id: String(d.id) }));
}

export default function DayPage({ params }: { params: { id: string } }): JSX.Element {
  const id = Number(params.id) as DayId;
  if (!DAYS.some((d) => d.id === id)) notFound();
  return <DayScreen day={id} />;
}
