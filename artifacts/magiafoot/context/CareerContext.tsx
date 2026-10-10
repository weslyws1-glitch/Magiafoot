import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  addTransferPlayer,
  negotiateTransferPurchase,
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
import type { AdministrationDepartmentKey, Career, CurrencyCode, FormationId, HeadquartersImageKey, HeadquartersInvestmentKey, HeadquartersRevenueKey, HeadquartersUpgradeKey, PlayerMarketStatus, PlayerSquadRole, PlayerTrainingFocus, SponsorshipSlot, StadiumUpgradeKey, Tactics, TrainingCenterUpgradeKey } from '@/game/types';
import { deleteLocalCareerData, getBackupCount, loadProtectedCareer, persistProtectedCareer } from '@/game/save-protection';
import type { LocalIdentity, SaveHealth } from '@/game/save-protection';
import {
  clearRememberedCloudSession,
  deleteCareerSlotFromCloud,
  fetchCloudProfile,
  listCareerSlots,
  loadRememberedCloudSession,
  refreshCloudSession,
  restoreCareerFromCloud,
  restoreLatestCareerFromCloud,
  saveCareerToCloud,
  saveRememberedCloudSession,
  signInCloudAccount,
  signOutCloudAccount,
  signUpCloudAccount,
  upsertCareerSlot,
} from '@/game/cloud-save';
import type { CareerSlotSummary, CloudProfile, CloudSession } from '@/game/cloud-save';

interface CareerContextValue {
  career: Career | null;
  isReady: boolean;
  storageWarning: boolean;
  magiaId: string | null;
  saveHealth: SaveHealth;
  lastSavedAt: string | null;
  backupCount: number;
  manualSave: () => Promise<boolean>;
  cloudEmail: string | null;
  cloudMagiaId: string | null;
  cloudStatus: 'signed_out' | 'connecting' | 'connected' | 'syncing' | 'error';
  cloudLastSavedAt: string | null;
  cloudMessage: string | null;
  careerSlots: CareerSlotSummary[];
  activeCareerSlot: 1 | 2 | 3 | 4 | null;
  authRestoring: boolean;
  createCloudAccount: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  signInCloud: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  signOutCloud: () => Promise<void>;
  refreshCareerSlots: () => Promise<void>;
  chooseCareerSlot: (slot: 1 | 2 | 3 | 4) => Promise<boolean>;
  chooseEmptyCareerSlot: (slot: 1 | 2 | 3 | 4) => void;
  deleteCareerSlot: (slot: 1 | 2 | 3 | 4, careerId: string) => Promise<boolean>;
  syncCloudNow: () => Promise<boolean>;
  restoreCloudLatest: () => Promise<boolean>;
  createNewCareer: (coachName: string, clubId: string, currency?: CurrencyCode) => void;
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
  closeCurrentMatch: () => boolean;
  finishAndSaveCurrentMatch: () => Promise<boolean>;
  signPlayer: (playerId: string) => boolean;
  negotiateMarketPlayer: (
    playerId: string,
    transferBid: number,
    weeklyWage: number,
    signingBonus: number,
  ) => {
    result: 'completed' | 'club_rejected' | 'player_rejected' | 'budget' | 'squad_full' | 'not_found';
    counterOffer?: number;
    wageDemand?: number;
  };
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
  const [cloudSession, setCloudSession] = useState<CloudSession | null>(null);
  const [cloudProfile, setCloudProfile] = useState<CloudProfile | null>(null);
  const [cloudStatus, setCloudStatus] = useState<'signed_out' | 'connecting' | 'connected' | 'syncing' | 'error'>('signed_out');
  const [cloudLastSavedAt, setCloudLastSavedAt] = useState<string | null>(null);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [careerSlots, setCareerSlots] = useState<CareerSlotSummary[]>([]);
  const [activeCareerSlot, setActiveCareerSlot] = useState<1 | 2 | 3 | 4 | null>(null);
  const [rememberLogin, setRememberLogin] = useState(false);
  const [authRestoring, setAuthRestoring] = useState(true);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const revisionRef = useRef(0);

