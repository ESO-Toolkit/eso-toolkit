import { useDispatch } from 'react-redux';

import { AppDispatch } from './storeWithHistory';

/**
 * Typed dispatch hook for Redux Toolkit, allowing thunk actions.
 */
<<<<<<< HEAD
export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();
=======
export const useAppDispatch = () => useDispatch<AppDispatch>();
>>>>>>> pr-21
