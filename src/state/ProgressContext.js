// Kullanıcı ilerlemesi: kelime kategorileri (Özellik 3) ve test istatistikleri.
// AsyncStorage ile cihazda kalıcı saklanır.

import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STATUS } from '../logic/srs';

const STORAGE_KEY = '@kelime_progress_v1';
const ProgressContext = createContext(null);

const initialState = { loaded: false, byId: {} };

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { loaded: true, byId: action.payload || {} };
    case 'SET_STATUS': {
      const prev = state.byId[action.id] || {};
      return {
        ...state,
        byId: { ...state.byId, [action.id]: { ...prev, status: action.status } },
      };
    }
    case 'MERGE': {
      const prev = state.byId[action.id] || {};
      return {
        ...state,
        byId: { ...state.byId, [action.id]: { ...prev, ...action.patch } },
      };
    }
    case 'RESET':
      return { loaded: true, byId: {} };
    default:
      return state;
  }
}

export function ProgressProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        dispatch({ type: 'HYDRATE', payload: raw ? JSON.parse(raw) : {} });
      } catch (e) {
        dispatch({ type: 'HYDRATE', payload: {} });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.byId)).catch(() => {});
  }, [state.byId, state.loaded]);

  const value = useMemo(() => {
    const getProgress = (id) => state.byId[id];
    const setStatus = (id, status) => dispatch({ type: 'SET_STATUS', id, status });
    const mergeProgress = (id, patch) => dispatch({ type: 'MERGE', id, patch });
    const reset = () => dispatch({ type: 'RESET' });

    const counts = { unknown: 0, passive: 0, active: 0, unseen: 0 };
    Object.values(state.byId).forEach((p) => {
      if (p.status === STATUS.UNKNOWN) counts.unknown++;
      else if (p.status === STATUS.PASSIVE) counts.passive++;
      else if (p.status === STATUS.ACTIVE) counts.active++;
    });

    return { loaded: state.loaded, byId: state.byId, counts, getProgress, setStatus, mergeProgress, reset };
  }, [state]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
