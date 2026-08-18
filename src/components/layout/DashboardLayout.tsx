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
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Topbar profile={profile} />

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}