import { ModelInfo } from 'main/interfaces';
import Rating from './Rating';

export type ModelTableDetailProps = {
  modelInfo: ModelInfo;
};

export default function ModelTableDetail({ modelInfo }: ModelTableDetailProps) {
  return (
    <table className="table">
      <tbody>
        <tr>
          <td className="">Details</td>
          <td> </td>
        </tr>
        <tr>
          <td>Type</td>
          <td>
            <div className="badge badge-accent">{modelInfo.model.type}</div>
          </td>
        </tr>
        <tr>
          <td>Base Model</td>
          <td>{modelInfo.baseModel}</td>
        </tr>
        <tr>
          <td>Model Id</td>
          <td>{modelInfo.modelId}</td>
        </tr>
        <tr>
          <td>Model Id</td>
          <td>
            <Rating rating={modelInfo.stats.rating} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
