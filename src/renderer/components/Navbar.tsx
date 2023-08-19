import classNames from 'classnames';
import useTab, { tabs } from 'hooks/tabs';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const currentTab = useTab();

  return (
    <nav className="navbar bg-base-200">
      <div className="flex-none">
        <button className="btn btn-square btn-ghost" type="button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="inline-block w-5 h-5 stroke-current"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
      <div className="mx-2">
        <button className="normal-case text-xl" type="button">
          SD Manager
        </button>
      </div>
      <div className="flex-1 tabs tabs-boxed m-2">
        {Object.values(tabs).map((t) => (
          <Link
            key={t.id}
            to={t.path}
            className={classNames('tab', {
              'tab-active': currentTab === t.id,
            })}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="flex-none">
        <Link className="btn btn-square btn-ghost" to="/settings">
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
  );
}
