type ModelInfoFile = {
  id: string;
  url: string;
  sizeKB: number;
  name: string;
  type: string;
  metadata: {
    fp: string;
    size: string;
    format: string;
  };
  pickleScanResult: string;
  pickleScanMessage: string;
  virusScanResult: string;
  virusScanMessage: string | null;
  scannedAt: string;
  hashes: {
    AutoV1: string;
    AutoV2: string;
    SHA256: string;
    CRC32: string;
    BLAKE3: string;
  };
  primary: boolean;
  downloadUrl: string;
};

type ModelInfoImage = {
  url: string;
  nsfw: string;
  width: number;
  height: number;
  hash: string;
  type: string;
  metadata: {
    hash: string;
    width: number;
    height: number;
  };
  meta: Record<string, any>;
};

export type ModelInfo = {
  id: string;
  modelId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  trainedWords: string[];
  baseModel: string;
  baseModelType: string;
  earlyAccessTimeFrame: string;
  description: string;
  stats: {
    downloadCount: number;
    ratingCount: number;
    rating: number;
  };
  model: {
    name: string;
    type: string;
    nsfw: boolean;
    poi: boolean;
  };
  files: ModelInfoFile[];
  images: ModelInfoImage[];
  downloadUrl: string;
};
