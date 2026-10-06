import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  addTransferPlayer,
  refreshSponsorshipMarket,
  declineSponsorshipProposal,
  acceptSponsorshipProposal,
  advanceMatch,
  assignPlayerToSlot,
  changeFormation,
  createCareer as makeCareer,
  finalizeMatch,
  parseCareer,
  serializeCareer,
  setCaptain,
  sellPlayer,
  setTicketPrice,
  setHeadquartersRevenuePricing,
  setHeadquartersImageAcquisition,
  setHeadquartersInvestment,
  startMatch,
  substitutePlayer,
  updateTactics,
  upgradeStadium,
  upgradeStadiumFacility,
  upgradeHeadquartersFacility,
} from '@/game/engine';
import type { Career, FormationId, HeadquartersImageKey, HeadquartersInvestmentKey, HeadquartersRevenueKey, HeadquartersUpgradeKey, StadiumUpgradeKey, Tactics } from '@/game/types';

const STORAGE_KEY = 'magiafoot.saved-career.v1';

interface CareerContextValue {
  career: Career | null;
  isReady: boolean;
  storageWarning: boolean;
  createNewCareer: (coachName: string, clubId: string) => void;
  startCurrentMatch: () => void;
  advanceCurrentMatch: (minutes?: number) => void;
  makeSubstitution: (outgoingId: string, incomingId: string) => boolean;
  setFormation: (formationId: FormationId) => void;
  movePlayer: (slotId: string, playerId: string) => void;
  chooseCaptain: (playerId: string) => void;
  setTactics: (tactics: Tactics) => void;
  closeCurrentMatch: () => void;
  signPlayer: (playerId: string) => boolean;
  transferPlayer: (playerId: string) => boolean;
  expandStadium: () => boolean;
  upgradeStadiumItem: (key: StadiumUpgradeKey) => boolean;
  updateTicketPrice: (price: number) => void;
  upgradeHeadquartersItem: (key: HeadquartersUpgradeKey) => boolean;
  updateHeadquartersRevenuePricing: (key: HeadquartersRevenueKey, level: number) => void;
  updateHeadquartersImageAcquisition: (key: HeadquartersImageKey, level: number) => void;
  updateHeadquartersInvestment: (key: HeadquartersInvestmentKey, level: number) => void;
  refreshSponsors: (force?: boolean) => void;
  acceptSponsor: (proposalId: string) => boolean;
  declineSponsor: (proposalId: string) => void;
}

const CareerContext = createContext<CareerContextValue | null>(null);

