/**
 * Intentionally insecure patterns for Snyk Code demos and training.
 * Do not copy into production code.
 */

const fs = require('fs');
const http = require('http');

// Hardcoded secret (Snyk Code: hardcoded credentials / secrets)
// Use a non-provider-shaped placeholder so GitHub push protection does not block the repo.
const DEMO_API_SECRET = 'HARDCODED_INSECURE_DEMO_SECRET_TRAINING_ONLY_001';

function runUserExpression(expr) {
  // Arbitrary code execution
  return eval(expr);
}

function lookupAccount(userId) {
  // SQL injection pattern
  return "SELECT * FROM accounts WHERE id = '" + userId + "'";
}

function loadAttachment(filename) {
  // Path traversal when filename is user-controlled
  return fs.readFileSync('/var/uploads/' + filename, 'utf8');
}

function handleRequest(req, res) {
  const body = [];
  req.on('data', (chunk) => body.push(chunk));
  req.on('end', () => {
    const input = Buffer.concat(body).toString();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(String(runUserExpression(input)));
  });
}

if (require.main === module) {
  http.createServer(handleRequest).listen(3000, () => {
    // eslint-disable-next-line no-console
    console.log('Demo server (insecure):', DEMO_API_SECRET.slice(0, 8) + '…');
  });
}

module.exports = {
  runUserExpression,
  lookupAccount,
  loadAttachment,
  DEMO_API_SECRET,
};
