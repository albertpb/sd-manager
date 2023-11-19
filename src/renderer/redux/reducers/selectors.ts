import { createSelector } from '@reduxjs/toolkit';
import { ImageRow } from 'main/ipc/image';
import { Model } from 'main/ipc/model';
import { Tag } from 'main/ipc/tag';

export type ImageWithTags = Omit<ImageRow, 'tags'> & { tags: Tag[] };

export const imagesWithTags = createSelector(
  (images: ImageRow[], tags: Record<string, Tag>) => ({
    images,
    tags,
  }),
  ({ images, tags }) => {
    return images.reduce((acc: ImageWithTags[], image) => {
      const imageTags = Object.keys(image.tags).map((t) => tags[t]);
      acc.push({ ...image, tags: imageTags });
      return acc;
    }, []);
  },
);

export type ModelWithTags = Omit<Model, 'tags'> & { tags: Tag[] };

export const modelsWithTags = createSelector(
  (models: Model[], mtags: Record<string, Tag>) => ({
    models,
    mtags,
  }),
  ({ models, mtags }) => {
    return models.reduce((acc: ModelWithTags[], model) => {
      const modelTags = Object.keys(model.tags).map((t) => mtags[t]);
      acc.push({ ...model, tags: modelTags });
      return acc;
    }, []);
  },
);
