import React, { PropsWithChildren } from 'react';

export function EmptyMockComponent(props: PropsWithChildren): React.ReactNode {
  return <>{props.children}</>;
}
