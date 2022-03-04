import { FileMessageEventContent, LogService, MatrixClient, MessageEvent, RichReply, TextualMessageEventContent, UserID } from "matrix-bot-sdk";

import { Config } from "./config";
import * as converters from "./converters";
import RemarkableClient from "./remarkable-client";

const LOGCTXT = "matrix-event-handler";

export default class MatrixEventHandler {
    private botUserId: string;
    private rmClient: RemarkableClient;

    constructor(private client: MatrixClient, private config: Config) {
    }

    public async start() {
        this.botUserId = await this.client.getUserId();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.client.on("room.join", this.onJoin);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.client.on("room.message", this.onMessage);

        this.rmClient = new RemarkableClient(this.config);
        await this.rmClient.load();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private onJoin = async (roomId: string, event: never) => {
        LogService.info(LOGCTXT, `Joined room ${roomId}`);
        await this.client.sendMessage(roomId, {
            "msgtype": "m.text",
            "body": "Hello, world!",
        });
    }

    private onMessage = async (roomId: string, ev: unknown) => {
        const event = new MessageEvent(ev);
        if (event.isRedacted) return;
        if (event.sender === this.botUserId) return;

        if (event.messageType === "m.text") {
            await this.handleTextMessage(roomId, ev as MessageEvent<TextualMessageEventContent>);
            return;
        }
        if (event.messageType === "m.file") {
            await this.handleFileMessage(roomId, ev as MessageEvent<FileMessageEventContent>);
            return;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async handleTextMessage(roomId: string, event: MessageEvent<TextualMessageEventContent>) {
        const text = event.content?.body?.trim();
        if (text.startsWith("register")) {
            await this.handleCommandRegister(roomId, text);
        } else if (text.startsWith("list")) {
            await this.handleCommandList(roomId);
        } else if (text.startsWith("http://") || text.startsWith("https://")) {
            await this.handleUrlMessage(roomId, text);
        } else {
            await this.sendHelpMsg(roomId);
        }
    }

    private async handleFileMessage(roomId: string, event: MessageEvent<FileMessageEventContent>) {
        LogService.info(LOGCTXT, `Handling file in ${roomId}`);
        if (event.content.info?.mimetype !== "application/pdf") {
            await this.client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": "File is not a PDF.",
            });
            return;
        }

        const { data: pdfData, contentType } =
            await this.client.downloadContent(event.content.url);
        if (contentType !== "application/pdf") {
            await this.client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": "File content is not a PDF.",
            });
            return;
        }

        const fileName = event.content.body?.trim() || "matrix.pdf";

        try {
            await this.rmClient.uploadPdf(fileName, pdfData);
        } catch (err) {
            await this.client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": "Failed to send PDF to reMarkable™.",
            });
            return;
        }

        await this.client.sendMessage(roomId, {
            "msgtype": "m.notice",
            "body": "PDF sent to reMarkable™!",
        });
    }

    private async handleUrlMessage(roomId: string, url: string) {
        LogService.info(LOGCTXT, `Handling URL in ${roomId}`);
        if (!this.isValidHttpUrl(url)) {
            await this.client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": "Invalid URL.",
            });
            return;
        }

        await this.client.sendMessage(roomId, {
            "msgtype": "m.notice",
            "body": "Converting URL to PDF...",
        });

        const pdfBuffer = await converters.convertUrlToPdf(url);
        if (!pdfBuffer) {
            await this.client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": "PDF could not be generated for" + url,
            });
            return;
        }

        // TODO: use page title
        const fileName = url;
        try {
            await this.rmClient.uploadPdf(fileName, pdfBuffer);
        } catch (err) {
            await this.client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": "Failed to send PDF to reMarkable™.",
            });
            return;
        }

        await this.client.sendMessage(roomId, {
            "msgtype": "m.notice",
            "body": "PDF sent to reMarkable™!",
        });
    }

    private async handleCommandRegister(roomId: string, cmd: string) {
        const words = cmd.split(/\s+/);
        if (words.length !== 2) {
            const help = "To register the bot, go to https://my.remarkable.com/device/desktop/connect copy the code " +
                "and then use the following command:\n\n" +
                "    register <code>";
            await this.client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": help,
            });
            return;
        }
        await this.client.sendMessage(roomId, {
            "msgtype": "m.notice",
            "body": "Registration in progress...",
        });

        const code = words[1];
        await this.rmClient.register(code)
        if (this.rmClient.isRegistered()) {
            await this.client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": "Bot registered!",
            });
        } else {
            await this.client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": "Registration failed!",
            });
        }
    }

    private async handleCommandList(roomId: string) {
        if (!this.rmClient.isRegistered()) {
            await this.sendNotRegisteredMsg(roomId);
            return;
        }
        const items = await this.rmClient.getAllItems();
        let reply = "Items:\n\n";
        for (const item of items) {
            // TODO: make this a decent looking human list
            reply += JSON.stringify(item) + "\n";
        }
        await this.client.sendMessage(roomId, {
            "msgtype": "m.notice",
            "body": reply,
        });
    }

    private async sendNotRegisteredMsg(roomId: string) {
        const help =
            "Bot not registered in the reMarkable™ cloud. Please use the `register` command first.";
        await this.client.sendMessage(roomId, {
            "msgtype": "m.notice",
            "body": help,
        });
    }

    private async sendHelpMsg(roomId: string) {
        const help =
            "This bot can be used to send PDFs and URLs (as PDFs) to the reMarkable™ cloud.\n" +
            "Just send me a PDF, or type an URL and I'll send it to your Markable™!\n\n" +
            "Commands:\n" +
            "    - help: Prints this help message.\n" +
            "    - register: Registers this bot in the reMarkable™ cloud.\n" +
            "    - list: Lists all items in the reMarkable™ cloud (in an ugly way, for now).";

        await this.client.sendMessage(roomId, {
            "msgtype": "m.notice",
            "body": help,
        });
    }

    private isValidHttpUrl(urlStr: string) {
        let url: URL;
        try {
            url = new URL(urlStr);
        } catch (_) {
            return false;
        }

        return url.protocol === "http:" || url.protocol === "https:";
    }
}