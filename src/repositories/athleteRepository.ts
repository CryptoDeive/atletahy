import {
  defaultAthleteProfile,
  defaultEquipmentAvailability,
  defaultNutritionPreferences,
  defaultPhysiologyMetrics,
  defaultTrainingAvailability,
} from '../data/defaultAthleteState';
import type { AthleteState, Injury } from '../types/athlete';
import { readFromLocalStorage, writeToLocalStorage } from '../utils/persistence';
import { athleteStorageResources, guestStorageContext, storageKey, type StorageContext } from './storageKeys';

export async function getAthleteState(context: StorageContext = guestStorageContext): Promise<AthleteState> {
  return {
    profile: readFromLocalStorage(storageKey(context, athleteStorageResources.profile), defaultAthleteProfile),
    physiology: readFromLocalStorage(storageKey(context, athleteStorageResources.physiology), defaultPhysiologyMetrics),
    availability: readFromLocalStorage(storageKey(context, athleteStorageResources.availability), defaultTrainingAvailability),
    equipment: readFromLocalStorage(storageKey(context, athleteStorageResources.equipment), defaultEquipmentAvailability),
    injuries: readFromLocalStorage<Injury[]>(storageKey(context, athleteStorageResources.injuries), []),
    nutrition: readFromLocalStorage(storageKey(context, athleteStorageResources.nutrition), defaultNutritionPreferences),
  };
}

export async function saveAthleteState(state: AthleteState, context: StorageContext = guestStorageContext): Promise<void> {
  writeToLocalStorage(storageKey(context, athleteStorageResources.profile), state.profile);
  writeToLocalStorage(storageKey(context, athleteStorageResources.physiology), state.physiology);
  writeToLocalStorage(storageKey(context, athleteStorageResources.availability), state.availability);
  writeToLocalStorage(storageKey(context, athleteStorageResources.equipment), state.equipment);
  writeToLocalStorage(storageKey(context, athleteStorageResources.injuries), state.injuries);
  writeToLocalStorage(storageKey(context, athleteStorageResources.nutrition), state.nutrition);
}
