import { overrideSideEffectsWithFakes } from "./src/override-side-effects-with-fakes";

export * from "./src/start-application/time-slots";

export { applicationFeatureForElectronMain } from "./src/feature";

export const testUtils = { overrideSideEffectsWithFakes }
