/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@k8slens/test-utils";
import writeFileInjectable from "./write-file.injectable";

export default getGlobalOverride(writeFileInjectable, () => async () => {
  throw new Error("tried to write file without override");
});
