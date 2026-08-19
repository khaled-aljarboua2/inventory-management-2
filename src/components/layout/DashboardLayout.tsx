import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getCurrentUserProfile } from "@/lib/permissions";

type Props = {
  children: React.ReactNode;
};

export default async function DashboardLayout({
  children,
}: Props) {
  const profile =
    await getCurrentUserProfile();

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
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