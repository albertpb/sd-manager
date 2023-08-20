import * as React from 'react';

declare module 'react' {
  interface CSSProperties {
    '--value'?: number;
    '--size'?: string;
    '--thickness'?: string;
  }
}
