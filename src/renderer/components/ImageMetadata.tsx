import { ImageMetaData } from '../../main/interfaces';
import CopyText from './CopyText';

export default function ImageMegadata({
  metadata,
}: {
  metadata: ImageMetaData | null;
}) {
  if (!metadata) return null;

  return (
    <table className="table table-xs">
      <thead>
        <tr>
          <th>
            <p className="text-sm">Details:</p>
          </th>
          <th> </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <p className="text-sm">Prompt</p>
          </td>
          <td>
            <CopyText>{metadata.positivePrompt || ''}</CopyText>
          </td>
        </tr>
        <tr>
          <td>
            <p className="text-sm">Negative Prompt</p>
          </td>
          <td>
            <CopyText>{metadata.negativePrompt || ''}</CopyText>
          </td>
        </tr>
        <tr>
          <td>
            <p className="text-sm">Sampler</p>
          </td>
          <td>
            <CopyText>{metadata.sampler || ''}</CopyText>
          </td>
        </tr>
        <tr>
          <td>
            <p className="text-sm">Scheduler</p>
          </td>
          <td>
            <CopyText>{metadata.scheduler}</CopyText>
          </td>
        </tr>
        <tr>
          <td>
            <p className="text-sm">Steps</p>
          </td>
          <td>
            <CopyText>{metadata.steps}</CopyText>
          </td>
        </tr>
        <tr>
          <td>
            <p className="text-sm">Seed</p>
          </td>
          <td>
            <CopyText>{metadata.seed}</CopyText>
          </td>
        </tr>
        <tr>
          <td>
            <p className="text-sm">CFG</p>
          </td>
          <td>
            <CopyText>{metadata.cfg}</CopyText>
          </td>
        </tr>
        <tr>
          <td>
            <p className="text-sm">Generated by</p>
          </td>
          <td>
            <CopyText>{metadata.generatedBy}</CopyText>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
