import { ModelInfo } from 'main/interfaces';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import ModelTableDetail from 'renderer/components/ModelTableDetail';
import { RootState } from 'renderer/redux';
import Carousel from 'react-multi-carousel';
import Image from '../components/Image';

export default function ModelDetail() {
  const selectedModel = useSelector(
    (state: RootState) => state.global.selectedModel
  );
  const settings = useSelector((state: RootState) => state.global.settings);

  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [userImagesList, setUserImagesList] = useState<string[]>([]);
  const [modelImagesList, setModelImagesList] = useState<string[]>([]);

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

          const userImagesListsResponse = await window.ipcHandler.readdirImages(
            selectedModel.name
          );
          setUserImagesList(userImagesListsResponse);

          const modelImagesListResponse =
            await window.ipcHandler.readdirModelImages(selectedModel.name);
          setModelImagesList(modelImagesListResponse);
        }
      };
      load();
    }
  }, [selectedModel, settings]);

  if (selectedModel.name !== null && modelInfo) {
    const modelImages = modelImagesList.map((imgSrc, i) => {
      return (
        <div className="">
          <figure
            key={`model_detail_model_image_${i}`}
            className="card__figure rounded-md overflow-hidden"
            style={{
              width: '440px',
              height: '660px',
            }}
          >
            <Image
              src={imgSrc}
              alt={`model_detail_model_image_${i}`}
              height="100%"
              width="100%"
              className="object-cover"
            />
          </figure>
        </div>
      );
    });

    const userImages = userImagesList.map((imgSrc, i) => {
      return (
        <div className="mr-9 mb-9">
          <figure
            key={`model_detail_model_image_${i}`}
            className="card__figure rounded-md overflow-hidden"
            style={{
              width: '440px',
              height: '660px',
            }}
          >
            <Image
              src={imgSrc}
              alt={`model_detail_model_image_${i}`}
              height="100%"
              width="100%"
              className="object-cover"
            />
          </figure>
        </div>
      );
    });

    const responsive = {
      superLargeDesktop: {
        // the naming can be any, depends on you.
        breakpoint: { max: 4000, min: 3000 },
        items: 2,
      },
      desktop: {
        breakpoint: { max: 3000, min: 1024 },
        items: 2,
      },
      tablet: {
        breakpoint: { max: 1024, min: 464 },
        items: 2,
      },
      mobile: {
        breakpoint: { max: 464, min: 0 },
        items: 1,
      },
    };

    return (
      <main className="p-4 flex justify-center">
        <section className="w-5/6">
          <div>
            <p className="text-2xl font-bold text-gray-300">
              {modelInfo.model.name}
            </p>
            <div className="flex w-full my-4">
              <div className="w-4/6">
                <Carousel responsive={responsive}>{modelImages}</Carousel>
              </div>
              <div className="w-2/6 pl-4">
                <div className="overflow-x-auto">
                  <ModelTableDetail modelInfo={modelInfo} />
                </div>
              </div>
            </div>
          </div>
          <hr className="mt-12 border-base-200" />
          <div className="mt-12">
            <h3 className="text-xl font-bold text-center">Generated Images</h3>
            <div className="flex flex-row flex-wrap mt-12">{userImages}</div>
          </div>
        </section>
      </main>
    );
  }

  return null;
}
