/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { IpcMainInvokeEvent } from "electron";
import type { Disposer } from "@k8slens/utilities";
import type { RequestChannel } from "../../../../common/utils/channel/request-channel-listener-injection-token";
import type { RequestChannelListener } from "./listener-tokens";
import ipcMainInjectionToken from "../../../../common/ipc/ipc-main-injection-token";

export type EnlistRequestChannelListener = <TChannel extends RequestChannel<unknown, unknown>>(listener: RequestChannelListener<TChannel>) => Disposer;

const enlistRequestChannelListenerInjectable = getInjectable({
  id: "enlist-request-channel-listener-for-main",

  instantiate: (di): EnlistRequestChannelListener => {
    const ipcMain = di.inject(ipcMainInjectionToken);

    return ({ channel, handler }) => {
      const nativeHandleCallback = (_: IpcMainInvokeEvent, request: unknown) => handler(request);

      ipcMain.handle(channel.id, nativeHandleCallback);

      return () => {
        ipcMain.off(channel.id, nativeHandleCallback);
      };
    };
  },
});

export default enlistRequestChannelListenerInjectable;
