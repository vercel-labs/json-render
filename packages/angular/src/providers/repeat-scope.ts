import {
  Component,
  Injectable,
  InjectionToken,
  Input,
  inject,
} from "@angular/core";

export interface RepeatScopeValue {
  item: unknown;
  index: number;
  basePath: string;
}

export const REPEAT_SCOPE_CONTEXT = new InjectionToken<RepeatScopeValue>(
  "json-render:repeat-scope",
);

@Injectable()
class RepeatScopeContextService implements RepeatScopeValue {
  item: unknown = undefined;
  index = 0;
  basePath = "";

  configure(value: RepeatScopeValue): void {
    this.item = value.item;
    this.index = value.index;
    this.basePath = value.basePath;
  }
}

@Component({
  selector: "json-render-repeat-scope-provider",
  standalone: true,
  template: `<ng-content />`,
  providers: [
    RepeatScopeContextService,
    {
      provide: REPEAT_SCOPE_CONTEXT,
      useExisting: RepeatScopeContextService,
    },
  ],
})
export class RepeatScopeProvider {
  private readonly ctx = inject(RepeatScopeContextService);

  @Input({ required: true }) item!: unknown;
  @Input({ required: true }) index!: number;
  @Input({ required: true }) basePath!: string;

  ngOnInit(): void {
    this.sync();
  }

  ngOnChanges(): void {
    this.sync();
  }

  private sync(): void {
    this.ctx.configure({
      item: this.item,
      index: this.index,
      basePath: this.basePath,
    });
  }
}

export function useRepeatScope(): RepeatScopeValue | null {
  return inject(REPEAT_SCOPE_CONTEXT, { optional: true }) ?? null;
}
