import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  addTransferPlayer,
  fireAdministrativeProfessional,
  hireAdministrativeProfessional,
  refreshSponsorshipMarket,
  renewSponsorshipContract,
  negotiateSponsorshipProposal,
  declineSponsorshipProposal,
  acceptSponsorshipProposal,
  declinePlayerTransferOffer,
  acceptPlayerTransferOffer,
  advanceMatch,
  assignPlayerToSlot,
  changeFormation,
  createCareer as makeCareer,
  finalizeMatch,
  setCaptain,
  sellPlayer,
  setPlayerTrainingFocus,
  setPlayerSquadRole,
  setPlayerMarketStatus,
  renewPlayerContract,
  promisePlayerMinutes,
  setTicketPrice,
  setHeadquartersRevenuePricing,
  setHeadquartersImageAcquisition,
  setHeadquartersInvestment,
  startMatch,
  substitutePlayer,
  setMatchTacticsPaused,
  replaceBenchPlayer,
  resolveVarReview,
  setSetPieceTaker,
  updateTactics,
  upgradeStadium,
  upgradeStadiumFacility,
  upgradeHeadquartersFacility,
  upgradeTrainingCenterFacility,
} from '@/game/engine';
import type { AdministrationDepartmentKey, Career, FormationId, HeadquartersImageKey, HeadquartersInvestmentKey, HeadquartersRevenueKey, HeadquartersUpgradeKey, PlayerMarketStatus, PlayerSquadRole, PlayerTrainingFocus, SponsorshipSlot, StadiumUpgradeKey, Tactics, TrainingCenterUpgradeKey } from '@/game/types';
import { getBackupCount, loadProtectedCareer, persistProtectedCareer } from '@/game/save-protection';
import type { LocalIdentity, SaveHealth } from '@/game/save-protection';

interface CareerContextValue {
  career: Career | null;
  isReady: boolean;
  storageWarning: boolean;
  magiaId: string | null;
  saveHealth: SaveHealth;
  lastSavedAt: string | null;
  backupCount: number;
  manualSave: () => Promise<boolean>;
  createNewCareer: (coachName: string, clubId: string) => void;
  startCurrentMatch: () => void;
  advanceCurrentMatch: (minutes?: number) => void;
  makeSubstitution: (outgoingId: string, incomingId: string) => boolean;
  swapBenchPlayer: (outgoingBenchId: string, incomingId: string) => boolean;
  pauseMatchForTactics: () => void;
  resumeMatchFromTactics: () => void;
  resolveVAR: () => void;
  chooseSetPieceTaker: (role: 'penalties' | 'freeKicks' | 'leftCorners' | 'rightCorners', playerId: string) => void;
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
  negotiateSponsor: (proposalId: string, requestedSlot?: SponsorshipSlot, requestedMultiplier?: number) => void;
  renewSponsor: (contractId: string) => void;
  hireAdminProfessional: (department: AdministrationDepartmentKey) => boolean;
  fireAdminProfessional: (department: AdministrationDepartmentKey, professionalId: string) => boolean;
  upgradeTrainingCenterItem: (key: TrainingCenterUpgradeKey) => boolean;
  renewPlayer: (playerId: string, seasons?: number) => boolean;
  updatePlayerMarketStatus: (playerId: string, status: PlayerMarketStatus) => void;
  updatePlayerSquadRole: (playerId: string, role: PlayerSquadRole) => void;
  updatePlayerTrainingFocus: (playerId: string, focus: PlayerTrainingFocus) => void;
  promiseMinutes: (playerId: string) => void;
  acceptPlayerOffer: (offerId: string) => boolean;
  declinePlayerOffer: (offerId: string) => void;
}

const CareerContext = createContext<CareerContextValue | null>(null);

