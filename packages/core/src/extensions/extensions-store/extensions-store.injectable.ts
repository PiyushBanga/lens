/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import createBaseStoreInjectable from "../../common/base-store/create-base-store.injectable";
import { ExtensionsStore } from "./extensions-store";
import extensionsStoreMigrationVersionInjectable from "./migration-version.injectable";

const extensionsStoreInjectable = getInjectable({
  id: "extensions-store",
  instantiate: (di) => new ExtensionsStore({
    storeMigrationVersion: di.inject(extensionsStoreMigrationVersionInjectable),
    createBaseStore: di.inject(createBaseStoreInjectable),
  }),
});

export default extensionsStoreInjectable;
