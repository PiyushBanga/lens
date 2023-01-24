/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import createBaseStoreInjectable from "../base-store/create-base-store.injectable";
import entityPreferencesStoreMigrationVersionInjectable from "./migration-version.injectable";
import { EntityPreferencesStore } from "./store";

const entityPreferencesStoreInjectable = getInjectable({
  id: "entity-preferences-store",
  instantiate: (di) => new EntityPreferencesStore({
    storeMigrationVersion: di.inject(entityPreferencesStoreMigrationVersionInjectable),
    createBaseStore: di.inject(createBaseStoreInjectable),
  }),
});

export default entityPreferencesStoreInjectable;
