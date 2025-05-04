import { Tag } from 'main/ipc/tag';
import { KeyboardEvent, useState } from 'react';
import { getTextColorFromBackgroundColor } from 'renderer/utils';
import ColorPicker from './ColorPicker';

type TagsTableProps = {
  title: string;
  tags: Tag[];
  updateTag: ({
    id,
    label,
    bgColor,
  }: {
    id: string;
    label: string;
    bgColor: string;
  }) => Promise<void>;
  deleteTag: (tag: Tag) => void;
  addTag: ({ label, bgColor }: { label: string; bgColor: string }) => void;
};

export default function TagsTable({
  tags,
  updateTag,
  deleteTag,
  addTag,
  title,
}: TagsTableProps) {
  const [tagsEditState, setTagsEditState] = useState<
    Record<string, { show: boolean; inputValue: string; bgColor: string }>
  >({});

  const [addTagLabel, setAddTagLabel] = useState<string>('');

  const onUpdateTag = async ({
    id,
    label,
    bgColor,
  }: {
    id: string;
    label: string;
    bgColor: string;
  }) => {
    await updateTag({ id, label, bgColor });
    setTagsEditState({
      ...tagsEditState,
      [id]: { inputValue: '', show: false, bgColor: '#269310' },
    });
  };

  const onAddTag = () => {
    addTag({ label: addTagLabel, bgColor: '#269310' });
  };

  const onEditKeyUp = (e: KeyboardEvent<HTMLElement>, tag: Tag) => {
    if (e.key === 'Enter') {
      updateTag({
        id: tag.id,
        label: tagsEditState[tag.id].inputValue,
        bgColor: tagsEditState[tag.id].bgColor,
      });

      setTagsEditState({
        ...tagsEditState,
        [tag.id]: {
          ...tagsEditState[tag.id],
          show: false,
        },
      });
    }
  };

  return (
    <div>
      <div className="mt-5 flex flex-row justify-between">
        <p className="text-2xl">{title}</p>
      </div>
      <div className="flex flex-row my-4 w-full">
        <input
          value={addTagLabel}
          onChange={(e) => setAddTagLabel(e.target.value)}
          type="text"
          placeholder="Type tag label"
          className="input input-bordered input-secondary input-sm w-full"
          onKeyUp={(e) => (e.key === 'Enter' ? onAddTag() : null)}
        />
        <button
          type="button"
          className="btn btn-sm ml-2"
          onClick={() => onAddTag()}
        >
          Add
        </button>
      </div>
      <div className="mt-2">
        <table className="table">
          <thead>
            <tr>
              <th className="w-full">Tag</th>
              <th className="w-1/3"> </th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={`tags-${tag.id}`}>
                <td>
                  {tagsEditState[tag.id]?.show ? (
                    <div className="flex flex-row items-center">
                      <input
                        value={tagsEditState[tag.id].inputValue}
                        onChange={(e) =>
                          setTagsEditState({
                            ...tagsEditState,
                            [tag.id]: {
                              ...tagsEditState[tag.id],
                              inputValue: e.target.value,
                            },
                          })
                        }
                        onKeyUp={(e) => onEditKeyUp(e, tag)}
                        type="text"
                        placeholder="Type tag"
                        className="input input-bordered input-sm w-full"
                      />
                      <ColorPicker
                        className="ml-4"
                        color={tagsEditState[tag.id].bgColor}
                        onChange={(color) =>
                          setTagsEditState({
                            ...tagsEditState,
                            [tag.id]: {
                              ...tagsEditState[tag.id],
                              bgColor: color,
                            },
                          })
                        }
                      />
                      <div
                        className="badge ml-4"
                        style={{
                          color: getTextColorFromBackgroundColor(
                            tagsEditState[tag.id].bgColor,
                          ),
                          background: tagsEditState[tag.id].bgColor,
                        }}
                      >
                        {tagsEditState[tag.id].inputValue}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm ml-4"
                        onClick={() =>
                          onUpdateTag({
                            id: tag.id,
                            label: tagsEditState[tag.id].inputValue,
                            bgColor: tagsEditState[tag.id].bgColor,
                          })
                        }
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    tag.label
                  )}
                </td>
                <td className="flex justify-end">
                  <div className="flex flex-row">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6 cursor-pointer mx-2"
                      onClick={() => {
                        setTagsEditState({
                          ...tagsEditState,
                          [tag.id]:
                            tagsEditState[tag.id] === undefined
                              ? {
                                  inputValue: tag.label,
                                  bgColor: tag.bgColor,
                                  show: true,
                                }
                              : {
                                  ...tagsEditState[tag.id],
                                  show: !tagsEditState[tag.id].show,
                                },
                        });
                      }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6 text-red-500 cursor-pointer mx-2"
                      onClick={() => deleteTag(tag)}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
