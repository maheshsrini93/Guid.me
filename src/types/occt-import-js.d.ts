/**
 * Ambient module declaration for `occt-import-js` (no upstream types).
 * The full shape is described inline in
 * `src/lib/agents/source-adapter/cad/step-parser.ts`; this declaration just
 * silences TS7016 for the dynamic `import("occt-import-js")` call.
 */
declare module "occt-import-js" {
  const factory: () => Promise<unknown>;
  export default factory;
}
