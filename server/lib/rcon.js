/**
 * RCON client for Minecraft server
 * Uses Node.js net module for TCP communication
 */

const net = require("net");

class RCONClient {
  constructor(host, port, password) {
    this.host = host;
    this.port = port;
    this.password = password;
    this.socket = null;
    this.requestId = 0;
    this.connected = false;
  }

  /**
   * Create an RCON packet
   * @param {number} id - Request ID
   * @param {number} type - Packet type (3 = auth, 2 = command)
   * @param {string} body - Packet body
   * @returns {Buffer}
   */
  createPacket(id, type, body) {
    const bodyBuffer = Buffer.from(body + "\0\0", "utf8");
    const length = 4 + 4 + bodyBuffer.length;
    const buffer = Buffer.alloc(4 + length);
    
    buffer.writeInt32LE(length, 0);
    buffer.writeInt32LE(id, 4);
    buffer.writeInt32LE(type, 8);
    bodyBuffer.copy(buffer, 12);
    
    return buffer;
  }

  /**
   * Read an RCON packet from buffer
   * @param {Buffer} buffer - Data buffer
   * @returns {{ id: number, type: number, body: string }}
   */
  parsePacket(buffer) {
    const length = buffer.readInt32LE(0);
    const id = buffer.readInt32LE(4);
    const type = buffer.readInt32LE(8);
    const body = buffer.slice(12, 12 + length - 10).toString("utf8");
    
    return { id, type, body };
  }

  /**
   * Connect to the RCON server
   * @returns {Promise<boolean>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      console.log(`Connecting to RCON at ${this.host}:${this.port}`);
      
      this.socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        this.socket?.destroy();
        reject(new Error("RCON connection timeout"));
      }, 10000);
      
      this.socket.connect(this.port, this.host, () => {
        console.log("RCON socket connected, sending auth...");
        
        // Send auth packet
        const authPacket = this.createPacket(++this.requestId, 3, this.password);
        this.socket.write(authPacket);
      });
      
      this.socket.once("data", (data) => {
        clearTimeout(timeout);
        
        try {
          const response = this.parsePacket(data);
          console.log("RCON auth response:", response);
          
          if (response.id === -1) {
            this.connected = false;
            resolve(false);
          } else {
            this.connected = true;
            resolve(true);
          }
        } catch (err) {
          console.error("Failed to parse auth response:", err);
          resolve(false);
        }
      });
      
      this.socket.on("error", (err) => {
        clearTimeout(timeout);
        console.error("RCON connection error:", err);
        this.connected = false;
        reject(err);
      });
      
      this.socket.on("close", () => {
        this.connected = false;
      });
    });
  }

  /**
   * Send a command to the RCON server
   * @param {string} command - Command to send
   * @returns {Promise<string>}
   */
  sendCommand(command) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        return reject(new Error("Not connected"));
      }
      
      console.log(`Sending RCON command: ${command}`);
      
      const timeout = setTimeout(() => {
        reject(new Error("RCON command timeout"));
      }, 10000);
      
      const packet = this.createPacket(++this.requestId, 2, command);
      this.socket.write(packet);
      
      this.socket.once("data", (data) => {
        clearTimeout(timeout);
        
        try {
          const response = this.parsePacket(data);
          console.log("RCON command response:", response);
          resolve(response.body);
        } catch (err) {
          console.error("Failed to parse command response:", err);
          reject(err);
        }
      });
    });
  }

  /**
   * Close the RCON connection
   */
  close() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.connected = false;
    }
  }
}

/**
 * Execute an RCON command with automatic connection handling
 * @param {string} command - Command to execute
 * @returns {Promise<{ success: boolean, result?: string, error?: string }>}
 */
async function executeRconCommand(command) {
  const host = process.env.RCON_HOST;
  const port = parseInt(process.env.RCON_PORT || "25575");
  const password = process.env.RCON_PASSWORD;
  
  if (!host || !password) {
    return { success: false, error: "RCON not configured" };
  }
  
  const rcon = new RCONClient(host, port, password);
  
  try {
    const connected = await rcon.connect();
    if (!connected) {
      return { success: false, error: "RCON authentication failed" };
    }
    
    const result = await rcon.sendCommand(command);
    rcon.close();
    
    return { success: true, result };
  } catch (err) {
    rcon.close();
    return { success: false, error: err.message };
  }
}

/**
 * Validate Minecraft username (3-16 chars, alphanumeric + underscore)
 * @param {string} username 
 * @returns {boolean}
 */
function validateMinecraftUsername(username) {
  if (!username || typeof username !== "string") return false;
  return /^[a-zA-Z0-9_]{3,16}$/.test(username);
}

/**
 * Sanitize string for RCON command (remove dangerous characters)
 * @param {string} input 
 * @returns {string}
 */
function sanitizeForRCON(input) {
  if (!input || typeof input !== "string") return "";
  return input.replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * Sanitize rank name for RCON
 * @param {string} rankName 
 * @returns {string}
 */
function sanitizeRankName(rankName) {
  if (!rankName || typeof rankName !== "string") return "";
  return sanitizeForRCON(rankName.replace(/ Rank$/i, "").toLowerCase());
}

module.exports = {
  RCONClient,
  executeRconCommand,
  validateMinecraftUsername,
  sanitizeForRCON,
  sanitizeRankName,
};
