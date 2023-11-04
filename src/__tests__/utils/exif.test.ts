import {
  parseAutomatic1111Meta,
  parseComfyUiMeta,
  parseInvokeAIMeta,
} from 'main/exif';
import {
  automatic1111Prompts,
  automatic1111Metadatas,
} from './mocks/automatic1111.mock';
import { comfyuiMetas, comfyuiPrompts } from './mocks/comfyui.mock';
import { invokeaiMetas, invokeaiPrompts } from './mocks/invokeai.mock';

describe('exif', () => {
  it('should parse automatic1111 metadata', () => {
    for (let i = 0; i < automatic1111Prompts.length; i++) {
      const metadata = parseAutomatic1111Meta(automatic1111Prompts[i]);

      expect(metadata).toEqual(automatic1111Metadatas[i]);
    }
  });

  it('should parse comfyui metadata', () => {
    for (let i = 0; i < comfyuiPrompts.length; i++) {
      const metadata = parseComfyUiMeta(comfyuiPrompts[i]);

      expect(metadata).toEqual(comfyuiMetas[i]);
    }
  });

  it('should parse invokeai metadata', () => {
    for (let i = 0; i < invokeaiPrompts.length; i++) {
      const metadata = parseInvokeAIMeta(invokeaiPrompts[i]);

      expect(metadata).toEqual(invokeaiMetas[i]);
    }
  });
});
