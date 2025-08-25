import { useDispatch } from 'react-redux';

import { AppDispatch } from './storeWithHistory';

/**
 * Typed dispatch hook for Redux Toolkit, allowing thunk actions.
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();
