import classNames from 'classnames';
import { Tag } from 'main/ipc/tag';
import { KeyboardEvent, MouseEvent, useState } from 'react';
import ClickAwayListener from 'react-click-away-listener';
import { useNavigate } from 'react-router-dom';
import { SelectValue } from 'react-tailwindcss-select/dist/components/type';
import ColorPicker from 'renderer/components/ColorPicker';
import MultiSelect from 'renderer/components/MultiSelect';

type TaggerProps = {
  onSetActiveTags: (
    e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    value: SelectValue,
  ) => void;
  onSetAutoImportTags?: (
    e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    value: SelectValue,
  ) => void;
  activeTags: string | null;
  tags: Tag[];
  tagsMap: Record<string, Tag>;
  autoTagImportImages?: string | null;
  autoImportTags?: string | null;
  filterByTags: Set<string>;
  onFilterByTag: (tag: Tag) => void;
  onAddTag: (label: string, bgColor: string) => void;
};

export default function Tagger({
  onSetActiveTags,
  onSetAutoImportTags,
  activeTags,
  tags,
  tagsMap,
  autoTagImportImages,
  autoImportTags,
  filterByTags,
  onFilterByTag,
  onAddTag,
}: TaggerProps) {
  const [tagsDropdownActive, setTagsDropdownActive] = useState<boolean>(false);
  const [addTagLabel, setAddTagLabel] = useState<string>('');
  const [addTagBgColor, setAddTagBgColor] = useState<string>('#269310');

  const navigate = useNavigate();

  const onAddTagKeyPress = async (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      // const target = e.target as HTMLInputElement;
      // target.blur();
      onAddTag(addTagLabel, addTagBgColor);
    }
  };

  return (
    <li
      className={classNames([
        'dropdown dropdown-right',
        {
          'dropdown-open': tagsDropdownActive,
        },
      ])}
    >
      <button
        aria-label="tags"
        type="button"
        onClick={() => setTagsDropdownActive(true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 6h.008v.008H6V6z"
          />
        </svg>
        <ClickAwayListener onClickAway={() => setTagsDropdownActive(false)}>
          <ul className="dropdown-content cursor-default z-[999] menu p-2 shadow-xl bg-base-200 rounded-box w-fit">
            <div className="w-64 p-2 flex flex-col relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 absolute top-2 right-2 cursor-pointer hover:text-primary"
                onClick={() => navigate('/settings')}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>

              <div className="flex flex-col">
                <div className="form-control w-full max-w-xs">
                  <label className="label">
                    <span className="label-text">Active tag</span>
                  </label>
                  <MultiSelect
                    options={tags.map((tag) => ({
                      label: tag.label,
                      value: tag.id,
                    }))}
                    onChange={(e, value) => onSetActiveTags(e, value)}
                    value={
                      activeTags && activeTags !== ''
                        ? activeTags.split(',').map((t) => ({
                            label: tagsMap[t]?.label,
                            value: tagsMap[t]?.id,
                          }))
                        : []
                    }
                  />
                </div>
                <div className="mt-4">
                  <kbd className="kbd kbd-sm">Shift</kbd> +{' '}
                  <kbd className="kbd kbd-sm">Click</kbd>
                  <span className="ml-2">To tag image</span>
                </div>
              </div>
              {autoTagImportImages === '1' && (
                <>
                  <div className="divider m-0 mt-2 p-0" />
                  <div className="flex flex-col">
                    <div className="form-control w-full max-w-xs">
                      <label className="label">
                        <span className="label-text">Auto import tag</span>
                      </label>
                      <MultiSelect
                        options={tags.map((tag) => ({
                          label: tag.label,
                          value: tag.id,
                        }))}
                        onChange={(e, value) =>
                          onSetAutoImportTags && onSetAutoImportTags(e, value)
                        }
                        value={
                          autoImportTags && autoImportTags !== ''
                            ? autoImportTags.split(',').map((t) => ({
                                label: tagsMap[t]?.label,
                                value: tagsMap[t]?.id,
                              }))
                            : []
                        }
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="divider m-0 mt-2 p-0" />
              <div className="mt-2">
                <p className="">Click to filter: </p>
                <div className="flex flex-wrap flex-row">
                  {tags.map((tag) => {
                    return (
                      <div
                        key={tag.id}
                        className={classNames(
                          'badge gap-2 cursor-pointer mr-2 mt-2',
                          {
                            'opacity-100': filterByTags.has(tag.id),
                            'opacity-50': !filterByTags.has(tag.id),
                          },
                        )}
                        style={{
                          color: tag.color,
                          background: tag.bgColor,
                          borderWidth: 1,
                        }}
                        onClick={() => onFilterByTag(tag)}
                        aria-hidden
                      >
                        {tag.label}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="divider m-0 mt-2 p-0" />
              <div className="mt-2 flex flex-row items-center">
                <input
                  type="text"
                  placeholder="Type tag label"
                  className="input input-bordered input-sm w-full mr-2 max-w-xs"
                  value={addTagLabel}
                  onChange={(e) => setAddTagLabel(e.target.value)}
                  onKeyDown={(e) => onAddTagKeyPress(e)}
                />
                <ColorPicker
                  color={addTagBgColor}
                  onChange={(color) => setAddTagBgColor(color)}
                />
                <a
                  type="button"
                  href="#images"
                  className="btn btn-sm ml-1"
                  onClick={() => onAddTag(addTagLabel, addTagBgColor)}
                >
                  Add
                </a>
              </div>
            </div>
          </ul>
        </ClickAwayListener>
      </button>
    </li>
  );
}
