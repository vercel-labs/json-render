import { Injectable, computed, inject } from "@angular/core";
import { evaluateVisibility } from "@json-render/core";
import type {
  PropResolutionContext,
  VisibilityCondition,
} from "@json-render/core";

import { SpecStateService } from "./spec-state.service";
import {
  JSON_RENDER_DIRECTIVES,
  JSON_RENDER_FUNCTIONS,
} from "../registry/registry.token";

/**
 * Evaluates visibility conditions against the live state model, `$computed`
 * functions, and custom directives.
 */
@Injectable()
export class VisibilityService {
  private readonly stateService = inject(SpecStateService);
  private readonly functions =
    inject(JSON_RENDER_FUNCTIONS, { optional: true }) ?? {};
  private readonly directives =
    inject(JSON_RENDER_DIRECTIVES, { optional: true }) ?? new Map();

  readonly ctx = computed<PropResolutionContext>(() => ({
    stateModel: this.stateService.state(),
    functions: this.functions,
    directives: this.directives,
  }));

  isVisible(condition: VisibilityCondition | undefined): boolean {
    return evaluateVisibility(condition, this.ctx());
  }
}
