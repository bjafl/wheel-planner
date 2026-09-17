import { useFloating, offset, shift, autoUpdate } from '@floating-ui/react';

export function ActivityTooltip({
  referenceEl,
  label,
  visible,
}: {
  referenceEl: Element | null;
  label: string;
  visible: boolean;
}) {
  const { refs, floatingStyles } = useFloating({
    open: visible,
    elements: { reference: referenceEl ?? undefined },
    middleware: [offset(8), shift()],
    whileElementsMounted: autoUpdate,
  });

  if (!visible) return null;

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, position: 'fixed', zIndex: 50 }}
      className="rounded bg-gray-900 px-2 py-1 text-xs text-white shadow"
    >
      {label}
    </div>
  );
}
