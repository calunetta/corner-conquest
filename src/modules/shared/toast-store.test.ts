import { reducer, toast, dismissToast, getToastState, subscribeToToastState } from './toast-store';
import type { ToastState } from './toast-store';

describe('toast-store', () => {
  describe('reducer', () => {
    const initialState: ToastState = { toasts: [] };

    describe('ADD_TOAST', () => {
      it('adds a toast to the front of the list', () => {
        const toast1 = { id: '1', title: 'Test', open: true };
        const newState = reducer(initialState, { type: 'ADD_TOAST', toast: toast1 });

        expect(newState.toasts).toHaveLength(1);
        expect(newState.toasts[0]).toBe(toast1);
      });

      it('respects TOAST_LIMIT (3)', () => {
        const state1 = reducer(initialState, { type: 'ADD_TOAST', toast: { id: '1', title: 'T1', open: true } });
        const state2 = reducer(state1, { type: 'ADD_TOAST', toast: { id: '2', title: 'T2', open: true } });
        const state3 = reducer(state2, { type: 'ADD_TOAST', toast: { id: '3', title: 'T3', open: true } });
        const state4 = reducer(state3, { type: 'ADD_TOAST', toast: { id: '4', title: 'T4', open: true } });

        expect(state3.toasts).toHaveLength(3);
        expect(state4.toasts).toHaveLength(3);
        expect(state4.toasts.map((t) => t.id)).toEqual(['4', '3', '2']);
      });
    });

    describe('UPDATE_TOAST', () => {
      it('updates a toast by id', () => {
        const state1 = reducer(initialState, { type: 'ADD_TOAST', toast: { id: '1', title: 'Original', open: true } });
        const state2 = reducer(state1, { type: 'UPDATE_TOAST', toast: { id: '1', title: 'Updated' } });

        expect(state2.toasts[0].title).toBe('Updated');
      });

      it('does not mutate the input state', () => {
        const state1 = reducer(initialState, { type: 'ADD_TOAST', toast: { id: '1', title: 'Test', open: true } });
        const originalToasts = [...state1.toasts];

        reducer(state1, { type: 'UPDATE_TOAST', toast: { id: '1', title: 'Updated' } });

        expect(state1.toasts).toEqual(originalToasts);
      });
    });

    describe('DISMISS_TOAST', () => {
      it('marks a specific toast as open: false', () => {
        const state1 = reducer(initialState, { type: 'ADD_TOAST', toast: { id: '1', title: 'Test', open: true } });
        const state2 = reducer(state1, { type: 'DISMISS_TOAST', toastId: '1' });

        expect(state2.toasts[0].open).toBe(false);
      });

      it('dismisses all toasts when toastId is undefined', () => {
        let state = initialState;
        state = reducer(state, { type: 'ADD_TOAST', toast: { id: '1', title: 'T1', open: true } });
        state = reducer(state, { type: 'ADD_TOAST', toast: { id: '2', title: 'T2', open: true } });
        state = reducer(state, { type: 'ADD_TOAST', toast: { id: '3', title: 'T3', open: true } });

        const newState = reducer(state, { type: 'DISMISS_TOAST', toastId: undefined });

        expect(newState.toasts.every((t) => t.open === false)).toBe(true);
      });
    });

    describe('REMOVE_TOAST', () => {
      it('removes a specific toast by id', () => {
        const state1 = reducer(initialState, { type: 'ADD_TOAST', toast: { id: '1', title: 'Test', open: true } });
        const state2 = reducer(state1, { type: 'REMOVE_TOAST', toastId: '1' });

        expect(state2.toasts).toHaveLength(0);
      });

      it('clears all toasts when toastId is undefined', () => {
        let state = initialState;
        state = reducer(state, { type: 'ADD_TOAST', toast: { id: '1', title: 'T1', open: true } });
        state = reducer(state, { type: 'ADD_TOAST', toast: { id: '2', title: 'T2', open: true } });

        const newState = reducer(state, { type: 'REMOVE_TOAST', toastId: undefined });

        expect(newState.toasts).toHaveLength(0);
      });
    });
  });

  describe('toast() function', () => {
    beforeEach(() => {
      // Reset the store before each test
      getToastState().toasts = [];
    });

    it('returns an object with id, dismiss, and update methods', () => {
      const result = toast({ title: 'Test' });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('dismiss');
      expect(result).toHaveProperty('update');
      expect(typeof result.dismiss).toBe('function');
      expect(typeof result.update).toBe('function');
    });

    it('returns a no-op object with empty id for exact duplicate toasts (same title, description, variant, open)', () => {
      const first = toast({ title: 'Duplicate', description: 'Test', variant: 'default' });
      expect(first.id).not.toBe('');

      const second = toast({ title: 'Duplicate', description: 'Test', variant: 'default' });
      expect(second.id).toBe('');
      expect(typeof second.dismiss).toBe('function');
      expect(typeof second.update).toBe('function');
    });

    it('allows different titles even if description and variant match', () => {
      const first = toast({ title: 'Title A', description: 'Same', variant: 'default' });
      const second = toast({ title: 'Title B', description: 'Same', variant: 'default' });

      expect(first.id).not.toBe('');
      expect(second.id).not.toBe('');
      expect(first.id).not.toBe(second.id);
    });

    it('allows different descriptions even if title and variant match', () => {
      const first = toast({ title: 'Same', description: 'Desc A', variant: 'default' });
      const second = toast({ title: 'Same', description: 'Desc B', variant: 'default' });

      expect(first.id).not.toBe('');
      expect(second.id).not.toBe('');
      expect(first.id).not.toBe(second.id);
    });

    it('allows different variants even if title and description match', () => {
      const first = toast({ title: 'Same', description: 'Same', variant: 'default' });
      const second = toast({ title: 'Same', description: 'Same', variant: 'destructive' });

      expect(first.id).not.toBe('');
      expect(second.id).not.toBe('');
      expect(first.id).not.toBe(second.id);
    });

    it('does not consider dismissed toasts as duplicates', () => {
      const first = toast({ title: 'Test', description: 'Desc' });
      expect(first.id).not.toBe('');

      dismissToast(first.id);
      const second = toast({ title: 'Test', description: 'Desc' });

      expect(second.id).not.toBe('');
    });
  });

  describe('dismissToast()', () => {
    beforeEach(() => {
      getToastState().toasts = [];
    });

    it('dismisses a specific toast by id', () => {
      const t = toast({ title: 'Test' });
      expect(getToastState().toasts[0].open).toBe(true);

      dismissToast(t.id);

      expect(getToastState().toasts[0].open).toBe(false);
    });

    it('dismisses all toasts when called with no id', () => {
      toast({ title: 'T1' });
      toast({ title: 'T2' });

      dismissToast();

      expect(getToastState().toasts.every((t) => t.open === false)).toBe(true);
    });
  });

  describe('getToastState()', () => {
    it('returns the current state', () => {
      getToastState().toasts = [];
      const toastResult = toast({ title: 'Test' });

      const state = getToastState();
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].id).toBe(toastResult.id);
    });
  });

  describe('subscribeToToastState()', () => {
    beforeEach(() => {
      getToastState().toasts = [];
    });

    it('does not call the listener immediately; the hook reads initial state with getToastState()', () => {
      const listener = jest.fn();
      subscribeToToastState(listener);

      expect(listener).not.toHaveBeenCalled();
    });

    it('calls the listener when state changes (e.g., new toast added)', () => {
      const listener = jest.fn();
      subscribeToToastState(listener);

      toast({ title: 'Test' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(getToastState());
    });

    it('returns an unsubscribe function that removes the listener', () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToToastState(listener);
      listener.mockClear();

      unsubscribe();

      toast({ title: 'Test' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('splices out the exact listener reference, not just any listener', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsub1 = subscribeToToastState(listener1);
      subscribeToToastState(listener2);

      listener1.mockClear();
      listener2.mockClear();

      unsub1();

      toast({ title: 'Test' });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });
});
