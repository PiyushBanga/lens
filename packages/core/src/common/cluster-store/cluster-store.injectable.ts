/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { ClusterStore } from "./cluster-store";
import { createClusterInjectionToken } from "../cluster/create-cluster-injection-token";
import readClusterConfigSyncInjectable from "./read-cluster-config.injectable";
import emitAppEventInjectable from "../app-event-bus/emit-event.injectable";
import loggerInjectable from "../logger.injectable";
import storeMigrationsInjectable from "../base-store/migrations.injectable";
import { clusterStoreMigrationInjectionToken } from "./migration-token";
import clusterStoreMigrationVersionInjectable from "./migration-version.injectable";
import createBaseStoreInjectable from "../base-store/create-base-store.injectable";

const clusterStoreInjectable = getInjectable({
  id: "cluster-store",

  instantiate: (di) => new ClusterStore({
    createCluster: di.inject(createClusterInjectionToken),
    readClusterConfigSync: di.inject(readClusterConfigSyncInjectable),
    emitAppEvent: di.inject(emitAppEventInjectable),
    logger: di.inject(loggerInjectable),
    storeMigrationVersion: di.inject(clusterStoreMigrationVersionInjectable),
    migrations: di.inject(storeMigrationsInjectable, clusterStoreMigrationInjectionToken),
    createBaseStore: di.inject(createBaseStoreInjectable),
  }),
});

export default clusterStoreInjectable;
