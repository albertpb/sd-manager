import { Outlet } from 'react-router-dom';
import Navbar from 'renderer/components/Navbar';

export default function MainLayout() {
  return (
    <main>
      <Navbar />
      <section className="m-6">
        <Outlet />
      </section>
    </main>
  );
}
