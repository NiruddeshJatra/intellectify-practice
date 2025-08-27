const cron = require('node-cron');
const imageService = require('../services/fileStorageService');

class Scheduler {
  static init() {
    // Run cleanup every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Running scheduled task: Clean up temporary files');
      try {
        await imageService.cleanupTempFiles();
        console.log('Successfully cleaned up temporary files');
      } catch (error) {
        console.error('Error in scheduled cleanup:', error);
      }
    });
  }
}

module.exports = Scheduler;
