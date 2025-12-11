// Mock Kafka producer for analytics events
// In a real implementation, you would use kafkajs

class KafkaProducer {
  constructor() {
    this.events = [];
  }
  
  async send(topic, messages) {
    // Mock implementation - in real app, this would send to Kafka
    console.log(`[Kafka] Sending to ${topic}:`, messages);
    this.events.push(...messages.map(m => ({
      ...m.value,
      topic,
      timestamp: Date.now()
    })));
    
    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }
  
  getEvents() {
    return [...this.events];
  }
}

const producer = new KafkaProducer();

async function produceAnalyticsEvent(eventType, data) {
  try {
    await producer.send('game-analytics', [{
      value: {
        eventType,
        ...data,
        timestamp: Date.now()
      }
    }]);
  } catch (error) {
    console.error('Failed to produce analytics event:', error);
  }
}

module.exports = { produceAnalyticsEvent, producer };