'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentStore } from '@/app/store/documentStore';

export default function WorkspaceSkeleton() {
    const { file } = useDocumentStore();
    
    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] relative">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Estudio de Revisión</h2>
                    {file ? (
                        <p className="text-muted-foreground">{file.name}</p>
                    ) : (
                        <Skeleton className="h-4 w-48 mt-1" />
                    )}
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-[150px]" />
                    <Skeleton className="h-10 w-[95px]" />
                    <Skeleton className="h-10 w-[145px]" />
                </div>
            </div>

            <div className="flex gap-6 h-full overflow-hidden">
                {/* Panel Izquierdo: Visor de Texto */}
                <Card className="flex-1 flex flex-col overflow-hidden">
                    <CardHeader className="py-3 bg-muted/30 border-b">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                            Extrayendo contenido y buscando entidades sensibles...
                            <Skeleton className="h-4 w-24" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 flex-1 overflow-hidden">
                        <div className="space-y-4 max-w-3xl">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[90%]" />
                            <Skeleton className="h-4 w-[95%]" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[80%]" />
                            
                            <div className="py-6 space-y-4">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                            
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[85%]" />
                            <Skeleton className="h-4 w-[90%]" />
                            <Skeleton className="h-4 w-full" />
                            
                            <div className="py-6 space-y-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-[80%]" />
                                <Skeleton className="h-4 w-[60%]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Panel Derecho: Entidades */}
                <Card className="w-96 flex flex-col overflow-hidden">
                    <CardHeader className="py-3 bg-muted/30 border-b">
                        <CardTitle className="text-sm font-medium flex justify-between items-center text-muted-foreground">
                            Identificando PII
                            <Skeleton className="h-5 w-8 rounded-full animate-pulse" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 overflow-hidden">
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex flex-col p-4 rounded-lg border border-dashed bg-muted/10">
                                    <div className="flex items-start space-x-3">
                                        <Skeleton className="h-4 w-4 rounded-sm mt-1" />
                                        <div className="flex-1 space-y-3">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-3 w-48" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <Skeleton className="h-6 w-28" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
