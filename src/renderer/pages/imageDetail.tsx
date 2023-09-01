import MDEditor from '@uiw/react-md-editor';
import classNames from 'classnames';
import { ImageMetaData } from 'main/exif';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import ImageMegadata from 'renderer/components/ImageMetadata';
import Rating from 'renderer/components/Rating';
import UpDownButton from 'renderer/components/UpDownButton';
import { RootState } from 'renderer/redux';
import { getFilenameNoExt, saveMdDebounced } from 'renderer/utils';

type ImageJson = {
  rating: number;
};

export default function ImageDetail() {
  const navigate = useNavigate();
  const navigatorParams = useParams();
  const selectedModel = navigatorParams.model;
  const fileBaseName = navigatorParams.baseName;
  const settings = useSelector((state: RootState) => state.global.settings);

  const [imageData, setImageData] = useState<string>('');
  const [imagePath, setImagePath] = useState('');
  const [exifParams, setExifParams] = useState<Record<string, any> | null>(
    null
  );
  const [imageMetadata, setImageMetadata] = useState<ImageMetaData | null>(
    null
  );
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [markdownText, setMarkdownText] = useState<string | undefined>('');
  const [jsonData, setJsonData] = useState<ImageJson>({
    rating: 0,
  });

  useEffect(() => {
    if (!fileBaseName || !selectedModel) return;

    const load = async () => {
      const modelPath = `${settings.imagesDestPath}\\${selectedModel}`;
      const filePath = `${modelPath}\\${fileBaseName}`;
      const fileNameNoExt = `${getFilenameNoExt(fileBaseName)}`;
      const folderPath = `${modelPath}\\${fileNameNoExt}`;
      setImagePath(filePath);
      const {
        base64,
        exif,
        metadata,
      }: {
        base64: string;
        exif: Record<string, any>;
        metadata: ImageMetaData | null;
      } = await window.ipcHandler.readImage(filePath);
      setImageData(base64);
      setExifParams(exif);
      setImageMetadata(metadata);

      const fileMdText = await window.ipcHandler.readFile(
        `${folderPath}\\markdown.md`,
        'utf-8'
      );
      if (fileMdText) {
        setMarkdownText(fileMdText);
      }

      const fileJson = await window.ipcHandler.readFile(
        `${modelPath}\\data.json`,
        'utf-8'
      );
      if (fileJson) {
        const data = JSON.parse(fileJson);
        if (data[fileNameNoExt]) {
          setJsonData(data[fileNameNoExt]);
        }
      }
    };
    load();
  }, [
    fileBaseName,
    selectedModel,
    settings.imagesPath,
    settings.imagesDestPath,
  ]);

  const goBack = useCallback(() => {
    navigate(`/model-detail/checkpoint/${selectedModel}`);
  }, [navigate, selectedModel]);

  const onMDChangeText = (value: string | undefined) => {
    setMarkdownText(value);
    if (typeof value !== 'undefined') {
      saveMdDebounced(selectedModel, fileBaseName, value);
    }
  };

  const onImagePasted = async (dataTransfer: DataTransfer) => {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i].path;
      const copiedFilePath: string = await window.ipcHandler.fileAttach(
        selectedModel,
        fileBaseName,
        file
      );
      onMDChangeText(`${markdownText} \n ![](sd:///${copiedFilePath}) \n`);
    }
  };

  const revealInFolder = () => {
    window.ipcHandler.openFolderLink(imagePath);
  };

  const onRatingChange = async (value: number) => {
    setJsonData({
      ...jsonData,
      rating: value,
    });
    await window.ipcHandler.saveImageJson(selectedModel, fileBaseName, {
      ...jsonData,
      rating: value,
    });
  };

  if (!fileBaseName || !selectedModel) return null;

  return (
    <div className="p-4 flex justify-center relative h-full">
      <section className="w-5/6">
        <div>
          <div className="flex flex-row items-center">
            <p className="text-2xl font-bold text-gray-300">{selectedModel}</p>
            <span className="ml-4">
              <Rating
                value={jsonData.rating}
                onClick={(value) => onRatingChange(value)}
              />
            </span>
          </div>
          <button
            type="button"
            className="text-1xl text-gray-300"
            onClick={() => revealInFolder()}
          >
            {fileBaseName}
          </button>
        </div>
        <div className="flex w-full my-4">
          <img
            src={`data:image/png;base64,${imageData}`}
            alt={fileBaseName}
            onClick={() => revealInFolder()}
            aria-hidden
            className="cursor-pointer"
          />
        </div>
        <div className="w-full mt-6 pt-5 pb-10 relative">
          <div className="absolute top-0 right-0 z-40">
            <UpDownButton
              onClick={(up) => setShowDetails(up)}
              up={showDetails}
            />
          </div>
          <div
            className={classNames('courtain', {
              'courtain-hidden': showDetails,
            })}
          >
            <ImageMegadata metadata={imageMetadata} />
          </div>
        </div>
        <div className="mt-4 pb-10" data-color-mode="dark">
          <MDEditor
            height={480}
            value={markdownText}
            onChange={(value) => onMDChangeText(value)}
            onPaste={(event) => onImagePasted(event.clipboardData)}
            onDrop={(event) => onImagePasted(event.dataTransfer)}
            onBlur={() => onMDChangeText(markdownText)}
          />
        </div>
      </section>
      <div className="absolute top-10 right-10">
        <button
          className="btn btn-circle"
          type="button"
          onClick={() => goBack()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
