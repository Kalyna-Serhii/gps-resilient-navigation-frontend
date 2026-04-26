import { useContext } from 'react';
import { AlertContext } from '../context/AlertContext';

export function useAlert() {
  return useContext(AlertContext);
}
