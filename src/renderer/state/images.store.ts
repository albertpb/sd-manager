import { atomWithImmer } from 'jotai-immer';
import { atom } from 'jotai';
import { ImageRow } from 'main/ipc/image';
import { Tag } from 'main/ipc/tag';
import { WatchFolder } from 'main/ipc/watchFolders';
import { createId } from '@paralleldrive/cuid2';
import { getTextColorFromBackgroundColor } from 'renderer/utils';
import { SelectValue } from 'react-tailwindcss-select/dist/components/type';
import { ImportProgress } from './interfaces';
import { settingsAtom } from './settings.store';
import { store } from './index';

export type ImageWithTags = Omit<ImageRow, 'tags'> & { tags: Tag[] };

export type ImagesState = {
  images: ImageRow[];
  loading: boolean;
  importProgress: ImportProgress;
  toDelete: Record<string, ImageRow | ImageWithTags>;
  lightbox: {
    currentHash: string;
    isOpen: boolean;
  };
};

export const imagesAtom = atomWithImmer<ImagesState>({
  images: [],
  loading: false,
  importProgress: {
    message: '',
    progress: 0,
  },
  toDelete: {},
  lightbox: {
    currentHash: '',
    isOpen: false,
  },
});
imagesAtom.debugLabel = 'imagesAtom';

export const imagesTagsAtom = atomWithImmer<Record<string, Tag>>({});
imagesTagsAtom.debugLabel = 'imagesTagsAtom';

export const watchFoldersAtom = atomWithImmer<WatchFolder[]>([]);
watchFoldersAtom.debugLabel = 'watchFoldersAtom';

export const imagesWithTags = atom((get) => {
  const images = get(imagesAtom).images;
  const tags = get(imagesTagsAtom);

  return images.reduce((acc: ImageWithTags[], img) => {
    const imageTags = Object.keys(img.tags).map((t) => tags[t]);
    acc.push({ ...img, tags: imageTags });
    return acc;
  }, []);
});
imagesWithTags.debugLabel = 'imagesWithTags';

export const loadImages = async () => {
  store.set(imagesAtom, (draft) => {
    draft.loading = true;
  });

  const images = await window.ipcHandler.getImages();
  store.set(imagesAtom, (draft) => {
    draft.images = images;
    draft.loading = false;
  });
};

export const scanImages = async (paths: string[]) => {
  store.set(imagesAtom, (draft) => {
    draft.loading = true;
  });

  await window.ipcHandler.scanImages(paths);

  store.set(imagesAtom, (draft) => {
    draft.loading = false;
  });
};

export const deleteImages = async () => {
  const imagesToDelete = store.get(imagesAtom).toDelete;

  await window.ipcHandler.removeImages(imagesToDelete);
  await store.set(imagesAtom, (draft) => {
    draft.toDelete = {};
  });
  window.api.clearCache();
  await loadImages();
};

export const updateImage = async (
  imageHash: string,
  field: keyof ImageRow,
  value: any,
) => {
  await window.ipcHandler.updateImage(imageHash, field, value);

  store.set(imagesAtom, (draft) => {
    const index = draft.images.findIndex((img) => img.hash === imageHash);
    if (index !== -1) {
      draft.images[index] = {
        ...draft.images[index],
        [field]: value,
      };
    }
  });
};

export const loadWatchFolders = async () => {
  const watchFolders = await window.ipcHandler.watchFolder('read');

  store.set(watchFoldersAtom, () => {
    return watchFolders;
  });
};

export const loadImagesTags = async () => {
  const tags = await window.ipcHandler.tag('read');

  store.set(imagesTagsAtom, () => {
    return tags;
  });
};

export const createImageTag = async (label: string, bgColor: string) => {
  const payload = {
    id: createId(),
    label,
    color: getTextColorFromBackgroundColor(bgColor),
    bgColor,
  };
  await window.ipcHandler.tag('add', payload);

  store.set(imagesTagsAtom, (draft) => {
    draft[payload.id] = payload;
  });

  store.set(settingsAtom, (draft) => {
    if (
      draft.activeTags === undefined ||
      draft.activeTags === '' ||
      draft.activeTags === null
    ) {
      draft.activeTags = payload.id;
    } else {
      const activeTagsArr = draft.activeTags.split(',');
      activeTagsArr.push(payload.id);
      draft.activeTags = activeTagsArr.join(',');
    }
  });
};

export const deleteImageTag = async (tagId: string) => {
  await window.ipcHandler.tag('delete', { id: tagId });

  store.set(imagesTagsAtom, (draft) => {
    const shallowTags = { ...draft };
    delete shallowTags[tagId];
    return shallowTags;
  });

  store.set(settingsAtom, (draft) => {
    const activeTagsSetting =
      draft.activeTags !== '' ? draft.activeTags?.split(',') || [] : [];
    const activeTagsSettingIndex = activeTagsSetting.findIndex(
      (t) => t === tagId,
    );
    if (activeTagsSettingIndex !== -1) {
      activeTagsSetting.splice(activeTagsSettingIndex, 1);
      draft.activeTags = activeTagsSetting.join(',');
    }
  });
};

export const editImageTag = async (
  tagId: string,
  label: string,
  bgColor: string,
) => {
  const payload = {
    id: tagId,
    label,
    bgColor,
    color: getTextColorFromBackgroundColor(bgColor),
  };
  await window.ipcHandler.tag('edit', payload);

  store.set(imagesTagsAtom, (draft) => {
    draft[tagId] = payload;
  });
};

export const tagImage = async (tagId: string, imageHash: string) => {
  await window.ipcHandler.tagImage(tagId, imageHash);

  store.set(imagesAtom, (draft) => {
    const image = draft.images.find((img) => img.hash === imageHash);
    if (image) {
      if (image.tags[tagId]) {
        const tags = { ...image.tags };
        delete tags[tagId];
        image.tags = tags;
      } else {
        image.tags[tagId] = tagId;
      }
    }
  });
};

export const removeAllImagesTags = async (imageHash: string) => {
  await window.ipcHandler.removeAllImageTags(imageHash);

  store.set(imagesAtom, (draft) => {
    const image = draft.images.find((img) => img.hash === imageHash);
    if (image) {
      image.tags = {};
    }
  });
};

export const regenerateThumbnails = async () => {
  store.set(imagesAtom, (draft) => {
    draft.loading = true;
  });

  await window.ipcHandler.regenerateThumbnails();

  store.set(imagesAtom, (draft) => {
    draft.loading = false;
  });
};

export const setActiveTags = async (selectedTags?: SelectValue) => {
  const payload = Array.isArray(selectedTags)
    ? selectedTags.map((t) => t.value).join(',')
    : '';
  await window.ipcHandler.settings('save', 'activeTags', payload);

  store.set(settingsAtom, (draft) => {
    draft.activeTags = payload;
  });
};

export const setAutoImportTags = async (selectedTags?: SelectValue) => {
  const payload = Array.isArray(selectedTags)
    ? selectedTags.map((t) => t.value).join(',')
    : '';
  await window.ipcHandler.settings('save', 'autoImportTags', payload);

  store.set(settingsAtom, (draft) => {
    draft.autoImportTags = payload;
  });
};
