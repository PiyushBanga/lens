/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { SemVer } from "semver";
import { beforeApplicationIsLoadingInjectionToken } from "../library";
import requestGreatestKubectlPatchVersionInjectable from "./request-greatest-patch-version.injectable";
import kubectlVersionMapInjectable from "./version-map.injectable";

const initializeKubectlVersionMapInjectable = getInjectable({
  id: "initialize-kubectl-version-map",
  instantiate: (di) => ({
    id: "initialize-kubectl-version-map",
    run: async () => {
      const requestGreatestKubectlPatchVersion = di.inject(requestGreatestKubectlPatchVersionInjectable);
      const kubectlVersionMap = di.inject(kubectlVersionMapInjectable);

      const greatestVersion = await requestGreatestKubectlPatchVersion("1");

      if (!greatestVersion) {
        return;
      }

      const greatestSemVer = new SemVer(greatestVersion);

      for (let i = 0; i <= greatestSemVer.minor; i += 1) {
        const majorMinor = `1.${i}`;

        if (kubectlVersionMap.has(majorMinor)) {
          continue;
        }

        const version = await requestGreatestKubectlPatchVersion(majorMinor);

        if (!version) {
          continue;
        }

        kubectlVersionMap.set(majorMinor, version);
      }
    },
  }),
  injectionToken: beforeApplicationIsLoadingInjectionToken,
});

export default initializeKubectlVersionMapInjectable;
