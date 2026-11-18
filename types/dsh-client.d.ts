/** Ambient contract of the page module table this bundle's client half registers into. */
interface Window {
  __ModuleLoader__: {
    load(definition: {
      id: string
      factory(require: (name: 'react') => typeof import('react')): unknown
    }): void
  }
}

declare module 'react' {
  /** The subset of React the browser half uses. */
  export function createElement(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): unknown
}
