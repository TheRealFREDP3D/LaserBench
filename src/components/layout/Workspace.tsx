import type {ReactNode} from 'react';

interface WorkspaceProps {
  children: ReactNode;
}

export default function Workspace({ children }: WorkspaceProps) {
  return (
    <div id="main-content" tabIndex={-1} className="flex flex-1 overflow-hidden overflow-x-hidden">
      {children}
    </div>
  );
}
