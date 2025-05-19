const { spawn } = require('child_process');
const path = require('path');

console.log('Starting development servers...');

// Start backend
const backendProcess = spawn('npm', ['run', 'start:backend'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

// Start frontend
const frontendProcess = spawn('npm', ['run', 'start:frontend'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

// Handle process exits
backendProcess.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
  frontendProcess.kill();
});

frontendProcess.on('close', (code) => {
  console.log(`Frontend process exited with code ${code}`);
  backendProcess.kill();
});

// Handle script termination
process.on('SIGINT', () => {
  console.log('Stopping all servers...');
  backendProcess.kill();
  frontendProcess.kill();
});

console.log('Development servers started. Press Ctrl+C to stop.'); 