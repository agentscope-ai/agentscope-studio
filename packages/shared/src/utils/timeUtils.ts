export function decodeUnixNano(timeUnixNano: string | number): string {
    // 保持纳秒精度，直接返回纳秒时间戳字符串
    return timeUnixNano.toString();
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

// 纳秒时间戳相关工具函数
export function getTimeDifferenceNano(
    startNano: string | number,
    endNano: string | number,
): number {
    const start = Number(startNano);
    const end = Number(endNano);
    return (end - start);
}

export function nanoToISOString(nanoTimestamp: string | number): string {
    const milliseconds = Number(nanoTimestamp) / 1_000_000;
    return new Date(milliseconds).toISOString();
}

export function secondsToNano(seconds: number): number {
    return Number(seconds) * 1_000_000_000;
}

export function millisecondsToNano(milliseconds: number): number {
    return Number(milliseconds) * 1_000_000
}

export function isValidNanoTimestamp(nanoTimestamp: string | number): boolean {
    const nano = Number(nanoTimestamp);
    // 检查是否为有效的纳秒时间戳（1970年1月1日之后，且不超过当前时间太多）
    const minNano = 0; // 1970-01-01 00:00:00 UTC
    const maxNano = Date.now() * 1_000_000 + 365 * 24 * 60 * 60 * 1_000_000; // 当前时间 + 1年
    return !isNaN(nano) && nano >= minNano && nano <= maxNano;
}
