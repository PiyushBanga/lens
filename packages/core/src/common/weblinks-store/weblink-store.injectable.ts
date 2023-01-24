/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import createBaseStoreInjectable from "../base-store/create-base-store.injectable";
import storeMigrationsInjectable from "../base-store/migrations.injectable";
import { weblinkStoreMigrationInjectionToken } from "./migration-token";
import weblinksStoreMigrationVersionInjectable from "./migration-version.injectable";
import { WeblinkStore } from "./weblink-store";

const weblinkStoreInjectable = getInjectable({
  id: "weblink-store",
  instantiate: (di) => new WeblinkStore({
    storeMigrationVersion: di.inject(weblinksStoreMigrationVersionInjectable),
    migrations: di.inject(storeMigrationsInjectable, weblinkStoreMigrationInjectionToken),
    createBaseStore: di.inject(createBaseStoreInjectable),
  }),
});

export default weblinkStoreInjectable;
