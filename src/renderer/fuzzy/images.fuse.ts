import Fuse from 'fuse.js';
import { ImageRow } from 'main/ipc/image';
import { ImageWithTags } from 'renderer/state/interfaces';

export default class ImagesFuseSingleton {
  FUSE_IMAGES_BY_TAGS_FILENAME = 'images-bytags-fuse.json';

  FUSE_IMAGES_BY_MODEL_FILENAME = 'images-bymodel-fuse.json';

  fuseByTags: Fuse<ImageWithTags> | undefined;

  fuseByModel: Fuse<ImageWithTags> | undefined;

  // eslint-disable-next-line no-use-before-define
  private static instance: ImagesFuseSingleton | null = null;

  static getInstance(): ImagesFuseSingleton {
    if (!ImagesFuseSingleton.instance) {
      ImagesFuseSingleton.instance = new ImagesFuseSingleton();
    }

    return ImagesFuseSingleton.instance;
  }

  async initFuseByTags(images: ImageWithTags[]) {
    const indexes: string | undefined = await window.ipcHandler.readFuseIndex(
      this.FUSE_IMAGES_BY_TAGS_FILENAME,
    );

    this.fuseByTags = new Fuse<ImageWithTags>(
      images,
      {
        keys: ['tags.label'],
      },
      indexes ? Fuse.parseIndex(indexes) : undefined,
    );
  }

  async initFuseByModel(images: ImageWithTags[]) {
    const indexes: string | undefined = await window.ipcHandler.readFuseIndex(
      this.FUSE_IMAGES_BY_MODEL_FILENAME,
    );

    this.fuseByModel = new Fuse<ImageWithTags>(
      images,
      {
        keys: ['model'],
      },
      indexes ? Fuse.parseIndex(indexes) : undefined,
    );
  }

  async saveFuseIndexes() {
    if (this.fuseByModel) {
      await window.ipcHandler.saveFuseIndex(
        this.FUSE_IMAGES_BY_MODEL_FILENAME,
        this.fuseByModel.getIndex().toJSON(),
      );
    }

    if (this.fuseByTags) {
      await window.ipcHandler.saveFuseIndex(
        this.FUSE_IMAGES_BY_TAGS_FILENAME,
        this.fuseByTags.getIndex().toJSON(),
      );
    }
  }

  removeImages(imagesToDelete: (ImageWithTags | ImageRow)[]) {
    imagesToDelete.forEach((img) => {
      if (this.fuseByModel) {
        this.fuseByModel.remove((doc) => doc.hash === img.hash);
      }
      if (this.fuseByTags) {
        this.fuseByTags.remove((doc) => doc.hash === img.hash);
      }
    });
  }

  getFuseByTags() {
    return this.fuseByTags;
  }

  getFuseByModel() {
    return this.fuseByModel;
  }
}
