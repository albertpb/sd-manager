import { Provider } from 'jotai';
import { DevTools } from 'jotai-devtools';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { store } from './state/index';
import './App.scss';

import MainLayout from './layouts/Main.layout';
import Settings from './pages/settings';
import Notificator from './hocs/notification';
import SettingsLoader from './hocs/settings-loader';
import ModelsLoader from './hocs/models-loader';
import ModelDetail from './pages/modelDetail';
import ImagesLoader from './hocs/images-loader';
import ImageDetail from './pages/imageDetail';
import AspectRatioHelper from './pages/aspectRatioHelper';
import Images from './pages/images';
import ImageMetadata from './pages/imageMetadata';
import Loras from './pages/loras';
import Checkpoints from './pages/checkpoints';
import TestPage from './pages/testing';

export default function App() {
  return (
    <Provider store={store}>
      <DevTools store={store} />
      <Router>
        <Notificator>
          <SettingsLoader>
            <ModelsLoader>
              <ImagesLoader>
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path="/" element={<MainLayout />}>
                      <Route index element={<Images />} />
                      <Route path="checkpoints" element={<Checkpoints />} />
                      <Route
                        path="/model-detail/:hash"
                        element={<ModelDetail />}
                      />
                      <Route
                        path="/image-detail/:hash"
                        element={<ImageDetail />}
                      />
                      <Route path="/loras" element={<Loras />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route
                        path="/ar-helper"
                        element={<AspectRatioHelper />}
                      />
                      <Route
                        path="/image-metadata"
                        element={<ImageMetadata />}
                      />
                      <Route path="/test" element={<TestPage />} />
                    </Route>
                  </Routes>
                </AnimatePresence>
              </ImagesLoader>
            </ModelsLoader>
          </SettingsLoader>
        </Notificator>
      </Router>
    </Provider>
  );
}
