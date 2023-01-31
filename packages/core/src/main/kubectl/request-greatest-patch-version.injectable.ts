/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { TypedRegEx } from "typed-regex";
import fetchInjectable from "../../common/fetch/fetch.injectable";
import loggerInjectable from "../../common/logger.injectable";
import { XMLParser } from "fast-xml-parser";

export type RequestGreatestKubectlPatchVersion = (majorMinor: string) => Promise<string | undefined>;

const expectedResponseForm = TypedRegEx("^v(?<version>\\d+\\.\\d+\\.\\d+)$");

const requestGreatestKubectlPatchVersionInjectable = getInjectable({
  id: "request-greatest-kubectl-patch-version",
  instantiate: (di): RequestGreatestKubectlPatchVersion => {
    const fetch = di.inject(fetchInjectable);
    const logger = di.inject(loggerInjectable);

    return async (majorMinor) => {
      const response = await fetch(`https://dl.k8s.io/release/stable-${majorMinor}.txt`);

      if (response.status !== 200) {
        try {
          const parser = new XMLParser();
          const errorBody = parser.parse(await response.text());

          logger.warn(`[KUBECTL-VERSION-MAP]: failed to get stable version for ${majorMinor}: ${errorBody?.Error?.Message ?? response.statusText}`);
        } catch {
          logger.warn(`[KUBECTL-VERSION-MAP]: failed to get stable version for ${majorMinor}: ${response.statusText}`);
        }

        return undefined;
      }

      const body = await response.text();
      const match = expectedResponseForm.captures(body);

      if (!match) {
        logger.warn(`[KUBECTL-VERSION-MAP]: failed to get stable version for ${majorMinor}: unexpected response shape`, { body });

        return undefined;
      }

      return match.version;
    };
  },
  causesSideEffects: true,
});

export default requestGreatestKubectlPatchVersionInjectable;
