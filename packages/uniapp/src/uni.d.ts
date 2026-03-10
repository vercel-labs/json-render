/**
 * Minimal type declarations for the UniApp global `uni` object.
 * Covers only the APIs used by @json-render/uniapp.
 *
 * For full type coverage, install `@dcloudio/uni-app`.
 */
declare namespace UniApp {
  interface ShowModalOptions {
    title?: string;
    content?: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    cancelColor?: string;
    success?: (res: { confirm: boolean; cancel: boolean }) => void;
    fail?: (err: unknown) => void;
    complete?: () => void;
  }

  interface NavigateToOptions {
    url: string;
    success?: () => void;
    fail?: (err: unknown) => void;
    complete?: () => void;
  }

  interface NavigateBackOptions {
    delta?: number;
    success?: () => void;
    fail?: (err: unknown) => void;
    complete?: () => void;
  }

  interface RedirectToOptions {
    url: string;
    success?: () => void;
    fail?: (err: unknown) => void;
    complete?: () => void;
  }

  interface SwitchTabOptions {
    url: string;
    success?: () => void;
    fail?: (err: unknown) => void;
    complete?: () => void;
  }

  interface RequestOptions {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
    data?: unknown;
    header?: Record<string, string>;
    success?: (res: { statusCode: number; data: unknown }) => void;
    fail?: (err: { errMsg?: string }) => void;
    complete?: () => void;
  }
}

interface UniInstance {
  showModal(options: UniApp.ShowModalOptions): void;
  navigateTo(options: UniApp.NavigateToOptions): void;
  navigateBack(options: UniApp.NavigateBackOptions): void;
  redirectTo(options: UniApp.RedirectToOptions): void;
  switchTab(options: UniApp.SwitchTabOptions): void;
  request(options: UniApp.RequestOptions): void;
}

declare const uni: UniInstance | undefined;
