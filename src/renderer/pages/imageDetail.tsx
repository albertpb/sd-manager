import log from 'electron-log/renderer';
import MDEditor from '@uiw/react-md-editor';
import classNames from 'classnames';
import { Model } from 'main/ipc/model';
import { ImageRow } from 'main/ipc/image';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from 'renderer/components/ConfirmDialog';
import ExifJson from 'renderer/components/Exif';
import ImageMegadata from 'renderer/components/ImageMetadata';
import Rating from 'renderer/components/Rating';
import UpDownButton from 'renderer/components/UpDownButton';
import { convertPath, generateRandomId, saveMdDebounced } from 'renderer/utils';
import ImageZoom from 'renderer/components/ImageZoom';
import { ImageMetaData } from 'main/interfaces';
import { useAtom } from 'jotai';
import {
  deleteImages,
  imagesAtom,
  updateImage,
} from 'renderer/state/images.store';
import { OsContext } from 'renderer/hocs/detect-os';

export default function ImageDetail() {
  const os = useContext(OsContext);

  const navigate = useNavigate();
  const navigatorParams = useParams();
  const hash = navigatorParams.hash;

  const [imagesState, setImagesState] = useAtom(imagesAtom);

  const [exifParams, setExifParams] = useState<Record<string, any> | null>(
    null,
  );
  const [imageData, setImageData] = useState<ImageRow | undefined>();
  const [modelData, setModelData] = useState<Model | undefined>();
  const [showExif, setShowExif] = useState<boolean>(false);
  const [imageMetadata, setImageMetadata] = useState<ImageMetaData | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [markdownText, setMarkdownText] = useState<string | undefined>('');
  const [confirmDialogIsOpen, setConfirmDialogIsOpen] =
    useState<boolean>(false);

  useEffect(() => {
    if (!hash) return;

    const load = async () => {
      const iData: ImageRow = await window.ipcHandler.getImage(hash);
      setImageData(iData);

      const folderPath = `${iData.path}`;
      const {
        exif,
        metadata,
      }: {
        base64: string;
        exif: Record<string, any>;
        metadata: ImageMetaData | null;
      } = await window.ipcHandler.readImage(`${iData.sourcePath}`);
      setExifParams(exif);
      setImageMetadata(metadata);
      const fileMdText = await window.ipcHandler.readFile(
        convertPath(`${folderPath}\\${iData.name}\\markdown.md`, os),
        'utf-8',
      );
      if (fileMdText) {
        setMarkdownText(fileMdText);
      }

      try {
        const model = await window.ipcHandler.readModelByName(
          iData.model,
          'checkpoint',
        );
        setModelData(model);
      } catch (error) {
        console.log(error);
      }
    };
    load();
  }, [hash, os]);

  const goToNextOrPrevImage = useCallback(
    (next: boolean) => {
      const currentIndex = imagesState.images.findIndex(
        (image) => image.hash === imageData?.hash,
      );
      if (currentIndex !== -1) {
        let index = next ? currentIndex + 1 : currentIndex - 1;
        if (index > imagesState.images.length - 1) {
          index = 0;
        } else if (index < 0) {
          index = imagesState.images.length - 1;
        }
        const image = imagesState.images[index];
        if (image.hash) {
          navigate(`/image-detail/${image.hash}`);
        }
      }
    },
    [imageData, imagesState.images, navigate],
  );

  const deleteImage = useCallback(() => {
    if (imageData) {
      setImagesState((draft) => {
        draft.toDelete[imageData.hash] = imageData;
      });
      setConfirmDialogIsOpen(true);
    }
  }, [setImagesState, imageData]);

  const doDelete = useCallback(async () => {
    await deleteImages();
    setConfirmDialogIsOpen(false);

    goToNextOrPrevImage(true);
  }, [goToNextOrPrevImage]);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToNextOrPrevImage(false);
      }
      if (e.key === 'ArrowRight') {
        goToNextOrPrevImage(true);
      }
      if (e.key === 'Delete') {
        deleteImage();
      }
      if (e.key === 'Enter' && confirmDialogIsOpen) {
        doDelete();
      }
    };

    window.addEventListener('keydown', listener);

    return () => window.removeEventListener('keydown', listener);
  }, [goToNextOrPrevImage, deleteImage, confirmDialogIsOpen, doDelete]);

  useEffect(() => {
    const onMouseClick = (e: MouseEvent) => {
      if (e.button === 3) {
        goToNextOrPrevImage(true);
      }
      if (e.button === 4) {
        goToNextOrPrevImage(false);
      }
    };

    document.addEventListener('mousedown', onMouseClick);

    return () => document.removeEventListener('mousedown', onMouseClick);
  }, [goToNextOrPrevImage]);

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
        const file = dataTransfer.files[i];
        const fileType = file.type;

        if (fileType === 'image/png') {
          const dest = `${imageData.path}\\${
            imageData.name
          }\\${generateRandomId(10)}.png`;

          try {
            await window.ipcHandler.saveImageMD(file.path, dest);
          } catch (error) {
            console.log(error);
            log.info(error);

            try {
              await window.ipcHandler.saveImageFromClipboard(dest);
            } catch (err) {
              console.log(err);
              log.info(error);
            }
          }

          onMDChangeText(`${markdownText} \n ![](sd:///${dest}) \n`);
        }
      }
    }
  };

  const revealInFolder = () => {
    if (imageData) {
      window.ipcHandler.openFolderLink(`${imageData.sourcePath}`);
    }
  };

  const onRatingChange = async (value: number) => {
    if (hash) {
      await updateImage(hash, 'rating', value);
      setImageData({
        ...imageData,
        rating: value,
      } as ImageRow);
    }
  };

  const onCancelDelete = () => {
    setImagesState((draft) => {
      draft.toDelete = {};
    });

    setConfirmDialogIsOpen(false);
  };

  const onClickImage = () => {
    if (imageData) {
      setImagesState((draft) => {
        draft.lightbox = {
          currentHash: imageData.hash,
          isOpen: true,
        };
      });
      navigate('/');
    }
  };

  const goToImages = () => {
    setImagesState((draft) => {
      draft.lightbox.isOpen = false;
    });
    navigate('/');
  };

  if (!imageData) return null;

  if (showExif) {
    return (
      <div className="relative px-4 pb-4 pt-10">
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
    <>
      <div className="flex min-h-full">
        <div className="w-fit h-auto">
          <ul className="menu bg-base-200 border-t border-base-300 h-full pt-10">
            <li>
              <button type="button" onClick={() => goToImages()}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
              </button>
            </li>
            <li>
              <button
                type="button"
                className="tooltip tooltip-right"
                data-tip="Go Next Image or press ← Key"
                onClick={() => goToNextOrPrevImage(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18"
                  />
                </svg>
              </button>
            </li>
            <li>
              <button
                type="button"
                className="tooltip tooltip-right"
                data-tip="Go Next Image or press → Key"
                onClick={() => goToNextOrPrevImage(true)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
                  />
                </svg>
              </button>
            </li>
            <li>
              <button type="button" onClick={() => deleteImage()}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className={classNames(['w-5 h-5'])}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              </button>
            </li>
          </ul>
        </div>
        <div
          className="px-4 pb-4 pt-10 flex justify-center relative"
          style={{ width: `calc(100% - 68px)` }}
        >
          <section className="w-5/6">
            <div>
              <div className="flex flex-row items-center">
                <Link
                  to={modelData?.hash ? `/model-detail/${modelData.hash}` : ''}
                  className="text-2xl font-bold text-gray-300"
                >
                  {imageData.model}
                </Link>
                <span className="ml-4">
                  <Rating
                    id={`image-detail-${imageData.hash}`}
                    value={imageData.rating}
                    onClick={(e, value) => onRatingChange(value)}
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
            <div className="flex w-full my-4 cursor-pointer">
              <ImageZoom
                src={imageData.sourcePath}
                alt={imageData.name}
                onClick={() => onClickImage()}
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
      </div>
      <ConfirmDialog
        response={{ type: 'delete-images', value: '' }}
        msg="Are you sure to delete selected images ?"
        isOpen={confirmDialogIsOpen}
        onClose={() => onCancelDelete()}
        onConfirm={() => doDelete()}
      />
    </>
  );
}
