declare global {
  interface Window {
    Cypress?: unknown;
    __nightmare?: unknown;
    _phantom?: unknown;
    unexpected?: {
      q?: Event[];
    };
    trackCustomEvent: (
      name: string,
      data: { [key: string]: string | number | boolean }
    ) => Promise<void>;
  }
}

export type EventType = "PageView" | string;

export interface EventBase {
  t: EventType;
  u: string;
  v?: string;
}

export interface EventPageView extends EventBase {
  t: "PageView";
  h?: boolean;
  r?: string;
}

export interface EventCustom extends EventBase {
  t: string;
  h?: boolean;
  p?: {
    [key: string]: boolean | string | number;
  };
}

export type Event = EventPageView;

type EventStripMetadata<T extends EventBase> = Omit<T, "s" | "u">;

export type EventPageViewReduced = EventStripMetadata<EventPageView>;
export type EventCustomEventReduced = EventStripMetadata<EventCustom>;

export interface CombinedEvents {
  u: string;
  e: [EventPageViewReduced | EventCustomEventReduced];
  qs?: Record<string, string>;
}
