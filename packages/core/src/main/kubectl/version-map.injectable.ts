/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { SemVer } from "semver";
import bundledKubectlVersionInjectable from "../../common/vars/bundled-kubectl-version.injectable";
import { kubectlVersionsInjectable } from "@k8slens/kubectl-versions";

const kubectlVersionMapInjectable = getInjectable({
  id: "kubectl-version-map",
  instantiate: (di) => {
    const bundledKubectlVersion = di.inject(bundledKubectlVersionInjectable);
    const bundledKubectlSemVer = new SemVer(bundledKubectlVersion);
    const kubectlVersions = di.inject(kubectlVersionsInjectable);

    return new Map([
      ...kubectlVersions,
      [`${bundledKubectlSemVer.major}.${bundledKubectlSemVer.minor}`, bundledKubectlVersion],
    ]);
  },
});

export default kubectlVersionMapInjectable;
