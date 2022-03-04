import * as fs from "fs";
import { LogService } from "matrix-bot-sdk";
import * as YAML from "yaml";

const LOGCTXT = "config";

export interface Config {
    homeserverUrl: string;
    accessToken: string;
    dataPath: string;
}

export function parseConfig(filePath: string) {
    LogService.info(LOGCTXT, "Parsing config file:", filePath);
    return YAML.parse(fs.readFileSync(filePath, "utf8")) as Config;
}

