import { ModelInfo } from 'main/interfaces';

export type ModelTableDetailProps = {
  modelInfo: ModelInfo;
};

export default function ModelTableDetail({ modelInfo }: ModelTableDetailProps) {
  const openCivitaiLink = () => {
    window.ipcHandler.openLink(
      `https://civitai.com/models/${modelInfo.modelId}`
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
          <td>{modelInfo?.name}</td>
        </tr>
        <tr>
          <td>Type</td>
          <td>
            <div className="badge badge-accent">{modelInfo?.model?.type}</div>
          </td>
        </tr>
        <tr>
          <td>Trained words</td>
          <td>
            <div>{modelInfo?.trainedWords}</div>
          </td>
        </tr>
        <tr>
          <td>Base Model</td>
          <td>{modelInfo?.baseModel}</td>
        </tr>
        <tr>
          <td>Model Id</td>
          <td>{modelInfo?.modelId}</td>
        </tr>
        <tr>
          <td>Link</td>
          <td>
            <button
              type="button"
              onClick={() => openCivitaiLink()}
              className="link"
            >
              Civitai Link
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
