/**
 * TransitionLink
 *
 * Thin wrapper around react-router's <Link> with viewTransition enabled.
 * React Router handles all the startViewTransition timing internally.
 *
 * Usage:
 * ```tsx
 * <TransitionLink to="/builds">View Builds</TransitionLink>
 * ```
 */

import React from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export const TransitionLink: React.FC<LinkProps> = (props) => {
  return <Link viewTransition {...props} />;
};
