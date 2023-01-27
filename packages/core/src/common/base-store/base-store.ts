/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type Config from "conf";
import type { Migrations, Options as ConfOptions } from "conf/dist/source/types";
import type { IEqualsComparer } from "mobx";
import { reaction } from "mobx";
import { disposer, isPromiseLike, toJS } from "../utils";
import isEqual from "lodash/isEqual";
import { kebabCase } from "lodash";
import type { GetConfigurationFileModel } from "../get-configuration-file-model/get-configuration-file-model.injectable";
import type { Logger } from "../logger";
import type { PersistStateToConfig } from "./save-to-file";
import type { GetBasenameOfPath } from "../path/get-basename.injectable";
import type { EnlistMessageChannelListener } from "../utils/channel/enlist-message-channel-listener-injection-token";
import type { SendMessageToChannel } from "../utils/channel/message-to-channel-injection-token";
import type { MessageChannel } from "../utils/channel/message-channel-listener-injection-token";

export interface BaseStoreParams<T> extends Omit<ConfOptions<T>, "migrations"> {
  syncOptions?: {
    fireImmediately?: boolean;
    equals?: IEqualsComparer<T>;
  };
  readonly configName: string;

  migrations?: Migrations<Record<string, unknown>>;

  /**
   * fromStore is called internally when a child class syncs with the file
   * system.
   *
   * Note: This function **must** be synchronous.
   *
   * @param data the parsed information read from the stored JSON file
   */
  fromStore(data: Partial<T>): void;

  /**
   * toJSON is called when syncing the store to the filesystem. It should
   * produce a JSON serializable object representation of the current state.
   *
   * It is recommended that a round trip is valid. Namely, calling
   * `this.fromStore(this.toJSON())` shouldn't change the state.
   */
  toJSON(): T;
}

export interface IpcChannelPrefixes {
  readonly local: string;
  readonly remote: string;
}

export interface BaseStoreDependencies {
  readonly logger: Logger;
  readonly directoryForUserData: string;
  readonly ipcChannelPrefixes: IpcChannelPrefixes;
  readonly shouldDisableSyncInListener: boolean;
  getConfigurationFileModel: GetConfigurationFileModel;
  persistStateToConfig: PersistStateToConfig;
  getBasenameOfPath: GetBasenameOfPath;
  enlistMessageChannelListener: EnlistMessageChannelListener;
  sendMessageToChannel: SendMessageToChannel;
}

/**
 * Note: T should only contain base JSON serializable types.
 */
export class BaseStore<T extends object> {
  private readonly syncDisposers = disposer();

  readonly displayName = kebabCase(this.params.configName).toUpperCase();

  /**
   * @ignore
   */
  protected readonly dependencies: BaseStoreDependencies;

  constructor(
    dependencies: BaseStoreDependencies,
    protected readonly params: BaseStoreParams<T>,
  ) {
    this.dependencies = dependencies;
  }

  /**
   * This must be called after the last child's constructor is finished (or just before it finishes)
   */
  load() {
    this.dependencies.logger.info(`[${this.displayName}]: LOADING ...`);

    const config = this.dependencies.getConfigurationFileModel({
      projectName: "lens",
      cwd: this.cwd(),
      ...this.params as ConfOptions<T>,
    });

    const res = this.params.fromStore(config.store);

    if (isPromiseLike(res)) {
      this.dependencies.logger.error(`${this.displayName} extends BaseStore<T>'s fromStore method returns a Promise or promise-like object. This is an error and must be fixed.`);
    }

    this.startSyncing(config);
    this.dependencies.logger.info(`[${this.displayName}]: LOADED from ${config.path}`);
  }

  protected cwd() {
    return this.dependencies.directoryForUserData;
  }

  private startSyncing(config: Config<T>) {
    const name = this.dependencies.getBasenameOfPath(config.path);

    const disableSync = () => this.syncDisposers();

    const sendChannel: MessageChannel<T> = {
      id: `${this.dependencies.ipcChannelPrefixes.remote}:${config.path}`,
    };
    const receiveChannel: MessageChannel<T> = {
      id: `${this.dependencies.ipcChannelPrefixes.local}:${config.path}`,
    };

    const enableSync = () => {
      this.syncDisposers.push(
        reaction(
          () => toJS(this.params.toJSON()), // unwrap possible observables and react to everything
          model => {
            this.dependencies.persistStateToConfig(config, model);
            this.dependencies.sendMessageToChannel(sendChannel, model);
          },
          this.params.syncOptions,
        ),
        this.dependencies.enlistMessageChannelListener({
          channel: receiveChannel,
          handler: (model) => {
            this.dependencies.logger.silly(`[${this.displayName}]: syncing ${name}`, { model });

            if (this.dependencies.shouldDisableSyncInListener) {
              disableSync();
            }

            // todo: use "resourceVersion" if merge required (to avoid equality checks => better performance)
            if (!isEqual(this.params.toJSON(), model)) {
              this.params.fromStore(model);
            }

            if (this.dependencies.shouldDisableSyncInListener) {
              setImmediate(() => {
                enableSync();
              });
            }
          },
        }),
      );
    };

    enableSync();
  }
}
