interface LongLike {
    toNumber?: () => number;
    low?: number;
    high?: number;
}

export function decodeUnixNano(timeUnixNano: unknown): string {
    if (timeUnixNano === null || timeUnixNano === undefined) {
        return '0';
    }

    if (typeof timeUnixNano === 'number') {
        return timeUnixNano.toString();
    }

    if (typeof timeUnixNano === 'string') {
        return timeUnixNano;
    }

    // Handle Long type from protobuf
    if (timeUnixNano && typeof timeUnixNano === 'object') {
        const longLike = timeUnixNano as LongLike;
        if (typeof longLike.toNumber === 'function') {
            return longLike.toNumber().toString();
        }
        if (
            typeof longLike.low === 'number' &&
            typeof longLike.high === 'number'
        ) {
            const value = longLike.low + longLike.high * 0x100000000;
            return value.toString();
        }
    }

    return '0';
}

export function encodeUnixNano(isoTimeString: string): string {
    const milliseconds = new Date(isoTimeString).getTime();
    const nanoseconds = milliseconds * 1_000_000;
    return nanoseconds.toString();
}

export function compareISOTimes(time1: string, time2: string): number {
    const date1 = new Date(time1);
    const date2 = new Date(time2);

    if (date1 < date2) return -1;
    if (date1 > date2) return 1;
    return 0;
}

export function getEarlierTime(time1: string, time2: string): string {
    return compareISOTimes(time1, time2) <= 0 ? time1 : time2;
}

export function getLaterTime(time1: string, time2: string): string {
    return compareISOTimes(time1, time2) >= 0 ? time1 : time2;
}

export function isValidISOTime(timeString: string): boolean {
    try {
        const date = new Date(timeString);
        return !isNaN(date.getTime()) && timeString === date.toISOString();
    } catch {
        return false;
    }
}

export function getTimeDifference(
    start: string | number | Date,
    end: string | number | Date,
): number {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return endTime - startTime;
}

export function getTimeDifferenceNano(
    startNano: string | number,
    endNano: string | number,
): number {
    const start = Number(startNano);
    const end = Number(endNano);
    return end - start;
}

export function nanoToISOString(nanoTimestamp: string | number): string {
    const milliseconds = Number(nanoTimestamp) / 1_000_000;
    return new Date(milliseconds).toISOString();
}

export function secondsToNano(seconds: number): number {
    return Number(seconds) * 1_000_000_000;
}

export function millisecondsToNano(milliseconds: number): number {
    return Number(milliseconds) * 1_000_000;
}
