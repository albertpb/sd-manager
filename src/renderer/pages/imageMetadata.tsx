import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { ChangeEvent, DragEvent, useEffect, useState } from 'react';
import Image from 'renderer/components/Image';

export default function ImageMetadata() {
  const IMAGE_TYPES = ['image/png', 'image/jpeg'];

  const [metadata, setMetadata] = useState({});
  const [path, setPath] = useState('');

  const [height, setHeight] = useState(window.innerHeight - 300);

  useEffect(() => {
    const onResize = () => {
      setHeight(window.innerHeight - 300);
    };

    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  const readMetadata = async (newPath: string) => {
    setPath(newPath);
    const result = await window.ipcHandler.readImageMetadata(newPath);
    setMetadata(result);
  };

  const onFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (IMAGE_TYPES.includes(e.target.files.item(0)?.type || '')) {
        readMetadata(e.target.files[0].path);
      }
    }
  };

  const onFilesDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (IMAGE_TYPES.includes(e.dataTransfer.files.item(0)?.type || '')) {
        readMetadata(e.dataTransfer.files[0].path);
      }
    }
  };

  return (
    <div className="flex flex-col h-full px-10 pt-10">
      <div className="w-full">
        <p className="text-2xl font-bold text-gray-300">Image metadata</p>
      </div>
      <div className="flex flex-col xl:flex-row mt-4">
        <div
          className="w-full xl:w-1/2 xl:mr-4"
          onDrop={(e) => onFilesDrop(e)}
          onDragOver={(e) => e.preventDefault()}
        >
          <label
            htmlFor="imagedrop"
            className="flex justify-center w-full h-96 px-4 transition bg-slate-900 border-2 border-gray-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
          >
            {path === '' ? (
              <span className="flex items-center space-x-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="font-medium text-gray-600">
                  Drop image to read, or{' '}
                  <span className="text-blue-600 underline">browse</span>
                </span>
              </span>
            ) : (
              <Image src={path} alt="metadata" />
            )}
            <input
              type="file"
              id="imagedrop"
              name="file_upload"
              className="hidden"
              onChange={(e) => onFilesChange(e)}
            />
          </label>
        </div>
        <div
          className="w-full xl:w-1/2 xl:ml-4 mt-4 xl:mt-0"
          data-color-mode="dark"
        >
          <CodeMirror
            extensions={[jsonLang()]}
            theme="dark"
            height={`${height}px`}
            value={JSON.stringify(metadata, null, 2)}
          />
        </div>
      </div>
    </div>
  );
}
