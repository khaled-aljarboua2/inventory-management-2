import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getCurrentUserProfile } from "@/lib/permissions";
import { redirect } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

export default async function DashboardLayout({
  children,
}: Props) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.is_active) {
    redirect("/login?error=account_disabled");
  }

  return (
    <div className="relative flex min-h-screen bg-background">
      <input
        id="mobile-sidebar-toggle"
        type="checkbox"
        className="peer sr-only"
      />

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} />

        <main className="min-w-0 p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}