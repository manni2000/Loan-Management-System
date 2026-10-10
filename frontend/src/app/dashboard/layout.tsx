import { Protected } from '@/components/AuthProvider';
import { Shell } from '@/components/Shell';
export default function Layout({ children }: { children: React.ReactNode }) { return <Protected><Shell>{children}</Shell></Protected>; }
