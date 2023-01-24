/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import catalogCatalogEntityInjectable from "../catalog-entities/general-catalog-entities/implementations/catalog-catalog-entity.injectable";
import { HotbarStore } from "./store";
import loggerInjectable from "../logger.injectable";
import storeMigrationsInjectable from "../base-store/migrations.injectable";
import { hotbarStoreMigrationInjectionToken } from "./migrations-token";
import hotbarStoreMigrationVersionInjectable from "./migration-version.injectable";
import createBaseStoreInjectable from "../base-store/create-base-store.injectable";

const hotbarStoreInjectable = getInjectable({
  id: "hotbar-store",

  instantiate: (di) => new HotbarStore({
    catalogCatalogEntity: di.inject(catalogCatalogEntityInjectable),
    logger: di.inject(loggerInjectable),
    storeMigrationVersion: di.inject(hotbarStoreMigrationVersionInjectable),
    migrations: di.inject(storeMigrationsInjectable, hotbarStoreMigrationInjectionToken),
    createBaseStore: di.inject(createBaseStoreInjectable),
  }),
});

export default hotbarStoreInjectable;
