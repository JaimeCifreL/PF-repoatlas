
import {
  GitBranch,
  Network,
  LayoutDashboard,
  FolderTree,
  Activity,
} from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-full border-b border-[#1d2b38] bg-[#0d1420] lg:min-h-screen lg:w-[235px] lg:shrink-0 lg:border-b-0 lg:border-r">

      {/* LOGOTIPO */}
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

      {/* NAVEGACIÓN */}
      <div className="px-3 py-7">
        <div className="mb-4 px-3 text-[10px] tracking-widest text-[#62778a]">
          WORKSPACE
        </div>

        <nav className="space-y-1">

          <div className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#76899b]">
            <LayoutDashboard size={17} />
            Overview
            <span className="ml-auto text-[9px]">SOON</span>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-[#185c57] bg-[#10312f] px-3 py-3 text-sm text-[#42e2bf]">
            <Network size={17} />
            Dependency map
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#42e2bf]" />
          </div>

          <div className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#76899b]">
            <Activity size={17} />
            Impact analysis
            <span className="ml-auto text-[9px]">SOON</span>
          </div>

          <div className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#76899b]">
            <FolderTree size={17} />
            File explorer
            <span className="ml-auto text-[9px]">SOON</span>
          </div>

        </nav>
      </div>

      {/* ESTADO DEL ENTORNO */}
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
