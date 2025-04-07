declare global {
  interface Window {
    Cypress?: unknown;
    __nightmare?: unknown;
    _phantom?: unknown;
    unexpected?: {
      q?: Event[];
    };
    // window.stonks.event("click button");
    // window.stonks.event("click button", {
    //   key1: "props1",
    // });
    // window.stonks.event("click button", "/path", {
    //   key1: "props1",
    // });
    // window.stonks.event("click button", "/path");
    trackCustomEvent: (
      name: string,
      data: Record<string, string>
    ) => Promise<void>;
    trackPageViewEvent: (data: Record<string, string>) => Promise<void>;
    stonks: {
      event: (
        name: string,
        arg2?: Record<string, string> | string,
        props?: Record<string, string>
      ) => Promise<void>;
      view: (
        arg1?: string | Record<string, string>,
        arg2?: Record<string, string>
      ) => Promise<void>;
    };
  }
}

export type ViewArguments = {
  path?: string;
  props?: Record<string, string>;
};

export type Event = {
  type: string;
  props?: Record<string, string>;
  referrer?: string;
  path?: string;
  utm?: Record<string, string>;
};

// Short notations
// u: url
// t: type
// h: hash routing
// r: referrer
// p: properties
// e: events
// qs: utm params
export type MinimizedEvent = {
  t: string;
  h?: boolean | undefined; // ToDo: how hash works
  r?: string | undefined;
  p?: Record<string, string>;
};

export type BodyToSend = {
  u: string;
  debug?: boolean;
  e: [MinimizedEvent];
  qs?: Record<string, string>;
};
