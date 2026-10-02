declare module '*.svg' {
  const url: string; // base64 data: URL (svg-b64 plugin in build.mjs)
  export default url;
}

declare module 'kyt:build' {
  const id: string; // unique per build (build.mjs)
  export default id;
}
