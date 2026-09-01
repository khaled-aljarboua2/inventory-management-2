import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import GlobalSearchBridge from "./GlobalSearchBridge";
import {
  getCurrentUserContext,
} from "@/lib/permissions";
import { redirect } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

export default async function DashboardLayout({
  children,
}: Props) {
  const {
    profile,
    permissions,
  } = await getCurrentUserContext();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.is_active) {
    redirect("/login?error=account_disabled");
  }

  const locationName = profile.locations?.name?.trim() ?? "";
  const topbarProfile = locationName
    ? {
        ...profile,
        roles: profile.roles
          ? {
              ...profile.roles,
              name: `${profile.roles.name} · ${locationName}`,
            }
          : {
              id: "location-only",
              name: locationName,
              description: null,
            },
      }
    : profile;

  return (
    <div className="relative min-h-screen bg-background">
      <input
        id="mobile-sidebar-toggle"
        type="checkbox"
        className="peer sr-only"
      />

      <Sidebar
        permissions={permissions}
      />

      <div className="flex min-h-screen min-w-0 flex-col md:mr-64">
        <Topbar
          profile={topbarProfile}
        />

        <GlobalSearchBridge />

        <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
