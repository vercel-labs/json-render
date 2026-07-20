// Vitest setup for the Angular package. Runs only within the dedicated Angular
// Vitest project (see packages/angular/vitest.config.mts), so these imports are
// always available here and never affect other packages' test runs.
import "@analogjs/vite-plugin-angular/setup-vitest";
import "zone.js";
import "zone.js/testing";

import { getTestBed } from "@angular/core/testing";
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from "@angular/platform-browser/testing";

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
);
