import { useDispatch } from 'react-redux';

import type { AppDispatch } from './index';

/**
 * Typed dispatch hook for Redux Toolkit, allowing thunk actions.
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();
