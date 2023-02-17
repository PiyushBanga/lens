/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { KubeObjectStoreDependencies, KubeObjectStoreOptions } from "../../../common/k8s-api/kube-object.store";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { Service, ServiceApi } from "../../../common/k8s-api/endpoints/service.api";
import type { GetPodsByOwnerId } from "../+workloads-pods/get-pods-by-owner-id.injectable";
import type { Pod } from "../../../common/k8s-api/endpoints";

interface Dependencies extends KubeObjectStoreDependencies {
  getPodsByOwnerId: GetPodsByOwnerId;
}

export class ServiceStore extends KubeObjectStore<Service, ServiceApi> {

  constructor(protected readonly dependencies: Dependencies, api: ServiceApi, opts?: KubeObjectStoreOptions) {
    super(dependencies, api, opts);
  }

  getChildPods(service: Service): Pod[] {
    return this.dependencies.getPodsByOwnerId(service.getId());
  }
}
