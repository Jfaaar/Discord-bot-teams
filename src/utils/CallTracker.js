const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/call-history.json');

class CallTracker {
  constructor() {
    this.activeSessions = new Map(); // userId -> { startTime, channelId, guildId }
    this.ensureDataFile();
  }

  ensureDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    }
  }

  loadHistory() {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading call history:', error);
      return [];
    }
  }

  saveHistory(data) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving call history:', error);
    }
  }

  startSession(userId, channelId, guildId) {
    this.activeSessions.set(userId, {
      startTime: Date.now(),
      channelId,
      guildId,
    });
    console.log(`Started session for user ${userId} in channel ${channelId}`);
  }

  endSession(userId, channel) {
    const session = this.activeSessions.get(userId);
    if (!session) return;

    const endTime = Date.now();
    const duration = endTime - session.startTime;

    const entry = {
      userId,
      guildId: session.guildId,
      channelId: session.channelId,
      channelName: channel ? channel.name : 'Unknown',
      startTime: session.startTime,
      endTime,
      duration, // in ms
    };

    const history = this.loadHistory();
    history.push(entry);
    this.saveHistory(history);

    this.activeSessions.delete(userId);
    console.log(`Ended session for user ${userId}. Duration: ${duration}ms`);
  }

  handleVoiceStateUpdate(oldState, newState) {
    const userId = newState.member.id;
    const guildId = newState.guild.id;

    // User joined a channel
    if (!oldState.channelId && newState.channelId) {
      this.startSession(userId, newState.channelId, guildId);
    }
    // User left a channel
    else if (oldState.channelId && !newState.channelId) {
      this.endSession(userId, oldState.channel);
    }
    // User switched channels
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      this.endSession(userId, oldState.channel);
      this.startSession(userId, newState.channelId, guildId);
    }
  }

  getStats(guildId, period = 'weekly') {
    const history = this.loadHistory();
    const now = Date.now();
    let cutoff;

    if (period === 'weekly') {
      cutoff = now - 7 * 24 * 60 * 60 * 1000;
    } else if (period === 'monthly') {
      cutoff = now - 30 * 24 * 60 * 60 * 1000;
    } else {
        cutoff = 0; // All time
    }

    const relevantData = history.filter(entry => 
      entry.guildId === guildId && entry.endTime >= cutoff
    );

    // Aggregate by user
    const stats = {};
    relevantData.forEach(entry => {
      if (!stats[entry.userId]) {
        stats[entry.userId] = {
            totalDuration: 0,
            sessions: 0,
            lastSeen: 0
        };
      }
      stats[entry.userId].totalDuration += entry.duration;
      stats[entry.userId].sessions += 1;
      if (entry.endTime > stats[entry.userId].lastSeen) {
          stats[entry.userId].lastSeen = entry.endTime;
      }
    });

    return stats;
  }
}

module.exports = new CallTracker();
