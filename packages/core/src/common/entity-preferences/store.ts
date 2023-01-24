/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { merge } from "lodash";
import { action, observable, runInAction } from "mobx";
import type { PartialDeep } from "type-fest";
import type { BaseStore } from "../base-store/base-store";
import type { CreateBaseStore } from "../base-store/create-base-store.injectable";

export interface EntityPreferencesModel {
  /**
   * Is used for displaying entity icons.
   */
  shortName?: string;
}

export interface EntityPreferencesStoreModel {
  entities?: [string, EntityPreferencesModel][];
}

export interface EntityPreferencesStoreDependencies {
  createBaseStore: CreateBaseStore;
  readonly storeMigrationVersion: string;
}

export class EntityPreferencesStore {
  private readonly store: BaseStore<EntityPreferencesStoreModel>;

  readonly preferences = observable.map<string, PartialDeep<EntityPreferencesModel>>();

  constructor(private readonly dependencies: EntityPreferencesStoreDependencies) {
    this.store = this.dependencies.createBaseStore({
      configName: "lens-entity-preferences-store",
      projectVersion: this.dependencies.storeMigrationVersion,
      fromStore: action(({ entities = [] }) => {
        this.preferences.replace(entities);
      }),
      toJSON: () => ({
        entities: this.preferences.toJSON(),
      }),
    });
  }

  mergePreferences(entityId: string, preferences: PartialDeep<EntityPreferencesModel>): void {
    runInAction(() => {
      this.preferences.set(entityId, merge(this.preferences.get(entityId), preferences));
    });
  }

  load() {
    this.store.load();
  }
}
