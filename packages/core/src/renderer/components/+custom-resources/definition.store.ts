/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed, reaction, makeObservable } from "mobx";
import type { KubeObjectStoreDependencies, KubeObjectStoreOptions } from "../../../common/k8s-api/kube-object.store";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { CustomResourceDefinition, CustomResourceDefinitionApi } from "../../../common/k8s-api/endpoints/custom-resource-definition.api";
import type { KubeObject } from "../../../common/k8s-api/kube-object";
import type TypedEventEmitter from "typed-emitter";
import type { LegacyAutoRegistration } from "../../../common/k8s-api/api-manager/auto-registration-emitter.injectable";
import autoBind from "auto-bind";

export interface CustomResourceDefinitionStoreDependencies extends KubeObjectStoreDependencies {
  readonly autoRegistration: TypedEventEmitter<LegacyAutoRegistration>;
}

export class CustomResourceDefinitionStore extends KubeObjectStore<CustomResourceDefinition, CustomResourceDefinitionApi> {
  constructor(
    protected readonly dependencies: CustomResourceDefinitionStoreDependencies,
    api: CustomResourceDefinitionApi,
    opts?: KubeObjectStoreOptions,
  ) {
    super(dependencies, api, opts);
    makeObservable(this);
    autoBind(this);

    reaction(
      () => this.getItems(),
      crds => {
        for (const crd of crds) {
          this.dependencies.autoRegistration.emit("customResourceDefinition", crd);
        }
      },
    );
  }

  protected sortItems(items: CustomResourceDefinition[]) {
    return super.sortItems(items, [
      crd => crd.getGroup(),
      crd => crd.getName(),
    ]);
  }

  @computed get groups() {
    const groups: Record<string, CustomResourceDefinition[]> = {};

    for (const crd of this.items) {
      (groups[crd.getGroup()] ??= []).push(crd);
    }

    return groups;
  }

  getByGroup(group: string, pluralName: string) {
    return this.groups[group]?.find(crd => crd.getPluralName() === pluralName);
  }

  getByObject(obj: KubeObject) {
    const { kind, apiVersion } = obj;

    return this.items.find(crd => (
      kind === crd.getResourceKind() && apiVersion === `${crd.getGroup()}/${crd.getVersion()}`
    ));
  }
}
