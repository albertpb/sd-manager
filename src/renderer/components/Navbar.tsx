import classNames from 'classnames';
import { useLocation, Link } from 'react-router-dom';
import useTab, { tabs } from 'renderer/hooks/tabs';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'renderer/redux';
import { createSelector } from '@reduxjs/toolkit';
import {
  deleteImages,
  setFilterCheckpoint,
  setNavbarSearchInputValue,
} from 'renderer/redux/reducers/global';
import ConfirmDialog from './ConfirmDialog';

export default function Navbar() {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const currentTab = useTab();
  const searchRef = useRef<HTMLInputElement>(null);
  const navbarDisabled = useSelector(
    (state: RootState) => state.global.navbarDisabled,
  );
  const searchValue = useSelector(
    (state: RootState) => state.global.navbarSearchInput,
  );
  const imagesToDelete = useSelector(
    (state: RootState) => state.global.imagesToDelete,
  );
  const imagesToDeleteCount = createSelector(
    (state: typeof imagesToDelete) => state,
    (itd) => Object.keys(itd).length,
  )(imagesToDelete);

  const models = useSelector(
    (state: RootState) => state.global.checkpoint.models,
  );
  const checkpoints = createSelector(
    (state: typeof models) => state,
    (chkps) => Object.values(chkps),
  )(models);
  const filterCheckpoint = useSelector(
    (state: RootState) => state.global.filterCheckpoint,
  );

  const [cofirmDialogIsOpen, setConfirmDialogIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const keyListener = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'f') {
        if (location.pathname !== '/image-metadata') {
          if (searchRef.current !== null) {
            searchRef.current.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', keyListener);

    return () => {
      document.removeEventListener('keydown', keyListener);
    };
  }, [location.pathname]);

  const onDeleteImages = () => {
    dispatch(deleteImages());
  };

  const changeFilterCheckpoint = (checkpointName: string) => {
    dispatch(setFilterCheckpoint(checkpointName));
  };

  const imagesToDeleteButton =
    imagesToDeleteCount > 0 && !navbarDisabled ? (
      <button
        type="button"
        className="mx-1 btn btn-outline btn-info"
        onClick={() => setConfirmDialogIsOpen(true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
        Delete {imagesToDeleteCount}
      </button>
    ) : null;

  const tabsList = Object.values(tabs).map((t) => (
    <li key={t.id}>
      <Link
        to={t.path}
        className={classNames([
          { active: t.id === currentTab },
          { disabled: navbarDisabled },
        ])}
        onClick={(e) => {
          if (navbarDisabled) e.preventDefault();
        }}
      >
        {t.label}
      </Link>
    </li>
  ));

  return (
    <>
      <nav className="navbar bg-base-200 fixed top-0 z-50">
        <div className="navbar-start">
          <div className="dropdown">
            <label
              htmlFor="tabList"
              tabIndex={0}
              className="btn btn-ghost xl:hidden"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h8m-8 6h16"
                />
              </svg>
            </label>

            <ul
              id="tabList"
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
            >
              {tabsList}
            </ul>
          </div>
          <button className="btn btn-ghost normal-case text-xl" type="button">
            SD Manager
          </button>
          <div className="hidden xl:flex">
            <ul className="menu menu-horizontal px-1">{tabsList}</ul>
          </div>
        </div>
        <div className="navbar-end">
          {imagesToDeleteButton}
          {location.pathname === '/images' ? (
            <div className="mx-2 hidden xl:block">
              <select
                className="select select-bordered w-full max-w-xs"
                value={filterCheckpoint}
                onChange={(e) => changeFilterCheckpoint(e.target.value)}
              >
                <option value="">None</option>
                {checkpoints.map((chkpt) => (
                  <option
                    value={chkpt.name}
                    key={`navbar_checkpoint_select_${chkpt.hash}`}
                  >
                    {chkpt.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="form-control hidden xl:block">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search"
              className={classNames([
                'input input-bordered w-96',
                {
                  'input-primary': searchValue !== '',
                },
              ])}
              value={searchValue}
              onChange={(e) =>
                dispatch(setNavbarSearchInputValue(e.target.value))
              }
            />
          </div>
          <Link
            className={classNames([
              'btn btn-square btn-ghost',
              { disabled: navbarDisabled },
            ])}
            to="/settings"
            onClick={(e) => {
              if (navbarDisabled) e.preventDefault();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
              />
            </svg>
          </Link>
        </div>
      </nav>
      <ConfirmDialog
        msg="Are you sure to delete selected images ?, only images from destination folder will be deleted"
        isOpen={cofirmDialogIsOpen}
        onClose={() => setConfirmDialogIsOpen(false)}
        onConfirm={() => onDeleteImages()}
      />
    </>
  );
}
