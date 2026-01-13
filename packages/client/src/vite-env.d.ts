/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module '*.json' {
    const value: Record<string, unknown>;
    export default value;
}
