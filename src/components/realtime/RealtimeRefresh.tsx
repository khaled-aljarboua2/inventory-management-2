"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  table: "transfer_requests" | "transfer_items" | "notifications";
  filter?: string;
  channelName?: string;
};

export default function RealtimeRefresh({
  table,
  filter,
  channelName,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(
        channelName ??
          `realtime-refresh-${table}-${filter ?? "all"}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    router,
    table,
    filter,
    channelName,
  ]);

  return null;
}
