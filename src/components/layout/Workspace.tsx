import type {ReactNode} from 'react';

interface WorkspaceProps {
  children: ReactNode;
}

export default function Workspace({ children }: WorkspaceProps) {
  return (
    <div className="flex flex-1 overflow-hidden overflow-x-hidden">
      {children}
    </div>
  );
}
