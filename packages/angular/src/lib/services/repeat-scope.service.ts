import { Injectable } from "@angular/core";

/**
 * Per-item scope for elements rendered inside a `repeat`. Provided via a child
 * `EnvironmentInjector` so `$item` / `$index` / `$bindItem` expressions resolve
 * against the current iteration.
 *
 * Internal to the renderer's repeat mechanics.
 */
@Injectable()
export class RepeatScopeService {
  item: unknown = undefined;
  index = 0;
  basePath = "";
}
