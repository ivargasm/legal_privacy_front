'use client';

import Uploader from '@/components/studio/Uploader';
import Workspace from '@/components/studio/Workspace';
import WorkspaceSkeleton from '@/components/studio/WorkspaceSkeleton';
import QuotaExceededModal from '@/components/studio/QuotaExceededModal';
import { useDocumentStore } from '@/app/store/documentStore';
import ProtectedRoute from '../components/ProtectedRoutes';

export default function StudioPage() {
    const { status } = useDocumentStore();

    return (
        <ProtectedRoute>
            {status === 'idle' || status === 'error' ? (
                <main className="w-full min-h-[calc(100vh-3.75rem)] mt-15 py-8 px-4 sm:px-6 bg-[#FAFAFA] dark:bg-slate-950 flex flex-col items-center justify-center">
                    <Uploader />
                </main>
            ) : status === 'analyzing' ? (
                <main className="w-full h-[calc(100vh-3.75rem)] mt-15 p-4 sm:p-6 bg-[#FAFAFA] dark:bg-slate-950">
                    <WorkspaceSkeleton />
                </main>
            ) : (
                <main className="w-full h-[calc(100vh-3.75rem)] mt-15 overflow-hidden">
                    <Workspace />
                </main>
            )}
            <QuotaExceededModal />
        </ProtectedRoute>
    );
}
