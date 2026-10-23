'use client';

import Uploader from '@/components/studio/Uploader';
import Workspace from '@/components/studio/Workspace';
import WorkspaceSkeleton from '@/components/studio/WorkspaceSkeleton';
import { useDocumentStore } from '@/app/store/documentStore';
import ProtectedRoute from '../components/ProtectedRoutes';

export default function StudioPage() {
    const { status } = useDocumentStore();

    return (
        <ProtectedRoute>
            <div className="container mx-auto py-8 px-4 h-screen max-h-screen mt-20">
                {status === 'idle' || status === 'error' ? (
                    <div className="h-full flex flex-col justify-center">
                        <Uploader />
                    </div>
                ) : status === 'analyzing' ? (
                    <WorkspaceSkeleton />
                ) : (
                    <Workspace />
                )}
            </div>
        </ProtectedRoute>
    );
}
