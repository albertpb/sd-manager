import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.scss';

import { ReduxProvider } from './redux/provider';
import MainLayout from './layouts/Main.layout';
import Settings from './pages/settings';
import SettingsLoader from './redux/settings-loader';
import ModelsLoader from './redux/models-loader';
import Checkpoints from './pages/checkpoints';
import ModelDetail from './pages/modelDetail';
import ImagesLoader from './redux/images-loader';
import Testing from './pages/test';
import ImageDetail from './pages/imageDetail';
import AspectRatioHelper from './pages/aspectRatioHelper';
import Notificator from './redux/notification';
import Loras from './pages/loras';
import Images from './pages/images';
import ImageMetadata from './pages/imageMetadata';

export default function App() {
  return (
    <ReduxProvider>
      <Router>
        <Notificator>
          <SettingsLoader>
            <ModelsLoader>
              <ImagesLoader>
                <Routes>
                  <Route path="/" element={<MainLayout />}>
                    <Route index element={<Checkpoints />} />
                    <Route
                      path="/model-detail/:hash"
                      element={<ModelDetail />}
                    />
                    <Route
                      path="/image-detail/:hash"
                      element={<ImageDetail />}
                    />
                    <Route path="/loras" element={<Loras />} />
                    <Route path="/images" element={<Images />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/ar-helper" element={<AspectRatioHelper />} />
                    <Route path="/image-metadata" element={<ImageMetadata />} />
                    <Route path="/testing" element={<Testing />} />
                  </Route>
                </Routes>
              </ImagesLoader>
            </ModelsLoader>
          </SettingsLoader>
        </Notificator>
      </Router>
    </ReduxProvider>
  );
}
