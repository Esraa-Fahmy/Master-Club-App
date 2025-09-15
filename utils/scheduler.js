// cronJobs/expiredSubscriptions.js
const cron = require("node-cron");
const { checkExpiredMemberships } = require("../controllers/membershipSubscriptionController");

// Run every minute to check expired memberships
cron.schedule("* * * * *", async () => {
  console.log("⏰ Running cron job: check expired memberships");
  await checkExpiredMemberships();
});
