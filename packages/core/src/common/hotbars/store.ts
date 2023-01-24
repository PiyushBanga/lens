/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { IObservableValue } from "mobx";
import { runInAction, action, comparer, observable } from "mobx";
import type { BaseStore } from "../base-store/base-store";
import type { CatalogEntity } from "../catalog";
import { broadcastMessage } from "../ipc";
import type { Hotbar, CreateHotbarData, CreateHotbarOptions } from "./types";
import { defaultHotbarCells, getEmptyHotbar } from "./types";
import { hotbarTooManyItemsChannel } from "../ipc/hotbar";
import type { GeneralEntity } from "../catalog-entities";
import type { Logger } from "../logger";
import assert from "assert";
import { computeDefaultShortName, getShortName } from "../catalog/helpers";
import type { Migrations } from "conf/dist/source/types";
import type { CreateBaseStore } from "../base-store/create-base-store.injectable";

export interface HotbarStoreModel {
  hotbars: Hotbar[];
  activeHotbarId: string;
}

interface Dependencies {
  readonly catalogCatalogEntity: GeneralEntity;
  readonly logger: Logger;
  readonly storeMigrationVersion: string;
  readonly migrations: Migrations<Record<string, unknown>>;
  createBaseStore: CreateBaseStore;
}

export class HotbarStore {
  private readonly store: BaseStore<HotbarStoreModel>;

  readonly hotbars = observable.array<Hotbar>();

  readonly activeHotbarId = observable.box() as IObservableValue<string>;

  constructor(protected readonly dependencies: Dependencies) {
    this.store = this.dependencies.createBaseStore({
      configName: "lens-hotbar-store",
      accessPropertiesByDotNotation: false, // To make dots safe in cluster context names
      syncOptions: {
        equals: comparer.structural,
      },
      projectVersion: this.dependencies.storeMigrationVersion,
      migrations: this.dependencies.migrations,
      fromStore: action((data) => {
        if (!data.hotbars || !data.hotbars.length) {
          const hotbar = getEmptyHotbar("Default");
          const {
            metadata: {
              uid,
              name,
              source,
            },
          } = this.dependencies.catalogCatalogEntity;

          hotbar.items[0] = {
            entity: {
              uid,
              name,
              source,
              shortName: getShortName(this.dependencies.catalogCatalogEntity),
            },
          };
          this.hotbars.replace([hotbar]);
        } else {
          this.hotbars.replace(data.hotbars);
        }

        for (const hotbar of this.hotbars) {
          ensureExactHotbarItemLength(hotbar);
          ensureNamesAndShortNames(hotbar);
        }

        if (data.activeHotbarId) {
          this.activeHotbarId.set(data.activeHotbarId);
        }

        if (!this.activeHotbarId.get()) {
          this.activeHotbarId.set(this.hotbars[0].id);
        }

        const activeHotbarExists = this.hotbars.findIndex(hotbar => hotbar.id === this.activeHotbarId.get()) >= 0;

        if (!activeHotbarExists) {
          this.activeHotbarId.set(this.hotbars[0].id);
        }
      }),
      toJSON: () => ({
        hotbars: this.hotbars.toJSON(),
        activeHotbarId: this.activeHotbarId.get(),
      }),
    });
  }

  load() {
    this.store.load();
  }

  /**
   * If `hotbar` points to a known hotbar, make it active. Otherwise, ignore
   * @param hotbar The hotbar instance, or the index, or its ID
   */
  setActiveHotbar(hotbar: Hotbar | number | string) {
    runInAction(() => {
      if (typeof hotbar === "number") {
        if (hotbar >= 0 && hotbar < this.hotbars.length) {
          this.activeHotbarId.set(this.hotbars[hotbar].id);
        }
      } else if (typeof hotbar === "string") {
        if (this.findById(hotbar)) {
          this.activeHotbarId.set(hotbar);
        }
      } else {
        if (this.hotbars.indexOf(hotbar) >= 0) {
          this.activeHotbarId.set(hotbar.id);
        }
      }
    });
  }

  private getActiveHotbarIndex() {
    return this.hotbars.findIndex((hotbar) => hotbar.id === this.activeHotbarId.get());
  }

  getActive(): Hotbar {
    const hotbar = this.findById(this.activeHotbarId.get());

    assert(hotbar, "There MUST always be an active hotbar");

    return hotbar;
  }

  findByName(name: string) {
    return this.hotbars.find((hotbar) => hotbar.name === name);
  }

  findById(id: string) {
    return this.hotbars.find((hotbar) => hotbar.id === id);
  }

  add(data: CreateHotbarData, { setActive = false }: CreateHotbarOptions = {}) {
    runInAction(() => {
      const hotbar = getEmptyHotbar(data.name, data.id);

      this.hotbars.push(hotbar);

      if (setActive) {
        this.activeHotbarId.set(hotbar.id);
      }
    });
  }

  setHotbarName(id: string, name: string): void {
    runInAction(() => {
      const index = this.hotbars.findIndex((hotbar) => hotbar.id === id);

      if (index < 0) {
        return this.dependencies.logger.warn(
          `[HOTBAR-STORE]: cannot setHotbarName: unknown id`,
          { id },
        );
      }

      this.hotbars[index].name = name;
    });
  }

  remove(hotbar: Hotbar) {
    runInAction(() => {
      assert(this.hotbars.length >= 2, "Cannot remove the last hotbar");

      this.hotbars.replace(this.hotbars.filter((h) => h.id !== hotbar.id));

      if (this.activeHotbarId.get() === hotbar.id) {
        this.activeHotbarId.set(this.hotbars[0].id);
      }
    });
  }

