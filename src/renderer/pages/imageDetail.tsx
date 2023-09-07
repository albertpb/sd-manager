import MDEditor from '@uiw/react-md-editor';
import classNames from 'classnames';
import { ImageMetaData } from 'main/exif';
import { ImageRow } from 'main/ipc/organizeImages';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ExifJson from 'renderer/components/Exif';
import ImageMegadata from 'renderer/components/ImageMetadata';
import Rating from 'renderer/components/Rating';
import UpDownButton from 'renderer/components/UpDownButton';
import { saveMdDebounced } from 'renderer/utils';

export default function ImageDetail() {
  const navigate = useNavigate();
  const navigatorParams = useParams();
  const hash = navigatorParams.hash;

  const [imageBase64, setImageBase64] = useState<string>('');
  const [exifParams, setExifParams] = useState<Record<string, any> | null>(
    null
  );
  const [imageData, setImageData] = useState<ImageRow | undefined>();
  const [showExif, setShowExif] = useState<boolean>(false);
  const [imageMetadata, setImageMetadata] = useState<ImageMetaData | null>(
    null
  );
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [markdownText, setMarkdownText] = useState<string | undefined>('');

  useEffect(() => {
    if (!hash) return;

    const load = async () => {
      const iData: ImageRow = await window.ipcHandler.getImage(hash);
      setImageData(iData);

      const folderPath = `${iData.path}\\${iData.name}`;
      const {
        base64,
        exif,
        metadata,
      }: {
        base64: string;
        exif: Record<string, any>;
        metadata: ImageMetaData | null;
      } = await window.ipcHandler.readImage(`${iData.path}\\${iData.fileName}`);
      setImageBase64(base64);
      setExifParams(exif);
      setImageMetadata(metadata);

      const fileMdText = await window.ipcHandler.readFile(
        `${folderPath}\\markdown.md`,
        'utf-8'
      );
      if (fileMdText) {
        setMarkdownText(fileMdText);
      }
    };
    load();
  }, [hash]);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const onMDChangeText = (value: string | undefined) => {
    setMarkdownText(value);
    if (typeof value !== 'undefined' && imageData) {
      saveMdDebounced(`${imageData.path}\\${imageData.name}`, value);
    }
  };

  const onImagePasted = async (dataTransfer: DataTransfer) => {
    if (imageData) {
      for (let i = 0; i < dataTransfer.files.length; i++) {
        const file = dataTransfer.files[i].path;
        const copiedFilePath: string = await window.ipcHandler.fileAttach(
          file,
          `${imageData.path}\\${imageData.name}`
        );
        onMDChangeText(`${markdownText} \n ![](sd:///${copiedFilePath}) \n`);
      }
    }
  };

  const revealInFolder = () => {
    if (imageData) {
      window.ipcHandler.openFolderLink(
        `${imageData.path}\\${imageData.fileName}`
      );
    }
  };

  const onRatingChange = async (value: number) => {
    await window.ipcHandler.updateImage(hash, 'rating', value);
    setImageData({
      ...imageData,
      rating: value,
    } as ImageRow);
  };

  if (!imageData) return null;

  if (showExif) {
    return (
      <div>
        <div className="absolute top-30 right-10">
          <button
            className="btn btn-circle"
            type="button"
            onClick={() => setShowExif(false)}
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
        <ExifJson exifParams={exifParams} />
      </div>
    );
  }

  return (
    <div className="p-4 flex justify-center relative h-full">
      <section className="w-5/6">
        <div>
          <div className="flex flex-row items-center">
            <p className="text-2xl font-bold text-gray-300">
              {imageData.model}
            </p>
            <span className="ml-4">
              <Rating
                value={imageData.rating}
                onClick={(value) => onRatingChange(value)}
              />
            </span>
          </div>
          <button
            type="button"
            className="text-1xl text-gray-300 mr-2"
            onClick={() => revealInFolder()}
          >
            {imageData.name}
          </button>
          <button
            className="badge badge-accent"
            type="button"
            onClick={() => setShowExif(true)}
          >
            Exif Metadata
          </button>
        </div>
        <div className="flex w-full my-4">
          <img
            src={`data:image/png;base64,${imageBase64}`}
            alt={imageData.name}
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
