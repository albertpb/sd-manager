import { useEffect, useState } from 'react';

const aspectRatios = [
  {
    label: 'wide (16:9)',
    ratioWidth: 16,
    ratioHeight: 9,
  },
  {
    label: 'square',
    ratioWidth: 1,
    ratioHeight: 1,
  },
  {
    label: 'photography 4:3',
    ratioWidth: 4,
    ratioHeight: 3,
  },
  {
    label: 'photography 3:2',
    ratioWidth: 3,
    ratioHeight: 2,
  },
];

export default function AspectRatioHelper() {
  const [ratioWidth, setRatioWidth] = useState<number>(16);
  const [ratioHeight, setRatioHeight] = useState<number>(9);
  const [width, setWidth] = useState(16);
  const [height, setHeight] = useState(9);

  // width > ratioWidth
  // height > ratioHeight
  useEffect(() => {
    const h = (width * ratioHeight) / ratioWidth;
    if (h >= ratioHeight) {
      setHeight(Math.round(h));
    }
  }, [width, ratioHeight, ratioWidth]);

  useEffect(() => {
    const w = (height * ratioWidth) / ratioHeight;
    if (w >= ratioWidth) {
      setWidth(Math.round(w));
    }
  }, [height, ratioHeight, ratioWidth]);

  return (
    <section className="pt-10 px-10">
      <div className="w-full">
        <p className="text-2xl font-bold text-gray-300">Aspect Ratio Helper</p>
      </div>
      <div className="mt-20">
        <div className="flex flex-row w-full xl:w-1/2">
          <div className="flex flex-col w-full">
            <div className="w-full px-6 form-control">
              <label htmlFor="ar-ratiowidth" className="label">
                <span className="label-text">Ratio Width</span>
              </label>
              <input
                id="ar-ratiowidth"
                type="number"
                className="input input-bordered input-info input-md w-full"
                onChange={(e) => setRatioWidth(parseInt(e.target.value, 10))}
                value={ratioWidth}
              />
            </div>
            <div className="w-full px-6 form-control mt-4">
              <label htmlFor="ar-width" className="label">
                <span className="label-text">Pixels Width</span>
              </label>
              <input
                id="ar-width"
                type="number"
                className="input input-bordered input-info input-md w-full"
                onChange={(e) => setWidth(parseInt(e.target.value, 10))}
                value={width}
              />
            </div>
            <div className="w-full mt-10 px-6 form-control">
              <input
                type="range"
                className="w-full"
                max={4096}
                min={0}
                onChange={(e) => setWidth(parseInt(e.target.value, 10))}
                value={width}
              />
            </div>
          </div>
          <div className="flex flex-col w-full">
            <div className="w-full px-6 form-control">
              <label htmlFor="ar-ratioheight" className="label">
                <span className="label-text">Ratio Height</span>
              </label>
              <input
                id="ar-ratioheight"
                type="number"
                className="input input-bordered input-info input-md w-full"
                onChange={(e) => setRatioHeight(parseInt(e.target.value, 10))}
                value={ratioHeight}
              />
            </div>
            <div className="w-full px-6 form-control mt-4">
              <label htmlFor="ar-height" className="label">
                <span className="label-text">Pixels Height</span>
              </label>
              <input
                id="ar-height"
                type="number"
                className="input input-bordered input-info input-md w-full"
                onChange={(e) => setHeight(parseInt(e.target.value, 10))}
                value={height}
              />
            </div>
            <div className="w-full mt-10 px-6 form-control">
              <input
                type="range"
                className="w-full"
                max={4096}
                min={0}
                onChange={(e) => setHeight(parseInt(e.target.value, 10))}
                value={height}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
