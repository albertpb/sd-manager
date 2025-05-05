import { ImageRow } from 'main/ipc/image';
import { Model } from 'main/ipc/model';
import { Tag } from 'main/ipc/tag';

export type ImageWithTags = Omit<ImageRow, 'tags'> & { tags: Tag[] };

export type ModelWithTags = Omit<Model, 'tags'> & { tags: Tag[] };

export type ImportProgress = {
  progress: number;
  message: string;
};
