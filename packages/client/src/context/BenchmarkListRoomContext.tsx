import { createContext, ReactNode, useContext, useState } from 'react';

/**
 * Context value shape for sharing benchmark list data.
 */
interface BenchmarkListRoomContextType {
    benchmarkList: string[];
}

const BenchmarkListRoomContext =
    createContext<BenchmarkListRoomContextType | null>(null);

/**
 * Props for the Provider. Wrap any subtree that needs access to the benchmark list.
 */
interface Props {
    children: ReactNode;
}

export function BenchmarkListRoomContextProvider({ children }: Props) {
    // Holds the list of available benchmarks in the current room/scope.
    const [benchmarkList] = useState<string[]>(['GAIA', 'ACEBench evaluation 2 jitetfdfdfdf', 'GAIA2']);

    return (
        <BenchmarkListRoomContext.Provider value={{ benchmarkList }}>
            {children}
        </BenchmarkListRoomContext.Provider>
    );
}

/**
 * Hook to access the benchmark list room context.
 * Must be used within a BenchmarkListRoomContextProvider.
 */
export function useBenchmarkListRoom() {
    const context = useContext(BenchmarkListRoomContext);
    if (!context) {
        throw new Error(
            'useBenchmarkListRoom must be used within a BenchmarkListRoomContextProvider',
        );
    }
    return context;
}