  addToHotbar(item: CatalogEntity, cellIndex?: number) {
    runInAction(() => {

      const hotbar = this.getActive();
      const uid = item.getId();
      const name = item.getName();
      const shortName = getShortName(item);

      if (typeof uid !== "string") {
        throw new TypeError("CatalogEntity's ID must be a string");
      }

      if (typeof name !== "string") {
        throw new TypeError("CatalogEntity's NAME must be a string");
      }

      if (typeof shortName !== "string") {
        throw new TypeError("CatalogEntity's SHORT_NAME must be a string");
      }

      if (this.isAddedToActive(item)) {
        return;
      }

      const entity = {
        uid,
        name,
        source: item.metadata.source,
        shortName,
      };
      const newItem = { entity };

      if (cellIndex === undefined) {
        // Add item to empty cell
        const emptyCellIndex = hotbar.items.indexOf(null);

        if (emptyCellIndex != -1) {
          hotbar.items[emptyCellIndex] = newItem;
        } else {
          broadcastMessage(hotbarTooManyItemsChannel);
        }
      } else if (0 <= cellIndex && cellIndex < hotbar.items.length) {
        hotbar.items[cellIndex] = newItem;
      } else {
        this.dependencies.logger.error(
          `[HOTBAR-STORE]: cannot pin entity to hotbar outside of index range`,
          { entityId: uid, hotbarId: hotbar.id, cellIndex },
        );
      }
    });
  }

  removeFromHotbar(uid: string): void {
    runInAction(() => {
      const hotbar = this.getActive();
      const index = hotbar.items.findIndex((item) => item?.entity.uid === uid);

      if (index < 0) {
        return;
      }

      hotbar.items[index] = null;
    });
  }

  /**
   * Remove all hotbar items that reference the `uid`.
   * @param uid The `EntityId` that each hotbar item refers to
   * @returns A function that will (in an action) undo the removing of the hotbar items. This function will not complete if the hotbar has changed.
   */
  removeAllHotbarItems(uid: string) {
    runInAction(() => {
      for (const hotbar of this.hotbars) {
        const index = hotbar.items.findIndex((i) => i?.entity.uid === uid);

        if (index >= 0) {
          hotbar.items[index] = null;
        }
      }
    });
  }

  private findClosestEmptyIndex(from: number, direction = 1) {
    let index = from;
    const hotbar = this.getActive();

    while (hotbar.items[index] != null) {
      index += direction;
    }

    return index;
  }

  restackItems(from: number, to: number): void {
    runInAction(() => {
      const { items } = this.getActive();
      const source = items[from];
      const moveDown = from < to;

      if (
        from < 0 ||
        to < 0 ||
        from >= items.length ||
        to >= items.length ||
        isNaN(from) ||
        isNaN(to)
      ) {
        throw new Error("Invalid 'from' or 'to' arguments");
      }

      if (from == to) {
        return;
      }

      items.splice(from, 1, null);

      if (items[to] == null) {
        items.splice(to, 1, source);
      } else {
        // Move cells up or down to closes empty cell
        items.splice(this.findClosestEmptyIndex(to, moveDown ? -1 : 1), 1);
        items.splice(to, 0, source);
      }
    });
  }

  switchToPrevious() {
    runInAction(() => {
      let index = this.getActiveHotbarIndex() - 1;

      if (index < 0) {
        index = this.hotbars.length - 1;
      }

      this.setActiveHotbar(index);
    });
  }

  switchToNext() {
    runInAction(() => {
      let index = this.getActiveHotbarIndex() + 1;

      if (index >= this.hotbars.length) {
        index = 0;
      }

      this.setActiveHotbar(index);
    });
  }

  /**
   * Checks if entity already pinned to the active hotbar
   */
  isAddedToActive(entity: CatalogEntity | null | undefined): boolean {
    if (!entity) {
      return false;
    }

    const indexInActiveHotbar = this.getActive().items.findIndex(item => item?.entity.uid === entity.getId());

    return indexInActiveHotbar >= 0;
  }

  getDisplayLabel(hotbar: Hotbar): string {
    return `${this.getDisplayIndex(hotbar)}: ${hotbar.name}`;
  }

  getDisplayIndex(hotbar: Hotbar): string {
    const index = this.hotbars.indexOf(hotbar);

    if (index < 0) {
      return "??";
    }

    return `${index + 1}`;
  }
}

/**
 * This function ensures that there are always exactly `defaultHotbarCells`
 * worth of items in the hotbar.
 * @param hotbar The hotbar to modify
 */
function ensureExactHotbarItemLength(hotbar: Hotbar) {
  // if there are not enough items
  while (hotbar.items.length < defaultHotbarCells) {
    hotbar.items.push(null);
  }

  // if for some reason the hotbar was overfilled before, remove as many entries
  // as needed, but prefer empty slots and items at the end first.
  while (hotbar.items.length > defaultHotbarCells) {
    const lastNull = hotbar.items.lastIndexOf(null);

    if (lastNull >= 0) {
      hotbar.items.splice(lastNull, 1);
    } else {
      hotbar.items.length = defaultHotbarCells;
    }
  }
}

/**
 * This function ensures that the data coming in has the correct form
 * @param hotbar The hotbar to modify
 */
function ensureNamesAndShortNames(hotbar: Hotbar) {
  for (let i = 0; i < hotbar.items.length; i += 1) {
    const item = hotbar.items[i];

    if (!item) {
      continue;
    }

    if (!item.entity.name || typeof item.entity.name !== "string") {
      hotbar.items[i] = null;
    } else if (!item.entity.shortName || typeof item.entity.shortName !== "string") {
      item.entity.shortName = computeDefaultShortName(item.entity.name);
    }
  }
}
