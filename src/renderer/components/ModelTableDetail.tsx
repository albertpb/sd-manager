import { ModelCivitaiInfo } from 'main/interfaces';
import BadgeCopyWords from './BadgeCommaTexts';

export type ModelTableDetailProps = {
  modelInfo: ModelCivitaiInfo;
};

export default function ModelTableDetail({ modelInfo }: ModelTableDetailProps) {
  const openCivitaiLink = () => {
    window.ipcHandler.openLink(
      `https://civitai.com/models/${modelInfo.modelId}`,
    );
  };

  return (
    <table className="table">
      <tbody>
        <tr>
          <td className="">Details</td>
          <td> </td>
        </tr>
        <tr>
          <td>Name</td>
          <td>
            <div className="px-5">{modelInfo?.name}</div>
          </td>
        </tr>
        <tr>
          <td>Type</td>
          <td>
            <div className="badge badge-accent mx-5">
              {modelInfo?.model?.type}
            </div>
          </td>
        </tr>
        <tr>
          <td>Trained words</td>
          <td>
            <div className="px-5">
              {modelInfo?.trainedWords?.map((words) => (
                <BadgeCopyWords
                  words={words.split(',').filter((w) => w.trim() !== '')}
                />
              ))}
            </div>
          </td>
        </tr>
        <tr>
          <td>Base Model</td>
          <td>
            <div className="px-5">{modelInfo?.baseModel}</div>
          </td>
        </tr>
        <tr>
          <td>Model Id</td>
          <td>
            <div className="px-5">{modelInfo?.modelId}</div>
          </td>
        </tr>
        <tr>
          <td>Link</td>
          <td>
            <button
              type="button"
              onClick={() => openCivitaiLink()}
              className="link px-5"
            >
              Civitai Link
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