export function CareerProvider({ children }: { children: ReactNode }) {
  const [career, setCareer] = useState<Career | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [identity, setIdentity] = useState<LocalIdentity | null>(null);
  const [saveHealth, setSaveHealth] = useState<SaveHealth>('empty');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [backupCount, setBackupCount] = useState(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const revisionRef = useRef(0);

  useEffect(() => {
    let active = true;
    loadProtectedCareer()
      .then(async (loaded) => {
        if (!active) return;
        setCareer(loaded.career);
        setIdentity(loaded.identity);
        setSaveHealth(loaded.health);
        setLastSavedAt(loaded.lastSavedAt);
        revisionRef.current = loaded.revision;
        setBackupCount(await getBackupCount());
        if (loaded.health === 'corrupt' || loaded.health === 'restored_backup') {
          setStorageWarning(true);
        }
      })
      .catch(() => {
        if (active) {
          setStorageWarning(true);
          setSaveHealth('corrupt');
        }
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !career || !identity) return;
    const snapshot = career;
    const nextRevision = revisionRef.current + 1;
    revisionRef.current = nextRevision;

    saveQueue.current = saveQueue.current
      .then(async () => {
        const saved = await persistProtectedCareer(snapshot, identity, nextRevision, 'auto');
        setLastSavedAt(saved.savedAt);
        setSaveHealth('healthy');
        setBackupCount(await getBackupCount());
      })
      .catch(() => {
        setStorageWarning(true);
        setSaveHealth('corrupt');
      });
  }, [career, identity, isReady]);

  const manualSave = useCallback(async () => {
    if (!career || !identity) return false;
    const snapshot = career;
    const nextRevision = revisionRef.current + 1;
    revisionRef.current = nextRevision;
    let succeeded = true;

    saveQueue.current = saveQueue.current
      .then(async () => {
        const saved = await persistProtectedCareer(snapshot, identity, nextRevision, 'manual');
        setLastSavedAt(saved.savedAt);
        setSaveHealth('healthy');
        setBackupCount(await getBackupCount());
      })
      .catch(() => {
        succeeded = false;
        setStorageWarning(true);
        setSaveHealth('corrupt');
      });

    await saveQueue.current;
    return succeeded;
  }, [career, identity]);

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

  const swapBenchPlayer = useCallback((outgoingBenchId: string, incomingId: string) => {
    if (!career) return false;
    const next = replaceBenchPlayer(career, outgoingBenchId, incomingId);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);

  const pauseMatchForTactics = useCallback(() => {
    update((current) => setMatchTacticsPaused(current, true));
  }, [update]);

  const resumeMatchFromTactics = useCallback(() => {
    update((current) => setMatchTacticsPaused(current, false));
  }, [update]);

  const resolveVAR = useCallback(() => {
    update(resolveVarReview);
  }, [update]);

  const chooseSetPieceTaker = useCallback((role: 'penalties' | 'freeKicks' | 'leftCorners' | 'rightCorners', playerId: string) => {
    update((current) => setSetPieceTaker(current, role, playerId));
  }, [update]);
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

  const negotiateSponsor = useCallback((proposalId: string, requestedSlot?: SponsorshipSlot, requestedMultiplier = 1.10) => {
    update((current) => negotiateSponsorshipProposal(current, proposalId, requestedSlot, requestedMultiplier));
  }, [update]);

  const renewSponsor = useCallback((contractId: string) => {
    update((current) => renewSponsorshipContract(current, contractId));
  }, [update]);

  const hireAdminProfessional = useCallback((department: AdministrationDepartmentKey) => {
    if (!career) return false;
    const next = hireAdministrativeProfessional(career, department);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);

  const fireAdminProfessional = useCallback((department: AdministrationDepartmentKey, professionalId: string) => {
    if (!career) return false;
    const next = fireAdministrativeProfessional(career, department, professionalId);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);

  const upgradeTrainingCenterItem = useCallback((key: TrainingCenterUpgradeKey) => {
    if (!career) return false;
    const next = upgradeTrainingCenterFacility(career, key);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);

  const renewPlayer = useCallback((playerId: string, seasons = 2) => {
    if (!career) return false;
    const next = renewPlayerContract(career, playerId, seasons);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);

  const updatePlayerMarketStatus = useCallback((playerId: string, status: PlayerMarketStatus) => {
    update((current) => setPlayerMarketStatus(current, playerId, status));
  }, [update]);

  const updatePlayerSquadRole = useCallback((playerId: string, role: PlayerSquadRole) => {
    update((current) => setPlayerSquadRole(current, playerId, role));
  }, [update]);

  const updatePlayerTrainingFocus = useCallback((playerId: string, focus: PlayerTrainingFocus) => {
    update((current) => setPlayerTrainingFocus(current, playerId, focus));
  }, [update]);

  const promiseMinutes = useCallback((playerId: string) => {
    update((current) => promisePlayerMinutes(current, playerId));
  }, [update]);

  const acceptPlayerOffer = useCallback((offerId: string) => {
    if (!career) return false;
    const next = acceptPlayerTransferOffer(career, offerId);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);

  const declinePlayerOffer = useCallback((offerId: string) => {
    update((current) => declinePlayerTransferOffer(current, offerId));
  }, [update]);

  const value = useMemo(() => ({
    career,
    isReady,
    storageWarning,
    magiaId: identity?.magiaId ?? null,
    saveHealth,
    lastSavedAt,
    backupCount,
    manualSave,
    createNewCareer,
    startCurrentMatch,
    advanceCurrentMatch,
    makeSubstitution,
    swapBenchPlayer,
    pauseMatchForTactics,
    resumeMatchFromTactics,
    resolveVAR,
    chooseSetPieceTaker,
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
    negotiateSponsor,
    renewSponsor,
    hireAdminProfessional,
    fireAdminProfessional,
    upgradeTrainingCenterItem,
    renewPlayer,
    updatePlayerMarketStatus,
    updatePlayerSquadRole,
    updatePlayerTrainingFocus,
    promiseMinutes,
    acceptPlayerOffer,
    declinePlayerOffer,
  }), [
    advanceCurrentMatch, career, chooseCaptain, closeCurrentMatch, createNewCareer,
    expandStadium, upgradeStadiumItem, updateTicketPrice, upgradeHeadquartersItem, updateHeadquartersRevenuePricing, updateHeadquartersImageAcquisition, updateHeadquartersInvestment, refreshSponsors, acceptSponsor, declineSponsor, negotiateSponsor, renewSponsor, hireAdminProfessional, fireAdminProfessional, upgradeTrainingCenterItem, renewPlayer, updatePlayerMarketStatus, updatePlayerSquadRole, updatePlayerTrainingFocus, promiseMinutes, acceptPlayerOffer, declinePlayerOffer, isReady, makeSubstitution, swapBenchPlayer, pauseMatchForTactics, resumeMatchFromTactics, resolveVAR, chooseSetPieceTaker, movePlayer, setFormation,
    setTactics, signPlayer, startCurrentMatch, storageWarning, transferPlayer,
    identity, saveHealth, lastSavedAt, backupCount, manualSave,
  ]);

  return <CareerContext.Provider value={value}>{children}</CareerContext.Provider>;
}

export function useCareer() {
  const context = useContext(CareerContext);
  if (!context) throw new Error('useCareer precisa estar dentro de CareerProvider.');
  return context;
}