export function CareerProvider({ children }: { children: ReactNode }) {
  const [career, setCareer] = useState<Career | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((savedCareer) => {
        if (!active) return;
        const parsed = parseCareer(savedCareer);
        setCareer(parsed);
        if (savedCareer && !parsed) setStorageWarning(true);
      })
      .catch(() => {
        if (active) setStorageWarning(true);
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const snapshot = career ? serializeCareer(career) : null;
    saveQueue.current = saveQueue.current
      .then(async () => {
        if (snapshot) await AsyncStorage.setItem(STORAGE_KEY, snapshot);
      })
      .catch(() => setStorageWarning(true));
  }, [career, isReady]);

  const createNewCareer = useCallback((coachName: string, clubId: string) => {
    if (!isReady) return;
    setCareer(makeCareer(coachName, clubId));
  }, [isReady]);

  const update = useCallback((action: (current: Career) => Career) => {
    setCareer((current) => current ? action(current) : current);
  }, []);

  const startCurrentMatch = useCallback(() => update(startMatch), [update]);
  const advanceCurrentMatch = useCallback((minutes = 5) => update((current) => advanceMatch(current, minutes)), [update]);
  const makeSubstitution = useCallback((outgoingId: string, incomingId: string) => {
    if (!career) return false;
    const next = substitutePlayer(career, outgoingId, incomingId);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);
  const setFormation = useCallback((formationId: FormationId) => update((current) => changeFormation(current, formationId)), [update]);
  const movePlayer = useCallback((slotId: string, playerId: string) => update((current) => assignPlayerToSlot(current, slotId, playerId)), [update]);
  const chooseCaptain = useCallback((playerId: string) => update((current) => setCaptain(current, playerId)), [update]);
  const setTactics = useCallback((tactics: Tactics) => update((current) => updateTactics(current, tactics)), [update]);
  const closeCurrentMatch = useCallback(() => update(finalizeMatch), [update]);
  const signPlayer = useCallback((playerId: string) => {
    if (!career) return false;
    const next = addTransferPlayer(career, playerId);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);
  const transferPlayer = useCallback((playerId: string) => {
    if (!career) return false;
    const next = sellPlayer(career, playerId);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);
  const expandStadium = useCallback(() => {
    if (!career) return false;
    const next = upgradeStadium(career);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);

  const upgradeStadiumItem = useCallback((key: StadiumUpgradeKey) => {
    if (!career) return false;
    const next = upgradeStadiumFacility(career, key);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);

  const updateTicketPrice = useCallback((price: number) => {
    update((current) => setTicketPrice(current, price));
  }, [update]);

  const upgradeHeadquartersItem = useCallback((key: HeadquartersUpgradeKey) => {
    if (!career) return false;
    const next = upgradeHeadquartersFacility(career, key);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);

  const updateHeadquartersRevenuePricing = useCallback((key: HeadquartersRevenueKey, level: number) => {
    update((current) => setHeadquartersRevenuePricing(current, key, level));
  }, [update]);

  const updateHeadquartersImageAcquisition = useCallback((key: HeadquartersImageKey, level: number) => {
    update((current) => setHeadquartersImageAcquisition(current, key, level));
  }, [update]);

  const updateHeadquartersInvestment = useCallback((key: HeadquartersInvestmentKey, level: number) => {
    update((current) => setHeadquartersInvestment(current, key, level));
  }, [update]);

  const refreshSponsors = useCallback((force = false) => {
    update((current) => refreshSponsorshipMarket(current, force));
  }, [update]);

  const acceptSponsor = useCallback((proposalId: string) => {
    if (!career) return false;
    const next = acceptSponsorshipProposal(career, proposalId);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);

  const declineSponsor = useCallback((proposalId: string) => {
    update((current) => declineSponsorshipProposal(current, proposalId));
  }, [update]);

  const value = useMemo(() => ({
    career,
    isReady,
    storageWarning,
    createNewCareer,
    startCurrentMatch,
    advanceCurrentMatch,
    makeSubstitution,
    setFormation,
    movePlayer,
    chooseCaptain,
    setTactics,
    closeCurrentMatch,
    signPlayer,
    transferPlayer,
    expandStadium,
    upgradeStadiumItem,
    updateTicketPrice,
    upgradeHeadquartersItem,
    updateHeadquartersRevenuePricing,
    updateHeadquartersImageAcquisition,
    updateHeadquartersInvestment,
    refreshSponsors,
    acceptSponsor,
    declineSponsor,
  }), [
    advanceCurrentMatch, career, chooseCaptain, closeCurrentMatch, createNewCareer,
    expandStadium, upgradeStadiumItem, updateTicketPrice, upgradeHeadquartersItem, updateHeadquartersRevenuePricing, updateHeadquartersImageAcquisition, updateHeadquartersInvestment, refreshSponsors, acceptSponsor, declineSponsor, isReady, makeSubstitution, movePlayer, setFormation,
    setTactics, signPlayer, startCurrentMatch, storageWarning, transferPlayer,
  ]);

  return <CareerContext.Provider value={value}>{children}</CareerContext.Provider>;
}

export function useCareer() {
  const context = useContext(CareerContext);
  if (!context) throw new Error('useCareer precisa estar dentro de CareerProvider.');
  return context;
}
