
"use client";

import Link from "next/link";

import {
  Activity,
  Clock3,
  FolderTree,
  GitBranch,
  LayoutDashboard,
  Network,
} from "lucide-react";

export type WorkspaceView =
  | "overview"
  | "map"
  | "impact"
  | "files";

type Props = {
  activeView: WorkspaceView;
  onChangeView: (
    view: WorkspaceView
  ) => void;
};

const links = [
  {
    id: "overview",
    title: "Overview",
    Icon: LayoutDashboard,
  },
  {
    id: "map",
    title: "Dependency map",
    Icon: Network,
  },
  {
    id: "impact",
    title: "Impact analysis",
    Icon: Activity,
  },
  {
    id: "files",
    title: "File explorer",
    Icon: FolderTree,
  },
] as const;

export function Sidebar({
  activeView,
  onChangeView,
}: Props) {
  return (
    <aside className="w-full shrink-0 border-b border-[#1d2b38] bg-[#0d1420] lg:min-h-screen lg:w-[235px] lg:border-b-0 lg:border-r">

      {/* LOGO */}
      <div className="flex h-[74px] items-center gap-3 border-b border-[#1d2b38] px-5">

        <span className="rounded-lg border border-[#147d70] bg-[#10312f] p-2">
          <GitBranch
            size={19}
            className="text-[#23d1ad]"
          />
        </span>

        <div>
          <div className="text-[15px] font-extrabold tracking-widest text-[#e8eef5]">
            REPO
            <span className="text-[#23d1ad]">
              ATLAS
            </span>
          </div>

          <div className="text-[9px] tracking-[0.17em] text-[#71879a]">
            CODEBASE INTELLIGENCE
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="space-y-1 px-3 py-7">

        <div className="mb-4 px-3 font-mono text-[10px] tracking-widest text-[#62778a]">
          WORKSPACE
        </div>

        {links.map(
          ({
            id,
            title,
            Icon,
          }) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                onChangeView(id)
              }
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${
                activeView === id
                  ? "border border-[#225e52] bg-[#123b34] text-[#73e7c8]"
                  : "border border-transparent text-[#90a6b7] hover:bg-[#142635] hover:text-white"
              }`}
            >
              <Icon size={17}/>
              {title}
            </button>
          )
        )}

        {/* TIME MACHINE */}
        <div className="mt-7 border-t border-[#243442] pt-6">

          <div className="mb-4 px-3 font-mono text-[10px] tracking-widest text-[#62778a]">
            CHANGE INTELLIGENCE
          </div>

          <Link
            href="/time-machine"
            className="flex w-full items-center gap-3 rounded-lg border border-[#246F5E] bg-[#10362E] px-3 py-3 text-sm text-[#75EACA] transition-colors hover:bg-[#185344]"
          >
            <Clock3 size={17}/>
            Time Machine
          </Link>
        </div>

      </nav>

      <div className="hidden border-t border-[#1d2b38] px-5 py-5 font-mono text-[10px] text-[#637b8d] lg:block">
        SOURCE CODE INTELLIGENCE
      </div>
    </aside>
  );
}
