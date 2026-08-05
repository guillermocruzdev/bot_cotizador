// Conexión Baileys v6 + handlers de mensajes entrantes (inbound).
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState as loadMultiFileAuthState,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import { classifyInbound, type InboundDecision, type LeadStatus } from "./state-manager";
import { getAntiBanConfig } from "../config";

export interface InboundMessage {
  remoteJid: string;
  number: string;
  text: string;
}

export interface BotHandlers {
  onInbound: (
    msg: InboundMessage,
    decision: InboundDecision,
    currentStatus: LeadStatus
  ) => void | Promise<void>;
  onStatus?: (status: "open" | "connecting" | "close", reason?: string) => void;
  onQr?: (qr: string) => void;
}

function extractText(m: WAMessage): string {
  const body = m.message;
  if (!body) return "";
  return (
    body.conversation ??
    body.extendedTextMessage?.text ??
    body.imageMessage?.caption ??
    ""
  );
}

export class WhatsAppBot {
  private sock?: WASocket;
  private handlers?: BotHandlers;
  private humanMode = new Set<string>();
  private reconnectTimer?: NodeJS.Timeout;
  private sessionDir: string;

  constructor(sessionDir = "prospecting/.baileys") {
    this.sessionDir = sessionDir;
  }

  isHumanMode(number: string): boolean {
    return this.humanMode.has(number);
  }

  setHumanMode(number: string, on: boolean): void {
    if (on) this.humanMode.add(number);
    else this.humanMode.delete(number);
  }

  /** Conecta y registra handlers. Reintenta en 5s si la sesión se cae. */
  async connect(handlers: BotHandlers): Promise<void> {
    this.handlers = handlers;
    const { state, saveCreds } = await loadMultiFileAuthState(this.sessionDir);
    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: "warn" });

    this.sock = makeWASocket({
      version,
      auth: state,
      logger,
      browser: Browsers.ubuntu("Chrome"),
      markOnlineOnConnect: true,
      syncFullHistory: false,
      emitOwnEvents: false,
    });

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        qrcode.generate(qr, { small: true });
        this.handlers?.onQr?.(qr);
      }
      if (connection === "close") {
        const boom = lastDisconnect?.error as { output?: { statusCode?: number } } | undefined;
        const code = boom?.output?.statusCode;
        const shouldReconnect =
          code !== DisconnectReason.loggedOut && code !== DisconnectReason.badSession;
        this.handlers?.onStatus?.("close", `code=${code ?? "unknown"}`);
        if (shouldReconnect) {
          this.reconnectTimer = setTimeout(() => void this.connect(handlers), 5000);
        }
      } else if (connection) {
        this.handlers?.onStatus?.(connection);
      }
    });

    this.sock.ev.on("messages.upsert", ({ messages }) => {
      for (const m of messages) {
        void this.handleMessage(m);
      }
    });
  }

  private async handleMessage(m: WAMessage): Promise<void> {
    const remoteJid = m.key?.remoteJid;
    if (!remoteJid || m.key?.fromMe) return;
    if (!remoteJid.endsWith("@s.whatsapp.net")) return; // solo 1:1, no grupos
    const text = extractText(m).trim();
    if (!text) return;

    const number = remoteJid.split("@")[0];
    const decision = classifyInbound(
      "responded",
      text,
      getAntiBanConfig().blacklist_keywords
    );
    await this.handlers?.onInbound?.(
      { remoteJid, number, text },
      decision,
      "responded"
    );
  }

  /** Envía un texto a un número (+52... o 521...). true si salió OK. */
  async sendText(number: string, text: string): Promise<boolean> {
    if (!this.sock) return false;
    const digits = number.replace(/[^0-9]/g, "");
    if (!digits) return false;
    try {
      await this.sock.sendMessage(`${digits}@s.whatsapp.net`, { text });
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.sock?.end(new Error("bot stopped"));
  }
}
