import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Mock navigator.vibrate
if (typeof navigator !== 'undefined') {
  (navigator as any).vibrate = () => true;
}
