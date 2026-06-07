import { AdminPanel } from "@/components/AdminPanel";
import { Nav } from "@/components/Nav";

export default function AdminPage() {
  return (
    <main className="shell">
      <Nav />
      <AdminPanel />
    </main>
  );
}
