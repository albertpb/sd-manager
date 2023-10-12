import { Outlet } from 'react-router-dom';
import Navbar from 'renderer/components/Navbar';

export default function MainLayout() {
  return (
    <main>
      <Navbar />
      <section
        className="mx-0"
        style={{ height: 'calc( 100dvh - 72px)', marginTop: '72px' }}
      >
        <Outlet />
      </section>
    </main>
  );
}
