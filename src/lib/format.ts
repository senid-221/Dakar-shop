export function fcfa(amount: number) {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount)).replace(/\u202f|\u00a0/g, " ")} FCFA`;
}

export function dateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function statusTone(status: string) {
  if (status === "delivered") return "success" as const;
  if (status === "cancelled") return "destructive" as const;
  return "pending" as const;
}
