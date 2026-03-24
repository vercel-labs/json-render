import {
  Component,
  Injectable,
  InjectionToken,
  Signal,
  computed,
  inject,
} from "@angular/core";
import {
  evaluateVisibility,
  type VisibilityCondition,
  type VisibilityContext as CoreVisibilityContext,
} from "@json-render/core";
import { useStateStore } from "./state";

export interface VisibilityContextValue {
  isVisible: (condition: VisibilityCondition | undefined) => boolean;
  ctx: Signal<CoreVisibilityContext>;
}

export const VISIBILITY_CONTEXT = new InjectionToken<VisibilityContextValue>(
  "json-render:visibility",
);

@Injectable()
class VisibilityContextService implements VisibilityContextValue {
  private readonly state = useStateStore();

  readonly ctx = computed<CoreVisibilityContext>(() => ({
    stateModel: this.state.state(),
  }));

  isVisible(condition: VisibilityCondition | undefined): boolean {
    return evaluateVisibility(condition, this.ctx());
  }
}

@Component({
  selector: "json-render-visibility-provider",
  standalone: true,
  template: `<ng-content />`,
  providers: [
    VisibilityContextService,
    {
      provide: VISIBILITY_CONTEXT,
      useExisting: VisibilityContextService,
    },
  ],
})
export class VisibilityProvider {}

export function useVisibility(): VisibilityContextValue {
  return inject(VISIBILITY_CONTEXT);
}

export function useIsVisible(
  condition: VisibilityCondition | undefined,
): Signal<boolean> {
  const { ctx } = useVisibility();
  return computed(() => evaluateVisibility(condition, ctx()));
}
