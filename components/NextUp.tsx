import { Card } from '@/components/Screen';

/** An honest placeholder. It says which build step fills it in. */
export function NextUp({ step, children }: { step: string; children: string }): JSX.Element {
  return (
    <div className="px-gutter">
      <Card className="p-5">
        <p className="eyebrow">{step}</p>
        <p className="mt-2 leading-relaxed text-muted">{children}</p>
      </Card>
    </div>
  );
}
