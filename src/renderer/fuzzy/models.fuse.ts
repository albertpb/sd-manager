import Fuse from 'fuse.js';
import { ModelWithTags } from 'renderer/state/interfaces';

export default class ModelsFuseSingleton {
  FUSE_MODELS_LORA_FILENAME = 'models-lora-fuse.json';

  FUSE_MODELS_CHECKPOINT_FILENAME = 'models-checkpoint-fuse.json';

  fuseCheckpoint: Fuse<ModelWithTags> | undefined;

  fuseLora: Fuse<ModelWithTags> | undefined;

  // eslint-disable-next-line no-use-before-define
  private static instance: ModelsFuseSingleton | null = null;

  static getInstance(): ModelsFuseSingleton {
    if (!ModelsFuseSingleton.instance) {
      ModelsFuseSingleton.instance = new ModelsFuseSingleton();
    }

    return ModelsFuseSingleton.instance;
  }

  async initFuseCheckpoint(models: ModelWithTags[]) {
    const indexes: string | undefined = await window.ipcHandler.readFuseIndex(
      this.FUSE_MODELS_CHECKPOINT_FILENAME,
    );

    this.fuseCheckpoint = new Fuse<ModelWithTags>(
      models,
      {
        keys: ['name'],
      },
      indexes ? Fuse.parseIndex(indexes) : undefined,
    );
  }

  async initFuseLora(models: ModelWithTags[]) {
    const indexes: string | undefined = await window.ipcHandler.readFuseIndex(
      this.FUSE_MODELS_LORA_FILENAME,
    );

    this.fuseLora = new Fuse<ModelWithTags>(
      models,
      {
        keys: ['name'],
      },
      indexes ? Fuse.parseIndex(indexes) : undefined,
    );
  }

  async saveFuseIndexes() {
    if (this.fuseCheckpoint) {
      await window.ipcHandler.saveFuseIndex(
        this.FUSE_MODELS_CHECKPOINT_FILENAME,
        this.fuseCheckpoint.getIndex().toJSON(),
      );
    }

    if (this.fuseLora) {
      await window.ipcHandler.saveFuseIndex(
        this.FUSE_MODELS_LORA_FILENAME,
        this.fuseLora.getIndex().toJSON(),
      );
    }
  }

  getFuseCheckpoint() {
    return this.fuseCheckpoint;
  }

  getFuseLora() {
    return this.fuseLora;
  }
}
