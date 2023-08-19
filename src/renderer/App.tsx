import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.scss';

import MainLayout from './layouts/Main.layout';
import { ReduxProvider } from './redux/provider';
import Settings from './pages/settings';
import SettingsLoader from './redux/settings-loader';
import ModelsLoader from './redux/models-loader';
import Checkpoints from './pages/checkpoints';
import ModelDetail from './pages/modelDetail';
import ImagesLoader from './redux/images-loader';

export default function App() {
  return (
    <ReduxProvider>
      <Router>
        <SettingsLoader>
          <ModelsLoader>
            <ImagesLoader>
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Checkpoints />} />
                  <Route path="/model-detail" element={<ModelDetail />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Routes>
            </ImagesLoader>
          </ModelsLoader>
        </SettingsLoader>
      </Router>
    </ReduxProvider>
  );
}
