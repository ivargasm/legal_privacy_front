import { create } from 'zustand';

export interface PIIEntity {
    text: string;
    entity_type: string;
    page: number;
    bbox: number[] | null;
    bboxes?: number[][] | null;
    start_char: number;
    end_char: number;
    confidence: number;
    isApproved: boolean; // Field added in frontend to track user approval
    isBlacklisted?: boolean; // Soft delete for instantaneous UI updates
}

interface DocumentState {
    file: File | null;
    fileName: string;
    extractedText: string;
    entities: PIIEntity[];
    status: 'idle' | 'analyzing' | 'reviewing' | 'redacting' | 'error';
    errorMsg: string | null;
    
    setFile: (file: File) => void;
    setAnalysisResult: (text: string, entities: Omit<PIIEntity, 'isApproved' | 'isBlacklisted'>[]) => void;
    addEntity: (entity: PIIEntity) => void;
    setEntityBlacklisted: (text: string, blacklisted: boolean) => void;
    restoreBlacklistedText: (text: string) => void;
    toggleEntityStatus: (index: number) => void;
    setStatus: (status: DocumentState['status']) => void;
    setError: (msg: string) => void;
    reset: () => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
    file: null,
    fileName: '',
    extractedText: '',
    entities: [],
    status: 'idle',
    errorMsg: null,

    setFile: (file) => set({ file, fileName: file.name, status: 'analyzing', errorMsg: null }),
    
    setAnalysisResult: (text, entities) => {
        // Map backend entities to add the isApproved flag
        const mappedEntities = entities.map((ent: Omit<PIIEntity, 'isApproved' | 'isBlacklisted'>) => ({
            ...ent,
            isApproved: true,
            isBlacklisted: false
        }));
        set({ extractedText: text, entities: mappedEntities, status: 'reviewing' });
    },
    
    addEntity: (entity: PIIEntity) => set((state) => {
        const newEntities = [...state.entities, entity];
        // Keep them sorted by start_char
        newEntities.sort((a, b) => a.start_char - b.start_char);
        return { entities: newEntities };
    }),

    setEntityBlacklisted: (text, blacklisted) => set((state) => {
        const newEntities = state.entities.map(ent => 
            ent.text.toLowerCase() === text.toLowerCase() ? { ...ent, isBlacklisted: blacklisted } : ent
        );
        return { entities: newEntities };
    }),

    restoreBlacklistedText: (text) => set((state) => {
        const newEntities = state.entities.map(ent => 
            ent.text.toLowerCase() === text.toLowerCase() ? { ...ent, isBlacklisted: false } : ent
        );
        return { entities: newEntities };
    }),
    
    toggleEntityStatus: (index) => set((state) => {
        const newEntities = [...state.entities];
        newEntities[index].isApproved = !newEntities[index].isApproved;
        return { entities: newEntities };
    }),
    
    setStatus: (status) => set({ status }),
    setError: (msg) => set({ errorMsg: msg, status: 'error' }),
    
    reset: () => set({ file: null, fileName: '', extractedText: '', entities: [], status: 'idle', errorMsg: null })
}));
