/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

const extensionsStoreMigrationVersionInjectable = getInjectable({
  id: "extensions-store-migration-version",
  instantiate: () => "6.4.0",
});

export default extensionsStoreMigrationVersionInjectable;
