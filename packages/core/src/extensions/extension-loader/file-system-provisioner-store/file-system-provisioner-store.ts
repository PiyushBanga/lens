/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ObservableMap } from "mobx";
import { action } from "mobx";
import type { BaseStore } from "../../../common/base-store/base-store";
import type { LensExtensionId } from "../../lens-extension";
import type { EnsureHashedDirectoryForExtension } from "./ensure-hashed-directory-for-extension.injectable";
import type { CreateBaseStore } from "../../../common/base-store/create-base-store.injectable";
import { object } from "../../../common/utils";

interface FileSystemProvisionerStoreModel {
  extensions: Partial<Record<string, string>>; // extension names to paths
}

interface Dependencies {
  readonly directoryForExtensionData: string;
  readonly storeMigrationVersion: string;
  readonly registeredExtensions: ObservableMap<LensExtensionId, string>;
  createBaseStore: CreateBaseStore;
  ensureHashedDirectoryForExtension: EnsureHashedDirectoryForExtension;
}

export class FileSystemProvisionerStore {
  private readonly store: BaseStore<FileSystemProvisionerStoreModel>;

  constructor(private readonly dependencies: Dependencies) {
    this.store = this.dependencies.createBaseStore({
      configName: "lens-filesystem-provisioner-store",
      accessPropertiesByDotNotation: false, // To make dots safe in cluster context names
      projectVersion: this.dependencies.storeMigrationVersion,
      fromStore: action(({ extensions = {}}) => {
        this.dependencies.registeredExtensions.replace(object.entries(extensions));
      }),
      toJSON: () => ({
        extensions: Object.fromEntries(this.dependencies.registeredExtensions),
      }),
    });
  }

  load() {
    this.store.load();
  }

  /**
   * This function retrieves the saved path to the folder which the extension
   * can saves files to. If the folder is not present then it is created.
   * @param extensionName the name of the extension requesting the path
   * @returns path to the folder that the extension can safely write files to.
   */
  async requestDirectory(extensionName: string): Promise<string> {
    return this.dependencies.ensureHashedDirectoryForExtension(extensionName);
  }
}
