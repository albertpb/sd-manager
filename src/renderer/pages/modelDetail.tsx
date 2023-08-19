import { ModelInfo } from 'main/interfaces';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Image from 'renderer/components/Image';
import ModelTableDetail from 'renderer/components/ModelTableDetail';
import { RootState } from 'renderer/redux';

export default function ModelDetail() {
  const selectedModel = useSelector(
    (state: RootState) => state.global.selectedModel
  );
  const settings = useSelector((state: RootState) => state.global.settings);

  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  useEffect(() => {
    if (selectedModel.name !== null) {
      const load = async () => {
        if (selectedModel.type === 'checkpoint') {
          const modelData = await window.ipcHandler.readFile(
            `${settings.checkpointsPath}\\${selectedModel.name}.civitai.info`,
            'utf-8'
          );
          if (modelData) {
            setModelInfo(JSON.parse(modelData));
          }
        }
      };
      load();
    }
  }, [selectedModel, settings]);

  if (selectedModel.name !== null && modelInfo) {
    return (
      <main className="p-4 flex justify-center">
        <section className="w-4/6">
          <p className="text-2xl font-bold text-gray-300">{modelInfo.name}</p>
          <div className="flex w-full my-4">
            <div className="w-4/6">
              <Image
                src={`${settings.checkpointsPath}\\${selectedModel.name}.png`}
                alt={selectedModel.name}
              />
            </div>
            <div className="w-2/6 pl-4">
              <div className="overflow-x-auto">
                <ModelTableDetail modelInfo={modelInfo} />
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return null;
}
