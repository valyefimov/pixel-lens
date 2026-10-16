import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { INSPECT_KEY, inspectApi } from "@/lib/inspect-api";

/**
 * Evaluated inside the inspected page by the DevTools panel (see entrypoints/devtools-panel/page-api.ts).
 * It only installs the read-only data API and leaves nothing else behind.
 */
export default defineUnlistedScript(() => {
  Object.defineProperty(window, Symbol.for(INSPECT_KEY), { value: inspectApi, configurable: true });
});
