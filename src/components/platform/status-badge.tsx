import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const destructive = [
    "Cancelled",
    "Failed",
    "Refunded",
    "Declined",
    "Disputed",
    "Urgent",
  ].includes(status);
  const complete = [
    "Completed",
    "Paid",
    "Deposit Paid",
    "Approved",
    "Resolved",
    "Accepted",
  ].includes(status);

  return (
    <Badge
      variant={destructive ? "destructive" : complete ? "default" : "secondary"}
      className="w-fit"
    >
      {status}
    </Badge>
  );
}
