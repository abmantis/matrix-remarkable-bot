import {
    AutojoinRoomsMixin,
    LogLevel,
    LogService,
    MatrixClient,
    RichConsoleLogger,
    SimpleFsStorageProvider,
} from "matrix-bot-sdk";

import * as path from "path";
import { parseConfig } from "./config";
import MatrixEventHandler from "./matrix-event-handler";

const LOGCTXT = "index";

LogService.setLogger(new RichConsoleLogger());
LogService.setLevel(LogLevel.DEBUG);
LogService.info(LOGCTXT, "Bot starting...");

void (async function () {
    const config = parseConfig("config.yaml");

    const storage = new SimpleFsStorageProvider(path.join(config.dataPath, "bot.json"));
    //const cryptoStore = new RustSdkCryptoStorageProvider(path.join(config.dataPath, "encrypted"));
    const client = new MatrixClient(config.homeserverUrl, config.accessToken, storage);
    await client.setDisplayName("reMarkable Bot")

    AutojoinRoomsMixin.setupOnClient(client);

    const eventHandler = new MatrixEventHandler(client, config);
    await eventHandler.start();

    await client.start().then(() => LogService.info(LOGCTXT, "Bot started!"));
})();
