import { createId } from '@paralleldrive/cuid2';
import MDEditor from '@uiw/react-md-editor';
import classNames from 'classnames';
import { ImageMetaData } from 'main/exif';
import { Model } from 'main/ipc/model';
import { ImageRow } from 'main/ipc/organizeImages';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from 'renderer/components/ConfirmDialog';
import ExifJson from 'renderer/components/Exif';
import ImageMegadata from 'renderer/components/ImageMetadata';
import Rating from 'renderer/components/Rating';
import UpDownButton from 'renderer/components/UpDownButton';
import { AppDispatch, RootState } from 'renderer/redux';
import {
  deleteImages,
  setImagesToDelete,
  updateImage,
} from 'renderer/redux/reducers/global';
import { saveMdDebounced } from 'renderer/utils';
import ImageZoom from 'renderer/components/ImageZoom';

export default function ImageDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const navigatorParams = useParams();
  const hash = navigatorParams.hash;

  const images = useSelector((state: RootState) => state.global.images);

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

      const folderPath = `${iData.path}\\${iData.name}`;
      const {
        exif,
        metadata,
      }: {
        base64: string;
        exif: Record<string, any>;
        metadata: ImageMetaData | null;
      } = await window.ipcHandler.readImage(`${iData.path}\\${iData.fileName}`);
      setExifParams(exif);
      setImageMetadata(metadata);

      const fileMdText = await window.ipcHandler.readFile(
        `${folderPath}\\markdown.md`,
        'utf-8',
      );
      if (fileMdText) {
        setMarkdownText(fileMdText);
      }

      const model = await window.ipcHandler.readModelByName(
        iData.model,
        'checkpoint',
      );
      setModelData(model);
    };
    load();
  }, [hash]);

  const goToNextOrPrevImage = useCallback(
    (next: boolean) => {
      const index = images.findIndex((image) => image.hash === imageData?.hash);
      if (index) {
        const image = next ? images[index + 1] : images[index - 1];
        if (image.hash) {
          navigate(`/image-detail/${image.hash}`);
        }
      }
    },
    [imageData, images, navigate],
  );

  const deleteImage = useCallback(() => {
    if (imageData) {
      dispatch(
        setImagesToDelete({
          [imageData.hash]: true,
        }),
      );

      setConfirmDialogIsOpen(true);
    }
  }, [imageData, dispatch]);

  const doDelete = useCallback(async () => {
    await dispatch(deleteImages());

    goToNextOrPrevImage(false);
  }, [dispatch, goToNextOrPrevImage]);

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
          }\\${createId()}.png`;

          await window.ipcHandler.saveImageMD(file.path, dest);

          onMDChangeText(`${markdownText} \n ![](sd:///${dest}) \n`);
        }
      }
    }
  };

  const revealInFolder = () => {
    if (imageData) {
      window.ipcHandler.openFolderLink(
        `${imageData.path}\\${imageData.fileName}`,
      );
    }
  };

  const onRatingChange = async (value: number) => {
    if (hash) {
      await dispatch(updateImage({ hash, field: 'rating', value }));
      setImageData({
        ...imageData,
        rating: value,
      } as ImageRow);
    }
  };

  const onCancelDelete = () => {
    dispatch(setImagesToDelete({}));

    setConfirmDialogIsOpen(false);
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
      <div className="flex">
        <div className="w-fit h-auto">
          <ul className="menu bg-base-200 border-t border-base-300 h-full pt-10">
            <li>
              <button type="button" onClick={() => navigate('/images')}>
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
                  to={`/model-detail/${modelData?.hash}`}
                  className="text-2xl font-bold text-gray-300"
                >
                  {imageData.model}
                </Link>
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
              <ImageZoom
                src={`sd:///${imageData.path}\\${imageData.fileName}`}
                alt={imageData.name}
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
        msg="Are you sure to delete selected images ?, only images from destination folder will be deleted"
        isOpen={confirmDialogIsOpen}
        onClose={() => onCancelDelete()}
        onConfirm={() => doDelete()}
      />
    </>
  );
}
