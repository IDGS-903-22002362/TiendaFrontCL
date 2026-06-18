import type { Orden, OrderStatusHistoryEntry } from "@/lib/types";
import {
  getShippingStatusLabel,
  PREPARATION_STATUS_LABEL,
} from "@/lib/orders/status";

type TimelineItem = {
  label: string;
  date?: string;
  note?: string;
  isFinal?: boolean;
};

function formatDateTime(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeHistoryEntry(entry: OrderStatusHistoryEntry): string {
  const to = entry.to || "";
  if (entry.type === "fulfillment_status_change") {
    return PREPARATION_STATUS_LABEL[to.toUpperCase()] ?? getShippingStatusLabel(to);
  }

  return getShippingStatusLabel(to);
}

function isFinalDeliveryEvent(label: string) {
  return label === "Entregado" || label === "Recogido";
}

/**
 * Linea de tiempo del pedido.
 *
 * Cada item dibuja su propio conector vertical; el ultimo evento no dibuja
 * continuacion, por eso la linea termina exactamente en el estado final.
 */
export function OrderTimeline({ order }: { order: Orden }) {
  const items: TimelineItem[] = [];

  items.push({ label: "Pedido creado", date: order.createdAt });

  const paid = String(order.paymentStatus || "").toUpperCase() === "PAGADO";
  if (paid || order.estado === "CONFIRMADA" || order.estado === "ENTREGADA") {
    items.push({ label: "Pago confirmado" });
  }

  const history = Array.isArray(order.shippingHistory)
    ? [...order.shippingHistory].sort((a, b) => {
        const first = new Date(a.changedAt ?? 0).getTime();
        const second = new Date(b.changedAt ?? 0).getTime();
        if (first !== second) return first - second;

        // Orden logico cuando dos eventos llegan con el mismo timestamp.
        const priority: Record<string, number> = {
          DELIVERED_TO_CARRIER: 10,
          IN_TRANSIT: 20,
          DELIVERED: 30,
          PICKED_UP: 30,
        };
        return (priority[a.to ?? ""] ?? 0) - (priority[b.to ?? ""] ?? 0);
      })
    : [];

  for (const entry of history) {
    const label = describeHistoryEntry(entry);
    items.push({
      label,
      date: entry.changedAt,
      note: entry.note,
      isFinal: isFinalDeliveryEvent(label),
    });
  }

  const lastItem = items[items.length - 1];
  if (lastItem) {
    lastItem.isFinal = lastItem.isFinal || isFinalDeliveryEvent(lastItem.label);
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aun no hay eventos registrados para este pedido.
      </p>
    );
  }

  return (
    <ol className="space-y-0">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const formattedDate = formatDateTime(item.date);

        return (
          <li key={`${item.label}-${index}`} className="grid grid-cols-[1.75rem_1fr] gap-3">
            <div className="relative flex justify-center">
              <span
                className={
                  item.isFinal
                    ? "mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary"
                    : "mt-1 h-3.5 w-3.5 rounded-[0.25rem] border-2 border-primary bg-card"
                }
                aria-hidden="true"
              >
                {item.isFinal ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                ) : null}
              </span>

              {!isLast ? (
                <span
                  className="absolute top-5 h-[calc(100%-0.25rem)] w-px bg-border"
                  aria-hidden="true"
                />
              ) : null}
            </div>

            <div className={isLast ? "pb-0" : "pb-5"}>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              {formattedDate ? (
                <p className="text-xs text-muted-foreground">{formattedDate}</p>
              ) : null}
              {item.note ? (
                <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
