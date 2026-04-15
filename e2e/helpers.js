const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');
const DB_BACKUP_PATH = path.join(__dirname, '..', 'server', 'db.backup.json');

/**
 * Back up db.json before tests and restore after.
 */
function backupDb() {
  fs.copyFileSync(DB_PATH, DB_BACKUP_PATH);
}

function restoreDb() {
  if (fs.existsSync(DB_BACKUP_PATH)) {
    fs.copyFileSync(DB_BACKUP_PATH, DB_PATH);
    fs.unlinkSync(DB_BACKUP_PATH);
  }
}

/**
 * Seed localStorage with the JWT token so the app starts authenticated.
 */
async function loginAsTestUser(page) {
  await page.addInitScript(() => {
    localStorage.setItem('jwtToken', 'maeve-static-jwt-token-2026');
  });
}

/**
 * Clear localStorage so the app starts unauthenticated.
 */
async function clearAuth(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('jwtToken');
  });
}

module.exports = { backupDb, restoreDb, loginAsTestUser, clearAuth };
