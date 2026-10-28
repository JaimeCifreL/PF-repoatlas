"use client";

import {
  Activity,
  FolderTree,
  GitBranch,
  LayoutDashboard,
  Network,
} from "lucide-react";

export type WorkspaceView = "overview" | "map" | "impact";

type SidebarProps = {
  activeView: WorkspaceView;
  onChangeView: (view: WorkspaceView) => void;
};

const navigation = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "map",
    label: "Dependency map",
    icon: Network,
  },
  {
    id: "impact",
    label: "Impact analysis",
    icon: Activity,
  },
] as const;

export function Sidebar({
  activeView,
  onChangeView,
}: SidebarProps) {
  return (
    <aside className="w-full shrink-0 border-b border-[#1d2b38] bg-[#0d1420] lg:min-h-screen lg:w-[235px] lg:border-r lg:border-b-0">

      <div className="flex h-[74px] items-center gap-3 border-b border-[#1d2b38] px-5">
        <div className="rounded-lg border border-[#147d70] bg-[#10312f] p-2">
          <GitBranch size={19} className="text-[#23d1ad]" />
        </div>

        <div>
          <div className="text-[15px] font-extrabold tracking-widest">
            REPO<span className="text-[#23d1ad]">ATLAS</span>
          </div>

          <div className="text-[9px] tracking-[0.17em] text-[#71879a]">
            CODEBASE INTELLIGENCE
          </div>
        </div>
      </div>

      <div className="px-3 py-7">
        <div className="mb-4 px-3 text-[10px] tracking-widest text-[#62778a]">
          WORKSPACE
        </div>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                  active
                    ? "border-[#185c57] bg-[#10312f] text-[#42e2bf]"
                    : "border-transparent text-[#76899b] hover:bg-[#172431] hover:text-[#dceaf2]"
                }`}
              >
                <Icon size={17} />

                <span>{item.label}</span>

                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#42e2bf]" />
                )}
              </button>
            );
          })}

          <div
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#526778]"
            aria-disabled="true"
          >
            <FolderTree size={17} />
            File explorer

            <span className="ml-auto font-mono text-[9px]">
              SOON
            </span>
          </div>
        </nav>
      </div>

      <div className="mx-4 border-t border-[#253342] pt-6">
        <div className="text-[10px] tracking-widest text-[#62778a]">
          ENVIRONMENT
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-[#9db4c3]">
          <span className="h-2 w-2 rounded-full bg-[#23d1ad]" />
          Development mode
        </div>

        <div className="mt-2 font-mono text-[10px] text-[#597083]">
          v0.1.0 / LOCAL
        </div>
      </div>
    </aside>
  );
}
