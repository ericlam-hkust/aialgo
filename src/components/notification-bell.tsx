import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: 60_000,
  });

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = query.data?.unread ?? 0;
  const items = query.data?.items ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unread} unread)`}>
          <Bell className="h-4 w-4" aria-hidden />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          <Button variant="ghost" size="sm" onClick={() => readAll.mutate()} disabled={unread === 0}>
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">You are all caught up.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id} className={cn("px-3 py-2.5", !n.read_at && "bg-accent/40")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                      <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="px-1 py-0 text-[10px]">
                          {n.kind.replace(/_/g, " ")}
                        </Badge>
                        {fmtDate(n.created_at)}
                      </p>
                      {n.link ? (
                        <a
                          href={n.link}
                          className="mt-1 inline-block text-xs text-primary hover:underline"
                          onClick={() => !n.read_at && readOne.mutate(n.id)}
                        >
                          View
                        </a>
                      ) : null}
                    </div>
                    {!n.read_at ? (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => readOne.mutate(n.id)}>
                        Read
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
