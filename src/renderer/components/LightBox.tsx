import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { throttle } from 'renderer/utils';
import { ImageRow } from 'main/ipc/image';

type LightBoxProps = {
  images: ImageRow[];
  onClickImage?: (e: React.MouseEvent<HTMLElement>, index: number) => void;
  isOpen: boolean;
  currentHash: string;
  onClose?: () => void;
};

export default function LightBox({
  images,
  onClickImage,
  isOpen,
  currentHash,
  onClose,
}: LightBoxProps) {
  const MAX_IMAGES_VISIBLE = 9;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxImagesVisible, setMaxImagesVisible] = useState<number>(0);
  const [halfIndex, setHalfIndex] = useState<number>(0);
  const [slicedImages, setSlicedImages] = useState<ImageRow[]>([]);
  const [blurry, setBlurry] = useState<boolean>(
    localStorage.getItem('lightbox-blurry') === null
      ? false
      : localStorage.getItem('lightbox-blurry') === 'true',
  );
  const [backdrop, setBackdrop] = useState<boolean>(
    localStorage.getItem('lightbox-backdrop') === null
      ? false
      : localStorage.getItem('lightbox-backdrop') === 'true',
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const onClickBackdrop = () => {
    if (backdrop && onClose) {
      onClose();
    }
  };

  const onImageClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (onClickImage) {
      onClickImage(e, currentIndex);
    }
  };

  const onChangeBlurry = (e: ChangeEvent<HTMLInputElement>) => {
    setBlurry(e.target.checked);
    localStorage.setItem(
      'lightbox-blurry',
      e.target.checked ? 'true' : 'false',
    );
  };

  const onChangeBackdrop = () => {
    setBackdrop(!backdrop);
    localStorage.setItem('lightbox-backdrop', !backdrop ? 'true' : 'false');
  };

  const onClickThumbnail = (
    e: React.MouseEvent<HTMLElement>,
    index: number,
  ) => {
    e.stopPropagation();

    let newIndex = currentIndex;
    if (index > halfIndex) {
      newIndex = currentIndex + index - halfIndex;
    } else if (index < halfIndex) {
      newIndex = currentIndex - (halfIndex - index);
    }

    if (newIndex > images.length) {
      newIndex = currentIndex;
    } else if (newIndex < 0) {
      newIndex = images.length - 1;
    }
    setCurrentIndex(newIndex);
  };

  const onNext = throttle((e?: React.MouseEvent<HTMLElement>) => {
    e?.stopPropagation();
    if (currentIndex > images.length - 1) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }, 1000);

  const onPrev = throttle((e?: React.MouseEvent<HTMLElement>) => {
    e?.stopPropagation();
    if (currentIndex === 0) {
      setCurrentIndex(images.length - 1);
    } else {
      setCurrentIndex(currentIndex - 1);
    }
  }, 1000);

  const onFullScreen = (state: boolean) => {
    if (containerRef.current) {
      if (state) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const onDragImage = (image: ImageRow) => {
    window.ipcOn.startDrag(image.sourcePath);
  };

  useEffect(() => {
    return () => {
      if (isFullscreen) {
        document.exitFullscreen();
      }
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (images.length > MAX_IMAGES_VISIBLE) {
      setMaxImagesVisible(MAX_IMAGES_VISIBLE);
    } else {
      setMaxImagesVisible(images.length);
    }
    setHalfIndex(Math.ceil(maxImagesVisible / 2) - 1);
  }, [images, maxImagesVisible]);

  useEffect(() => {
    if (currentIndex - halfIndex < 0) {
      setSlicedImages(
        images
          .slice(halfIndex * -1 + currentIndex)
          .concat(images.slice(0, halfIndex + currentIndex + 1)),
      );
    } else if (currentIndex + halfIndex >= images.length) {
      setSlicedImages(
        images
          .slice(currentIndex - halfIndex, images.length)
          .concat(
            images.slice(0, currentIndex - images.length + halfIndex + 1),
          ),
      );
    } else {
      setSlicedImages(
        images.slice(
          currentIndex - halfIndex,
          currentIndex - halfIndex + maxImagesVisible,
        ),
      );
    }

    // eslint-disable-next-line
  }, [images, halfIndex, maxImagesVisible, currentIndex]);

  useEffect(() => {
    const index = images.findIndex((img) => img.hash === currentHash);
    if (index !== -1) {
      setCurrentIndex(index);
    }
    // eslint-disable-next-line
  }, [images, currentHash]);

  useEffect(() => {
    const onScroll = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        onNext();
      } else if (e.deltaY < 0) {
        onPrev();
      }
    };

    document.addEventListener('wheel', onScroll);

    return () => document.removeEventListener('wheel', onScroll);
  }, [onNext, onPrev]);

  useEffect(() => {
    const onKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
          document.exitFullscreen();
        } else if (onClose) {
          onClose();
        }
      }

      if (e.key === 'ArrowRight') {
        onNext();
      }
      if (e.key === 'ArrowLeft') {
        onPrev();
      }
    };

    document.addEventListener('keyup', onKeyPress);

    return () => document.removeEventListener('keyup', onKeyPress);
  });

  useEffect(() => {
    const onMouseClick = (e: MouseEvent) => {
      if (e.button === 3) {
        onNext();
      }
      if (e.button === 4) {
        onPrev();
      }
    };

    document.addEventListener('mousedown', onMouseClick);

    return () => document.removeEventListener('mousedown', onMouseClick);
  }, [onNext, onPrev]);

  return (
    <div ref={containerRef}>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div key="lightbox-container">
            <motion.div
              className={classNames([
                'w-screen h-screen absolute top-0 left-0 z-[998]',
                {
                  'bg-base-200/60 backdrop-blur-xl': blurry,
                  'bg-base-200': !blurry,
                },
              ])}
            />
            <div
              className="w-screen h-screen max-h-screen max-w-screen absolute top-0 left-0 z-[999]"
              onClick={() => onClickBackdrop()}
              aria-hidden
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full grid"
                style={{
                  gridTemplateColumns: '0.1fr 3fr 0.1fr',
                  gridTemplateRows: '5% 75% 20%',
                }}
              >
                <div> </div>
                <div
                  className="flex items-center justify-end px-10"
                  onClick={(e) => e.stopPropagation()}
                  aria-hidden
                >
                  <button
                    type="button"
                    className="mx-2"
                    onClick={() => onChangeBackdrop()}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className={classNames([
                        'w-6 h-6',
                        {
                          'stroke-green-500': backdrop,
                        },
                      ])}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"
                      />
                    </svg>
                  </button>
                  <label className="swap mx-2">
                    <input
                      type="checkbox"
                      checked={blurry}
                      onChange={(e) => onChangeBlurry(e)}
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="swap-on w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="swap-off w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  </label>
                  <label className="mx-2 swap">
                    <input
                      type="checkbox"
                      checked={isFullscreen}
                      onChange={(e) => onFullScreen(e.target.checked)}
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="swap-on w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                      />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="swap-off w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                      />
                    </svg>
                  </label>
                  <button
                    type="button"
                    className="mx-2"
                    onClick={() => onClose && onClose()}
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div> </div>
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    className="btn btn-circle btn-ghost"
                    onClick={(e) => onPrev(e)}
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
                        d="M15.75 19.5L8.25 12l7.5-7.5"
                      />
                    </svg>
                  </button>
                </div>
                <div>
                  <motion.div
                    className="flex items-center justify-center h-full"
                    key={slicedImages[halfIndex]?.sourcePath}
                    initial={{
                      opacity: 0.4,
                    }}
                    animate={{
                      opacity: 1,
                    }}
                    exit={{
                      opacity: 0.4,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.img
                      src={`sd:///${slicedImages[halfIndex]?.sourcePath}` || ''}
                      alt={slicedImages[halfIndex]?.fileName || ''}
                      className="max-h-full object-cover rounded cursor-pointer"
                      onClick={(e) => onImageClick(e)}
                      onDragStart={() => onDragImage(slicedImages[halfIndex])}
                    />
                  </motion.div>
                </div>
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    className="btn btn-circle btn-ghost"
                    onClick={(e) => onNext(e)}
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
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>
                </div>
                <div> </div>
                <div className="flex items-center justify-center pt-6">
                  {slicedImages.map((img, i) => (
                    <motion.img
                      src={`sd:///${img.sourcePath}`}
                      alt={img.fileName}
                      key={`lightbox_thumbnail_${img.hash}_${i}`}
                      initial={{
                        opacity: 0.5,
                        x: -100,
                        border: 'solid 2px transparent',
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        border:
                          i === halfIndex
                            ? 'solid 2px #fafafa'
                            : 'solid 2px transparent',
                      }}
                      exit={{
                        opacity: 0.5,
                        x: 100,
                        border: 'solid 2px transparent',
                      }}
                      transition={{ duration: 0.4 }}
                      style={{
                        height: '200px',
                        width: '100px',
                      }}
                      className={classNames([
                        'mx-2 object-cover rounded cursor-pointer',
                      ])}
                      onClick={(e) => onClickThumbnail(e, i)}
                    />
                  ))}
                </div>
                <div> </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
