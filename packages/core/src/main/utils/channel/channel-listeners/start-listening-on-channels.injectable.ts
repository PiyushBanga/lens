/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { onLoadOfApplicationInjectionToken } from "@k8slens/application";
import listeningOnMessageChannelsInjectable from "../../../../common/utils/channel/listening-on-message-channels.injectable";
import listeningOnRequestChannelsInjectable from "./listening-on-request-channels.injectable";

const startListeningOnChannelsInjectable = getInjectable({
  id: "start-listening-on-channels-main",

  instantiate: (di) => ({
    run: () => {
      const listeningOnMessageChannels = di.inject(listeningOnMessageChannelsInjectable);
      const listeningOnRequestChannels = di.inject(listeningOnRequestChannelsInjectable);

      listeningOnMessageChannels.start();
      listeningOnRequestChannels.start();
    },
  }),

  injectionToken: onLoadOfApplicationInjectionToken,
});

export default startListeningOnChannelsInjectable;
