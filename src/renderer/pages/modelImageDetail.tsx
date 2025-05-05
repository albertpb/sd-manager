import { useAtom } from 'jotai';
import { ImageMetaData, ModelInfoImage } from 'main/interfaces';
import { Model } from 'main/ipc/model';
import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ImageMegadata from 'renderer/components/ImageMetadata';
import ImageZoom from 'renderer/components/ImageZoom';
import { OsContext } from 'renderer/hocs/detect-os';
import { checkpointsAtom, lorasAtom } from 'renderer/state/models.store';
import { convertPath } from 'renderer/utils';

export default function ModelImageDetail() {
  const os = useContext(OsContext);

  const navigate = useNavigate();
  const navigatorParams = useParams();
  const { index, hash } = navigatorParams;

  const [model, setModel] = useState<Model | undefined>();
  const [metadata, setMetadata] = useState<ImageMetaData | null>(null);
  const [imagePath, setImagePath] = useState<string>('');
  const [loras] = useAtom(lorasAtom);
  const [checkpoints] = useAtom(checkpointsAtom);

  useEffect(() => {
    const load = async () => {
      let tempModel: Model | undefined;
      if (hash) {
        tempModel = loras.models[hash];
        if (!tempModel) {
          tempModel = checkpoints.models[hash];
        }
        if (!tempModel) {
          navigate(-1);
        }

        setModel(tempModel);
      }

      if (tempModel) {
        const lastBackslashIndex = tempModel.path.lastIndexOf('\\');

        if (lastBackslashIndex !== -1) {
          try {
            const path = tempModel.path.substring(0, lastBackslashIndex);
            const fullPath = convertPath(
              `${path}\\${tempModel.fileName}\\${tempModel.fileName}_${index}`,
              os,
            );
            const metaString = await window.ipcHandler.readFile(
              `${fullPath}.json`,
              'utf-8',
            );
            const meta: ModelInfoImage = JSON.parse(metaString);
            setImagePath(`${fullPath}.png`);
            setMetadata({
              model: `${model?.name} ${model?.baseModel}`,
              cfg: `${meta.meta.cfgScale}`,
              generatedBy: '',
              positivePrompt: meta.meta.prompt,
              negativePrompt: meta.meta.negativePrompt,
              sampler: meta.meta.sampler,
              scheduler: meta.meta.sampler,
              seed: `${meta.meta.seed}`,
              steps: `${meta.meta.steps}`,
            });
          } catch (error) {
            console.log(error);
          }
        }
      }
    };

    load();
  }, [model, index, checkpoints.models, loras.models, hash, navigate, os]);

  return (
    <div className="flex min-h-full w-full px-4 pb-4 pt-10 justify-center relative">
      <section className="w-5/6">
        <div className="flex flex-col justify-center">
          <Link to=".." className="text-2xl font-bold text-gray-300">
            {model?.name} {model?.baseModel}
          </Link>
          <div className="flex flex-row w-full my-4 pr-4">
            <div className="flex w-1/3">
              <ImageZoom
                src={imagePath}
                alt={`${metadata?.seed}`}
                className="w-full"
                imgClassName="object-cover w-full"
              />
            </div>
            <div className="w-2/3 pl-4">
              <ImageMegadata metadata={metadata} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
