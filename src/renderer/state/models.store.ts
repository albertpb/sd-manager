import { createId } from '@paralleldrive/cuid2';
import { atom } from 'jotai';
import { atomWithImmer } from 'jotai-immer';
import { getTextColorFromBackgroundColor } from 'renderer/utils';
import { Model, ModelType } from 'main/ipc/model';
import { SelectValue } from 'react-tailwindcss-select/dist/components/type';
import { Tag } from 'main/ipc/tag';
import { ImportProgress } from './interfaces';
import { settingsAtom } from './settings.store';
import { store } from './index';

export type UpdateState = {
  needUpdate: boolean;
  loading: boolean;
};

export type ModelState = {
  models: Record<string, Model>;
  update: Record<string, UpdateState>;
  loading: boolean;
  checkingUpdates: boolean;
  importProgress: ImportProgress;
};

export type ModelWithTags = Omit<Model, 'tags'> & { tags: Tag[] };

export const checkpointsAtom = atomWithImmer<ModelState>({
  models: {},
  update: {},
  loading: false,
  checkingUpdates: false,
  importProgress: {
    message: '',
    progress: 0,
  },
});
checkpointsAtom.debugLabel = 'checkpointsAtom';

export const lorasAtom = atomWithImmer<ModelState>({
  models: {},
  update: {},
  loading: false,
  checkingUpdates: false,
  importProgress: {
    message: '',
    progress: 0,
  },
});
lorasAtom.debugLabel = 'lorasAtom';

export const modelsAtom: Record<ModelType, typeof checkpointsAtom> = {
  lora: lorasAtom,
  checkpoint: checkpointsAtom,
};

export const modelTagsAtom = atomWithImmer<Record<string, Tag>>({});
modelTagsAtom.debugLabel = 'modelTagsAtom';

export const lorasWithTags = atom((get) => {
  const loras = get(lorasAtom);
  const mtags = get(modelTagsAtom);

  return Object.values(loras.models).reduce((acc: ModelWithTags[], lora) => {
    const modelTags = Object.keys(lora.tags).map((t) => mtags[t]);
    acc.push({ ...lora, tags: modelTags });
    return acc;
  }, []);
});
lorasWithTags.debugLabel = 'lorasWithTags';

export const checkpointWithTags = atom((get) => {
  const checkpoints = get(checkpointsAtom);
  const mtags = get(modelTagsAtom);

  return Object.values(checkpoints.models).reduce(
    (acc: ModelWithTags[], checkpoint) => {
      const modelTags = Object.keys(checkpoint.tags).map((t) => mtags[t]);
      acc.push({ ...checkpoint, tags: modelTags });
      return acc;
    },
    [],
  );
});
checkpointWithTags.debugLabel = 'checkpointWithTags';

export const modelsWithTags: Record<ModelType, typeof checkpointWithTags> = {
  lora: lorasWithTags,
  checkpoint: checkpointWithTags,
};

export const loadModels = async (shouldImport: boolean, type: ModelType) => {
  const settings = store.get(settingsAtom);

  store.set(modelsAtom[type], (draft) => {
    draft.loading = true;
  });

  let modelsPath: string | null = '';
  if (type === 'lora') {
    modelsPath = settings.lorasPath;
  }
  if (type === 'checkpoint') {
    modelsPath = settings.checkpointsPath;
  }

  if (shouldImport && modelsPath) {
    await window.ipcHandler.readdirModels(type, modelsPath);
  }

  const models: Record<string, Model> =
    await window.ipcHandler.readModels(type);

  store.set(modelsAtom[type], (draft) => {
    draft.models = models;
    draft.loading = false;
  });
};

export const updateModel = async (
  modelHash: string,
  type: ModelType,
  field: keyof Model,
  value: any,
) => {
  await window.ipcHandler.updateModel(modelHash, field, value);

  store.set(modelsAtom[type], (draft) => {
    draft.models[modelHash] = {
      ...draft.models[modelHash],
      [field]: value,
    };
  });
};

export const loadModelsTags = async () => {
  const tags = await window.ipcHandler.mtag('read');

  store.set(modelTagsAtom, () => {
    return tags;
  });
};

export const createModelTag = async (label: string, bgColor: string) => {
  const payload = {
    id: createId(),
    label,
    color: getTextColorFromBackgroundColor(bgColor),
    bgColor,
  };
  await window.ipcHandler.mtag('add', payload);

  store.set(modelTagsAtom, (draft) => {
    draft[payload.id] = payload;
  });

  store.set(settingsAtom, (draft) => {
    if (
      draft.activeMTags === undefined ||
      draft.activeMTags === '' ||
      draft.activeMTags === null
    ) {
      draft.activeMTags = payload.id;
    } else {
      const activeTagsArr = draft.activeMTags.split(',');
      activeTagsArr.push(payload.id);
      draft.activeMTags = activeTagsArr.join(',');
    }
  });
};

export const deleteModelTag = async (tagId: string) => {
  await window.ipcHandler.mtag('delete', { id: tagId });

  store.set(modelTagsAtom, (draft) => {
    const shallowTags = { ...draft };
    delete shallowTags[tagId];
    return shallowTags;
  });

  store.set(settingsAtom, (draft) => {
    const activeTagsSetting =
      draft.activeMTags !== ''
        ? draft.activeMTags?.split(',') || [draft.activeMTags]
        : [];
    const activeTagsSettingIndex = activeTagsSetting.findIndex(
      (t) => t === tagId,
    );
    if (activeTagsSettingIndex !== -1) {
      activeTagsSetting.splice(activeTagsSettingIndex, 1);
      draft.activeMTags = activeTagsSetting.join(',');
    }
  });
};

export const editModelTag = async (
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
  await window.ipcHandler.mtag('edit', payload);

  store.set(modelTagsAtom, (draft) => {
    draft[tagId] = payload;
  });
};

export const tagModel = async (
  tagId: string,
  modelHash: string,
  type: ModelType,
) => {
  await window.ipcHandler.tagModel(tagId, modelHash);

  store.set(modelsAtom[type], (draft) => {
    const model = draft.models[modelHash];
    if (model) {
      if (model.tags[tagId]) {
        const mtags = { ...model.tags };
        delete mtags[tagId];
        model.tags = mtags;
      } else {
        model.tags[tagId] = tagId;
      }
    }
  });
};

export const removeAllModelsTags = async (
  modelHash: string,
  type: ModelType,
) => {
  await window.ipcHandler.removeAllModelsTags(modelHash);

  store.set(modelsAtom[type], (draft) => {
    draft.models[modelHash].tags = {};
  });
};

export const setActiveMTags = async (selectedTags?: SelectValue) => {
  const payload = Array.isArray(selectedTags)
    ? selectedTags.map((t) => t.value).join(',')
    : '';
  await window.ipcHandler.settings('save', 'activeMTags', payload);

  store.set(settingsAtom, (draft) => {
    draft.activeMTags = payload;
  });
};

export const setModelsCheckingUpdate = (
  type: ModelType,
  modelId: number,
  loading: boolean,
) => {
  store.set(modelsAtom[type], (draft) => {
    if (!draft.update[modelId]) {
      draft.update[modelId] = {
        loading,
        needUpdate: false,
      };
    } else {
      draft.update[modelId].loading = loading;
    }
  });
};

export const setModelsToUpdate = (type: ModelType, modelId: number) => {
  store.set(modelsAtom[type], (draft) => {
    draft.update[modelId] = {
      loading: false,
      needUpdate: true,
    };
  });
};
