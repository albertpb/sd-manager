import { Outlet } from 'react-router-dom';
import Navbar from 'renderer/components/Navbar';

export default function MainLayout() {
  return (
    <main>
      <Navbar />
      <section
        className="mx-0"
        style={{ height: 'calc( 100dvh - 68px)', marginTop: '68px' }}
      >
        <Outlet />
      </section>
    </main>
  );
}
