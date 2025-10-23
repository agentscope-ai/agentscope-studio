import { createContext, ReactNode, useContext, useState } from 'react';

interface BenchmarkListRoomContextType {
    benchmarkList: string[];
}

const BenchmarkListRoomContext =
    createContext<BenchmarkListRoomContextType | null>(null);

interface Props {
    children: ReactNode;
}

export function BenchmarkListRoomContextProvider({ children }: Props) {
    const [benchmarkList] = useState<string[]>(['GAIA', 'ACEBench evaluation 2 jitetfdfdfdf', 'GAIA2']);

    return (
        <BenchmarkListRoomContext.Provider value={{ benchmarkList }}>
            {children}
        </BenchmarkListRoomContext.Provider>
    );
}

export function useBenchmarkListRoom() {
    const context = useContext(BenchmarkListRoomContext);
    if (!context) {
        throw new Error(
            'useBenchmarkListRoom must be used within a BenchmarkListRoomContextProvider',
        );
    }
    return context;
}
