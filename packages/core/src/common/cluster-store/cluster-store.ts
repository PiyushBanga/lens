/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */


import { action, comparer, computed, observable } from "mobx";
import type { BaseStore } from "../base-store/base-store";
import { Cluster } from "../cluster/cluster";
import { toJS } from "../utils";
import type { ClusterModel, ClusterId } from "../cluster-types";
import type { CreateCluster } from "../cluster/create-cluster-injection-token";
import type { ReadClusterConfigSync } from "./read-cluster-config.injectable";
import type { EmitAppEvent } from "../app-event-bus/emit-event.injectable";
import type { CreateBaseStore } from "../base-store/create-base-store.injectable";
import type { Migrations } from "conf/dist/source/types";
import type { Logger } from "../logger";

export interface ClusterStoreModel {
  clusters?: ClusterModel[];
}

interface Dependencies {
  createCluster: CreateCluster;
  readClusterConfigSync: ReadClusterConfigSync;
  emitAppEvent: EmitAppEvent;
  createBaseStore: CreateBaseStore;
  readonly storeMigrationVersion: string;
  readonly migrations: Migrations<Record<string, unknown>>;
  readonly logger: Logger;
}

export class ClusterStore {
  readonly clusters = observable.map<ClusterId, Cluster>();
  private readonly store: BaseStore<ClusterStoreModel>;

  constructor(protected readonly dependencies: Dependencies) {
    this.store = this.dependencies.createBaseStore({
      configName: "lens-cluster-store",
      accessPropertiesByDotNotation: false, // To make dots safe in cluster context names
      syncOptions: {
        equals: comparer.structural,
      },
      projectVersion: this.dependencies.storeMigrationVersion,
      migrations: this.dependencies.migrations,
      fromStore: action(({ clusters = [] }) => {
        const currentClusters = new Map(this.clusters);
        const newClusters = new Map<ClusterId, Cluster>();

        // update new clusters
        for (const clusterModel of clusters) {
          try {
            let cluster = currentClusters.get(clusterModel.id);

            if (cluster) {
              cluster.updateModel(clusterModel);
            } else {
              cluster = this.dependencies.createCluster(
                clusterModel,
                this.dependencies.readClusterConfigSync(clusterModel),
              );
            }
            newClusters.set(clusterModel.id, cluster);
          } catch (error) {
            this.dependencies.logger.warn(`[CLUSTER-STORE]: Failed to update/create a cluster: ${error}`);
          }
        }

        this.clusters.replace(newClusters);
      }),
      toJSON: () => toJS({
        clusters: this.clustersList.get().map(cluster => cluster.toJSON()),
      }),
    });
  }

  readonly clustersList = computed(() => [...this.clusters.values()]);

  hasClusters() {
    return this.clusters.size > 0;
  }

  getById(id: ClusterId | undefined): Cluster | undefined {
    if (id) {
      return this.clusters.get(id);
    }

    return undefined;
  }

  addCluster(clusterOrModel: ClusterModel | Cluster): Cluster {
    this.dependencies.emitAppEvent({ name: "cluster", action: "add" });

    const cluster = clusterOrModel instanceof Cluster
      ? clusterOrModel
      : this.dependencies.createCluster(
        clusterOrModel,
        this.dependencies.readClusterConfigSync(clusterOrModel),
      );

    this.clusters.set(cluster.id, cluster);

    return cluster;
  }

  load() {
    this.store.load();
  }
}
