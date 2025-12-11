/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare const __APP_VERSION__: string;

declare module '*.json' {
    const value: any;
    export default value;
}
