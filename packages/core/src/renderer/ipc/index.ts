/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterActivateHandler, clusterDisconnectHandler, clusterSetFrameIdHandler, clusterStates } from "../../common/ipc/cluster";
import type { ClusterId, ClusterState } from "../../common/cluster-types";
import { windowActionHandleChannel, windowLocationChangedChannel, windowOpenAppMenuAsContextMenuChannel, type WindowAction } from "../../common/ipc/window";
import { extensionDiscoveryStateChannel, extensionLoaderFromMainChannel } from "../../common/ipc/extension-handling";
import type { InstalledExtension } from "../../extensions/extension-discovery/extension-discovery";
import type { LensExtensionId } from "../../extensions/lens-extension";
import type { Location } from "history";
import { getLegacyGlobalDiForExtensionApi } from "../../extensions/as-legacy-globals-for-extension-api/legacy-global-di-for-extension-api";
import ipcRendererInjectable from "../utils/channel/ipc-renderer.injectable";
import { toJS } from "../../common/utils";

function requestMain(channel: string, ...args: any[]) {
  const di = getLegacyGlobalDiForExtensionApi();

  const ipcRenderer = di.inject(ipcRendererInjectable);

  return ipcRenderer.invoke(channel, ...args.map(toJS));
}

function emitToMain(channel: string, ...args: any[]) {
  const di = getLegacyGlobalDiForExtensionApi();

  const ipcRenderer = di.inject(ipcRendererInjectable);

  return ipcRenderer.send(channel, ...args.map(toJS));
}

export function emitOpenAppMenuAsContextMenu(): void {
  emitToMain(windowOpenAppMenuAsContextMenuChannel);
}

export function emitWindowLocationChanged(location: Location): void {
  emitToMain(windowLocationChangedChannel, location);
}

export function requestWindowAction(type: WindowAction): Promise<void> {
  return requestMain(windowActionHandleChannel, type);
}

export function requestSetClusterFrameId(clusterId: ClusterId): Promise<void> {
  return requestMain(clusterSetFrameIdHandler, clusterId);
}

export function requestClusterActivation(clusterId: ClusterId, force?: boolean): Promise<void> {
  return requestMain(clusterActivateHandler, clusterId, force);
}

export function requestClusterDisconnection(clusterId: ClusterId, force?: boolean): Promise<void> {
  return requestMain(clusterDisconnectHandler, clusterId, force);
}

export function requestInitialClusterStates(): Promise<{ id: string; state: ClusterState }[]> {
  return requestMain(clusterStates);
}

export function requestInitialExtensionDiscovery(): Promise<{ isLoaded: boolean }> {
  return requestMain(extensionDiscoveryStateChannel);
}

export function requestExtensionLoaderInitialState(): Promise<[LensExtensionId, InstalledExtension][]> {
  return requestMain(extensionLoaderFromMainChannel);
}
