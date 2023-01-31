/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "../../common/test-utils/get-global-override";
import requestGreatestKubectlPatchVersionInjectable from "./request-greatest-patch-version.injectable";

export default getGlobalOverride(requestGreatestKubectlPatchVersionInjectable, () => async () => undefined);
