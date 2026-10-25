import { ViewTransition } from 'react';

// Each route change crossfades: the old page fades out and lifts slightly, the new one fades in and rises into place.
// The header lives in the layout, outside this wrapper, so it stays put. The classes are styled in globals.css.
export default function Template({ children }: { children: React.ReactNode }) {
  return <ViewTransition enter="page-in" exit="page-out" default="none">{children}</ViewTransition>;
}
