import "zone.js";
import "zone.js/testing";

import { getTestBed } from "@angular/core/testing";
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from "@angular/platform-browser-dynamic/testing";

declare global {
  // eslint-disable-next-line no-var
  var __jsonRenderAngularTestingInitialized: boolean | undefined;
}

if (!globalThis.__jsonRenderAngularTestingInitialized) {
  getTestBed().initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
  globalThis.__jsonRenderAngularTestingInitialized = true;
}
