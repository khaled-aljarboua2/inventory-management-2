import Sidebar from "./Sidebar";
import Topbar from "./Topbar";



type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen bg-slate-100">

      <Sidebar />

      <div className="flex-1 flex flex-col">

        <Topbar />

        <main className="p-6">
          {children}
        </main>

      </div>

    </div>
  );
}
