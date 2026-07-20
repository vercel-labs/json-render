import { Directive, ViewContainerRef, inject } from "@angular/core";

/**
 * Marks where a registered component's children should render.
 *
 * ```html
 * <div class="card">
 *   <ng-template jsonRenderChildren></ng-template>
 * </div>
 * ```
 *
 * A registered component exposes the outlet as a field named `childrenOutlet`
 * (via `@ViewChild(ChildrenOutletDirective)`), and the renderer projects
 * children into it. Without an outlet, children render after the component's
 * host element.
 */
@Directive({
  selector: "[jsonRenderChildren]",
  standalone: true,
  exportAs: "jsonRenderChildren",
})
export class ChildrenOutletDirective {
  readonly vcr = inject(ViewContainerRef);
}
