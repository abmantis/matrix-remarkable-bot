import { LogService } from "matrix-bot-sdk";
import { Remarkable } from "remarkable-typescript";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from 'uuid';

import { Config } from "./config";

const LOGCTXT = "remarkable-client";

interface RemarkableData {
    deviceToken: string;
}

export default class RemarkableClient {
    private rmClient: Remarkable;
    private dataFile: string;

    constructor(private config: Config) {
        this.dataFile = path.join(config.dataPath, "remarkable.json");
    }

    public async load() {
        if (!fs.existsSync(this.dataFile)) {
            LogService.info(LOGCTXT, "No remarkable data found. Not logging in.");
            return;
        }
        const data = JSON.parse(fs.readFileSync(this.dataFile, "utf8")) as RemarkableData;
        this.rmClient = new Remarkable({ deviceToken: data.deviceToken });
        try {
            await this.rmClient.refreshToken();
        } catch (err) {
            LogService.error(LOGCTXT, "Error refreshing remarkable token:", err);
            this.rmClient = undefined;
        }
    }

    public isRegistered(): boolean {
        return this.rmClient !== undefined;
    }

    public async register(code: string) {
        this.rmClient = new Remarkable();
        const deviceToken = await this.rmClient.register({ code: code })
        LogService.info(LOGCTXT, `Device token: ${deviceToken}`);
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify({ "deviceToken": deviceToken }));
        }
        catch (err) {
            LogService.error(LOGCTXT, "Error saving remarkable.json", err);
        }
    }

    public async getAllItems() {
        return this.rmClient.getAllItems();
    }

    public async uploadPdf(name: string, file: Buffer) {
        name = name.replace(".pdf", "");
        await this.rmClient.uploadPDF(name, uuidv4(), file);
    }
}