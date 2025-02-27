/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { Cluster } from "../../common/cluster/cluster";
import { Kubectl } from "../kubectl/kubectl";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import createAuthorizationReviewInjectable from "../../common/cluster/authorization-review.injectable";
import requestNamespaceListPermissionsForInjectable from "../../common/cluster/request-namespace-list-permissions.injectable";
import createListNamespacesInjectable from "../../common/cluster/list-namespaces.injectable";
import prometheusHandlerInjectable from "../cluster/prometheus-handler/prometheus-handler.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import normalizedPlatformInjectable from "../../common/vars/normalized-platform.injectable";
import kubectlBinaryNameInjectable from "../kubectl/binary-name.injectable";
import kubectlDownloadingNormalizedArchInjectable from "../kubectl/normalized-arch.injectable";
import type { ClusterConnection } from "../cluster/cluster-connection.injectable";
import clusterConnectionInjectable from "../cluster/cluster-connection.injectable";
import kubeconfigManagerInjectable from "../kubeconfig-manager/kubeconfig-manager.injectable";
import type { KubeconfigManager } from "../kubeconfig-manager/kubeconfig-manager";
import broadcastConnectionUpdateInjectable from "../cluster/broadcast-connection-update.injectable";

describe("create clusters", () => {
  let cluster: Cluster;
  let clusterConnection: ClusterConnection;

  beforeEach(() => {
    const di = getDiForUnitTesting();
    const clusterServerUrl = "https://192.168.64.3:8443";

    di.override(directoryForUserDataInjectable, () => "some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "some-directory-for-temp");
    di.override(kubectlBinaryNameInjectable, () => "kubectl");
    di.override(kubectlDownloadingNormalizedArchInjectable, () => "amd64");
    di.override(normalizedPlatformInjectable, () => "darwin");
    di.override(broadcastConnectionUpdateInjectable, () => async () => {});
    di.override(createAuthorizationReviewInjectable, () => () => () => Promise.resolve(true));
    di.override(requestNamespaceListPermissionsForInjectable, () => () => async () => () => true);
    di.override(createListNamespacesInjectable, () => () => () => Promise.resolve([ "default" ]));
    di.override(prometheusHandlerInjectable, () => ({
      getPrometheusDetails: jest.fn(),
      setupPrometheus: jest.fn(),
    }));

    di.override(kubeconfigManagerInjectable, () => ({
      ensurePath: async () => "/some-proxy-kubeconfig-file",
    } as Partial<KubeconfigManager> as KubeconfigManager));

    jest.spyOn(Kubectl.prototype, "ensureKubectl").mockReturnValue(Promise.resolve(true));

    cluster = new Cluster({
      id: "foo",
      contextName: "minikube",
      kubeConfigPath: "minikube-config.yml",
    }, {
      clusterServerUrl,
    });

    clusterConnection = di.inject(clusterConnectionInjectable, cluster);
  });

  it("should be able to create a cluster from a cluster model and apiURL should be decoded", () => {
    expect(cluster.apiUrl.get()).toBe("https://192.168.64.3:8443");
  });

  it("reconnect should not throw if contextHandler is missing", () => {
    expect(() => clusterConnection.reconnect()).not.toThrowError();
  });

  it("disconnect should not throw if contextHandler is missing", () => {
    expect(() => clusterConnection.disconnect()).not.toThrowError();
  });

  it("activating cluster should try to connect to cluster and do a refresh", async () => {
    jest.spyOn(clusterConnection, "reconnect").mockImplementation(async () => {});
    jest.spyOn(clusterConnection, "refreshConnectionStatus").mockImplementation(async () => {});

    await clusterConnection.activate();

    expect(clusterConnection.reconnect).toBeCalled();
    expect(clusterConnection.refreshConnectionStatus).toBeCalled();
  });
});