  useEffect(() => {
    let active = true;
    loadRememberedCloudSession()
      .then(async (session) => {
        if (!active || !session) return;
        setCloudSession(session);
        setRememberLogin(true);
        const profile = await fetchCloudProfile(session);
        if (active && profile) setCloudProfile(profile);
        const slots = await listCareerSlots(session);
        if (active) setCareerSlots(slots);
        if (active) setCloudStatus('connected');
      })
      .finally(() => {
        if (active) setAuthRestoring(false);
      });
    return () => { active = false; };
  }, []);

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
    // O relógio pode avançar 13 vezes por segundo em 3x. Não enfileirar uma
    // gravação completa a cada minuto: isso bloqueia o salvamento do apito final.
    if (career.liveMatch && career.liveMatch.phase !== 'finished' && career.liveMatch.minute % 5 !== 0) return;
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
    if (succeeded && cloudSession) {
      const session = await refreshCloudSession(cloudSession);
      if (session) {
        if (session !== cloudSession) setCloudSession(session);
        setCloudStatus('syncing');
        const cloudSaved = await saveCareerToCloud(session, snapshot, identity.installationId, 'manual');
        if (cloudSaved) {
          if (activeCareerSlot) {
            await upsertCareerSlot(session, activeCareerSlot, snapshot);
            setCareerSlots(await listCareerSlots(session));
          }
          setCloudLastSavedAt(cloudSaved.savedAt);
          setCloudStatus('connected');
          setCloudMessage('Save local e nuvem atualizados.');
        } else {
          setCloudStatus('error');
          setCloudMessage('Save local concluído, mas a nuvem não respondeu.');
        }
      }
    }
    return succeeded;
  }, [career, identity, cloudSession, activeCareerSlot]);

  const ensureFreshCloudSession = useCallback(async () => {
    if (!cloudSession) return null;
    const refreshed = await refreshCloudSession(cloudSession);
    if (!refreshed) {
      setCloudSession(null);
      setCloudProfile(null);
      setCloudStatus('signed_out');
      setCloudMessage('Sua sessão expirou. Entre novamente para continuar a sincronização.');
      return null;
    }
    if (refreshed !== cloudSession) setCloudSession(refreshed);
    return refreshed;
  }, [cloudSession]);

  const hydrateCloudProfile = useCallback(async (session: CloudSession) => {
    const profile = await fetchCloudProfile(session);
    if (!profile) return null;
    setCloudProfile(profile);
    return profile;
  }, []);

  const createCloudAccount = useCallback(async (email: string, password: string, remember = false) => {
    setCloudStatus('connecting');
    setCloudMessage(null);
    const result = await signUpCloudAccount(email, password);
    setCloudMessage(result.message);
    if (!result.ok) {
      setCloudStatus('error');
      return false;
    }
    if (!result.session) {
      setCloudStatus('signed_out');
      return true;
    }
    setCloudSession(result.session);
    setRememberLogin(remember);
    if (remember) await saveRememberedCloudSession(result.session);
    await hydrateCloudProfile(result.session);
    setCareerSlots(await listCareerSlots(result.session));
    setCloudStatus('connected');
    return true;
  }, [hydrateCloudProfile]);

  const signInCloud = useCallback(async (email: string, password: string, remember = false) => {
    setCloudStatus('connecting');
    setCloudMessage(null);
    const result = await signInCloudAccount(email, password);
    setCloudMessage(result.message);
    if (!result.ok) {
      setCloudStatus('error');
      return false;
    }
    setCloudSession(result.session);
    setRememberLogin(remember);
    if (remember) await saveRememberedCloudSession(result.session);
    else await clearRememberedCloudSession();
    await hydrateCloudProfile(result.session);
    setCareerSlots(await listCareerSlots(result.session));
    setCloudStatus('connected');
    return true;
  }, [hydrateCloudProfile]);

  const signOutCloud = useCallback(async () => {
    if (cloudSession) await signOutCloudAccount(cloudSession);
    await clearRememberedCloudSession();
    setCloudSession(null);
    setCloudProfile(null);
    setCareer(null);
    setCareerSlots([]);
    setActiveCareerSlot(null);
    setCloudLastSavedAt(null);
    setCloudStatus('signed_out');
    setCloudMessage('Conta desconectada deste aparelho.');
  }, [cloudSession]);

  const refreshCareerSlots = useCallback(async () => {
    const session = await ensureFreshCloudSession();
    if (!session) return;
    const slots = await listCareerSlots(session);
    setCareerSlots(slots);
    setCloudStatus('connected');
    setCloudMessage(null);
  }, [ensureFreshCloudSession]);

  const chooseCareerSlot = useCallback(async (slot: 1 | 2 | 3 | 4) => {
    const session = await ensureFreshCloudSession();
    if (!session) return false;
    const summary = careerSlots.find((item) => item.slot === slot);
    if (!summary) return false;
    setCloudStatus('syncing');

    const restored = await restoreCareerFromCloud(session, summary.careerId);
    if (restored) {
      setCareer(restored.career);
      setActiveCareerSlot(slot);
      setCloudLastSavedAt(restored.savedAt);
      setCloudStatus('connected');
      setCloudMessage(null);
      return true;
    }

    if (career?.id === summary.careerId) {
      const repaired = await saveCareerToCloud(session, career, identity?.installationId ?? 'web', 'recovery');
      if (repaired) {
        await upsertCareerSlot(session, slot, career);
        setCareerSlots(await listCareerSlots(session));
        setActiveCareerSlot(slot);
        setCloudLastSavedAt(repaired.savedAt);
        setCloudStatus('connected');
        setCloudMessage('Carreira recuperada do save deste aparelho e enviada para a nuvem.');
        return true;
      }
    }

    setCloudStatus('error');
    setCloudMessage('Não foi possível carregar esta carreira.');
    return false;
  }, [careerSlots, ensureFreshCloudSession, career, identity]);

  const chooseEmptyCareerSlot = useCallback((slot: 1 | 2 | 3 | 4) => {
    setActiveCareerSlot(slot);
    setCareer(null);
    setCloudStatus('connected');
    setCloudMessage(null);
  }, []);

  const deleteCareerSlot = useCallback(async (slot: 1 | 2 | 3 | 4, careerId: string): Promise<boolean> => {
    if (!careerSlots.some((entry) => entry.slot === slot && entry.careerId === careerId)) return false;
    const session = await ensureFreshCloudSession();
    if (!session) return false;
    setCloudStatus('syncing');

    // O servidor valida usuário, espaço e ID e apaga apenas o save escolhido.
    let deleted = false;
    try {
      deleted = await deleteCareerSlotFromCloud(session, slot, careerId);
    } catch (error) {
      console.error('[MagiaFoot] Falha na exclusão remota:', error);
    }
    if (!deleted) {
      setCloudStatus('error');
      setCloudMessage('A exclusão não foi confirmada. Nenhuma carreira foi apagada.');
      return false;
    }

    const stillLinked = careerSlots.some((entry) => entry.slot !== slot && entry.careerId === careerId);
    if (activeCareerSlot === slot) setActiveCareerSlot(null);
    if (!stillLinked && career?.id === careerId) setCareer(null);

    // Atualiza somente o cartão excluído. Um erro temporário ao listar as
    // carreiras na nuvem não deve fazer as outras desaparecerem da tela.
    setCareerSlots((existing) =>
      existing.filter((entry) => !(entry.slot === slot && entry.careerId === careerId))
    );

    let localCleanupFailed = false;
    if (!stillLinked) {
      try {
        // Nunca apague enquanto uma escrita antiga estiver pendente:
        // ela poderia restaurar a carreira excluída no mesmo dispositivo.
        await saveQueue.current;
        await deleteLocalCareerData(careerId);
        if (career?.id === careerId) {
          setLastSavedAt(null);
          setBackupCount(await getBackupCount());
        }
      } catch (error) {
        console.error('[MagiaFoot] Exclusão remota concluída, mas limpeza local falhou:', error);
        localCleanupFailed = true;
        setStorageWarning(true);
      }
    }

    setCloudStatus(localCleanupFailed ? 'error' : 'connected');
    setCloudMessage(localCleanupFailed
      ? 'Carreira removida da conta. A limpeza do save local não foi concluída neste aparelho.'
      : 'Carreira excluída. O espaço está disponível para uma nova carreira.');
    return true;
  }, [careerSlots, ensureFreshCloudSession, activeCareerSlot, career]);

  const syncCloudNow = useCallback(async () => {
    if (!career || !identity) return false;
    const session = await ensureFreshCloudSession();
    if (!session) return false;

    setCloudStatus('syncing');
    const saved = await saveCareerToCloud(session, career, identity.installationId, 'manual');
    if (!saved) {
      setCloudStatus('error');
      setCloudMessage('Não foi possível enviar a carreira para a nuvem.');
      return false;
    }

    if (activeCareerSlot) {
      await upsertCareerSlot(session, activeCareerSlot, career);
      setCareerSlots(await listCareerSlots(session));
    }
    setCloudLastSavedAt(saved.savedAt);
    setCloudStatus('connected');
    setCloudMessage('Carreira sincronizada e protegida na nuvem.');
    return true;
  }, [career, identity, ensureFreshCloudSession, activeCareerSlot]);

  const restoreCloudLatest = useCallback(async () => {
    const session = await ensureFreshCloudSession();
    if (!session) return false;

    setCloudStatus('syncing');
    const restored = await restoreLatestCareerFromCloud(session);
    if (!restored) {
      setCloudStatus('error');
      setCloudMessage('Nenhum backup válido foi encontrado na nuvem.');
      return false;
    }

    setCareer(restored.career);
    setCloudLastSavedAt(restored.savedAt);
    setCloudStatus('connected');
    setCloudMessage('Backup da nuvem restaurado neste aparelho.');
    return true;
  }, [ensureFreshCloudSession]);

  useEffect(() => {
    if (!career || !identity || !cloudSession) return;
    const timer = setTimeout(async () => {
      const session = await ensureFreshCloudSession();
      if (!session) return;
      setCloudStatus('syncing');
      const saved = await saveCareerToCloud(session, career, identity.installationId, 'auto');
      if (saved) {
        if (activeCareerSlot) {
          await upsertCareerSlot(session, activeCareerSlot, career);
          setCareerSlots(await listCareerSlots(session));
        }
        setCloudLastSavedAt(saved.savedAt);
        setCloudStatus('connected');
      } else {
        setCloudStatus('error');
        setCloudMessage('A sincronização automática falhou. Seu save local continua protegido.');
      }
    }, 12000);
    return () => clearTimeout(timer);
  }, [career, identity, cloudSession, ensureFreshCloudSession, activeCareerSlot]);

  const createNewCareer = useCallback((coachName: string, clubId: string, currency: CurrencyCode = 'BRL') => {
    if (!isReady) return;
    const next = makeCareer(coachName, clubId, currency);
    setCareer(next);
    if (cloudSession && activeCareerSlot) {
      void (async () => {
        const session = await refreshCloudSession(cloudSession);
        if (!session) return;
        await saveCareerToCloud(session, next, identity?.installationId ?? 'web', 'manual');
        await upsertCareerSlot(session, activeCareerSlot, next);
        setCareerSlots(await listCareerSlots(session));
      })();
    }
  }, [isReady, cloudSession, activeCareerSlot, identity]);

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
  const closeCurrentMatch = useCallback((): boolean => {
    // Finalizar fora do updater do React evita que um erro do motor derrube
    // a árvore inteira de componentes e a carreira em andamento.
    if (!career || career.liveMatch?.phase !== 'finished') return false;
    try {
      const finishedCareer = finalizeMatch(career);
      if (finishedCareer === career || finishedCareer.liveMatch) return false;
      setCareer(finishedCareer);
      return true;
    } catch (error) {
      console.error('[MagiaFoot] Falha ao encerrar partida, resultado preservado:', error);
      return false;
    }
  }, [career]);
  const finishAndSaveCurrentMatch = useCallback(async (): Promise<boolean> => {
    if (!career || !identity) return false;
    let snapshot: Career;
    try {
      if (career.liveMatch?.phase === 'finished') {
        snapshot = finalizeMatch(career);
        if (snapshot === career || snapshot.liveMatch) return false;
      } else if (!career.liveMatch && career.lastResult) {
        // Já encerrou a partida, mas a persistência pode ter falhado: salvar
        // novamente sem processar a rodada duas vezes.
        snapshot = career;
      } else {
        return false;
      }
    } catch (error) {
      console.error('[MagiaFoot] Não foi possível finalizar a partida:', error);
      return false;
    }

    const revision = revisionRef.current + 1;
    revisionRef.current = revision;
    // Um único comando salva o resultado completo. A nuvem sincronizará pelo
    // mecanismo existente, sem bloquear o usuário por problemas de rede.
    setCareer(snapshot);
    let persisted = false;
    saveQueue.current = saveQueue.current
      .then(async () => {
        const saved = await persistProtectedCareer(snapshot, identity, revision, 'manual');
        persisted = true;
        setLastSavedAt(saved.savedAt);
        setSaveHealth('healthy');
        try { setBackupCount(await getBackupCount()); } catch { /* o save principal já foi escrito */ }
      })
      .catch((error) => {
        console.error('[MagiaFoot] Falha ao gravar resultado:', error);
        setStorageWarning(true);
        setSaveHealth('corrupt');
      });
    await saveQueue.current;
    return persisted;
  }, [career, identity]);

  const signPlayer = useCallback((playerId: string) => {
    if (!career) return false;
    const next = addTransferPlayer(career, playerId);
    if (next === career) return false;
    setCareer(next);
    return true;
  }, [career]);
  const negotiateMarketPlayer = useCallback((playerId: string, transferBid: number, weeklyWage: number, signingBonus: number) => {
    if (!career) return { result: 'not_found' as const };
    const negotiation = negotiateTransferPurchase(career, playerId, transferBid, weeklyWage, signingBonus);
    if (negotiation.career !== career) setCareer(negotiation.career);
    return {
      result: negotiation.result,
      ...(typeof negotiation.counterOffer === 'number' ? { counterOffer: negotiation.counterOffer } : {}),
      ...(typeof negotiation.wageDemand === 'number' ? { wageDemand: negotiation.wageDemand } : {}),
    };
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
    magiaId: cloudProfile?.magiaId ?? identity?.magiaId ?? null,
    saveHealth,
    lastSavedAt,
    backupCount,
    manualSave,
    cloudEmail: cloudSession?.email ?? null,
    cloudMagiaId: cloudProfile?.magiaId ?? null,
    cloudStatus,
    cloudLastSavedAt,
    cloudMessage,
    careerSlots,
    activeCareerSlot,
    authRestoring,
    createCloudAccount,
    signInCloud,
    signOutCloud,
    refreshCareerSlots,
    chooseCareerSlot,
    chooseEmptyCareerSlot,
    deleteCareerSlot,
    syncCloudNow,
    restoreCloudLatest,
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
    finishAndSaveCurrentMatch,
    signPlayer,
    negotiateMarketPlayer,
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
    advanceCurrentMatch, career, chooseCaptain, closeCurrentMatch, finishAndSaveCurrentMatch, createNewCareer,
    expandStadium, upgradeStadiumItem, updateTicketPrice, upgradeHeadquartersItem, updateHeadquartersRevenuePricing, updateHeadquartersImageAcquisition, updateHeadquartersInvestment, refreshSponsors, acceptSponsor, declineSponsor, negotiateSponsor, renewSponsor, hireAdminProfessional, fireAdminProfessional, upgradeTrainingCenterItem, renewPlayer, updatePlayerMarketStatus, updatePlayerSquadRole, updatePlayerTrainingFocus, promiseMinutes, acceptPlayerOffer, declinePlayerOffer, isReady, makeSubstitution, swapBenchPlayer, pauseMatchForTactics, resumeMatchFromTactics, resolveVAR, chooseSetPieceTaker, movePlayer, setFormation,
    setTactics, signPlayer, negotiateMarketPlayer, startCurrentMatch, storageWarning, transferPlayer,
    identity, saveHealth, lastSavedAt, backupCount, manualSave,
    cloudSession, cloudProfile, cloudStatus, cloudLastSavedAt, cloudMessage,
    careerSlots, activeCareerSlot, authRestoring,
    createCloudAccount, signInCloud, signOutCloud, refreshCareerSlots, chooseCareerSlot, chooseEmptyCareerSlot, deleteCareerSlot, syncCloudNow, restoreCloudLatest,
  ]);

  return <CareerContext.Provider value={value}>{children}</CareerContext.Provider>;
}

export function useCareer() {
  const context = useContext(CareerContext);
  if (!context) throw new Error('useCareer precisa estar dentro de CareerProvider.');
  return context;
}
