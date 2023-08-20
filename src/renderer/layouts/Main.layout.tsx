import { Outlet } from 'react-router-dom';
import Navbar from 'renderer/components/Navbar';

export default function MainLayout() {
  return (
    <main>
      <Navbar />
      <section className="mx-20 mt-32">
        <Outlet />
      </section>
    </main>
  );
}
