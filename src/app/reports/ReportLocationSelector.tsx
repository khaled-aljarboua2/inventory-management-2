"use client";

import { MapPin } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type Location = {
  id: string;
  name: string;
  code: string;
};

export default function ReportLocationSelector({
  locations,
  selectedLocationId,
  canChooseLocation,
}: {
  locations: Location[];
  selectedLocationId: string;
  canChooseLocation: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectLocation(locationId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("location", locationId);
    router.replace(`/reports?${params.toString()}`, { scroll: false });
  }

  return (
    <label className="flex min-w-0 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
      <MapPin size={15} className="shrink-0" />
      <span className="shrink-0">فرع التقرير</span>
      <select
        aria-label="فرع التقرير"
        value={selectedLocationId}
        onChange={(event) => selectLocation(event.target.value)}
        disabled={!canChooseLocation}
        className="min-w-0 flex-1 bg-transparent font-semibold text-slate-700 outline-none disabled:cursor-default"
      >
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name} ({location.code})
          </option>
        ))}
      </select>
    </label>
  );
}
