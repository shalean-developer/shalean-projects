"use client";

import { create } from "zustand";

import {
  defaultBookingWizardValues,
  type BookingWizardValues,
} from "@/lib/booking-schema";

type BookingWizardStore = {
  currentStep: number;
  values: BookingWizardValues;
  setCurrentStep: (step: number) => void;
  setValues: (values: Partial<BookingWizardValues>) => void;
  reset: () => void;
};

export const useBookingWizardStore = create<BookingWizardStore>((set) => ({
  currentStep: 0,
  values: defaultBookingWizardValues,
  setCurrentStep: (step) => set({ currentStep: step }),
  setValues: (values) =>
    set((state) => ({
      values: {
        ...state.values,
        ...values,
        serviceData: values.serviceData ?? state.values.serviceData,
        selectedAddons: values.selectedAddons ?? state.values.selectedAddons,
      },
    })),
  reset: () => set({ currentStep: 0, values: defaultBookingWizardValues }),
}));
