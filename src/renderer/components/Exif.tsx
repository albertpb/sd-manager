import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import classNames from 'classnames';
import { useEffect, useState } from 'react';

export default function ExifJson({
  exifParams,
}: {
  exifParams: Record<string, any> | null;
}) {
  const [height, setHeight] = useState(window.innerHeight - 300);
  const [tab, setTab] = useState('prompt');

  useEffect(() => {
    const onResize = () => {
      setHeight(window.innerHeight - 300);
    };

    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (exifParams === null) return null;

  return (
    <div className="max-w-full">
      <div className="tabs tabs-boxed mr-6 mb-6">
        <button
          type="button"
          className={classNames('tab', { 'tab-active': tab === 'prompt' })}
          onClick={() => setTab('prompt')}
        >
          Prompt
        </button>
        <button
          type="button"
          className={classNames('tab', { 'tab-active': tab === 'workflow' })}
          onClick={() => setTab('workflow')}
        >
          Workflow
        </button>
        <button
          type="button"
          className={classNames('tab', { 'tab-active': tab === 'parameters' })}
          onClick={() => setTab('parameters')}
        >
          Parameters
        </button>
      </div>

      {exifParams.prompt && tab === 'prompt' && (
        <div>
          <p className="text-xl">Prompt</p>
          <div className="">
            <CodeMirror
              extensions={[jsonLang()]}
              theme="dark"
              height={`${height}px`}
              value={JSON.stringify(JSON.parse(exifParams?.prompt), null, 2)}
            />
          </div>
        </div>
      )}
      {exifParams.workflow && tab === 'workflow' && (
        <div>
          <p className="text-xl">Workflow</p>
          <CodeMirror
            extensions={[jsonLang()]}
            theme="dark"
            height={`${height}px`}
            value={JSON.stringify(JSON.parse(exifParams?.workflow), null, 2)}
          />
        </div>
      )}
      {exifParams.parameters && tab === 'parameters' && (
        <div>
          <p className="text-xl">Parameters</p>
          <pre className="whitespace-pre-wrap">{exifParams.parameters}</pre>
        </div>
      )}
    </div>
  );
}
