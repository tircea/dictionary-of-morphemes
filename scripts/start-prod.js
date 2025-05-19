const { spawn, exec } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';

console.log(`Detected ${isWindows ? 'Windows' : 'Unix-like'} operating system`);

const backendDir = path.join(__dirname, '..', 'backend');
const frontendDir = path.join(__dirname, '..', 'frontend');

console.log('Building frontend application...');
const buildProcess = exec('npm run build', { cwd: frontendDir });

buildProcess.stdout.on('data', (data) => {
  console.log(`Frontend build: ${data}`);
});

buildProcess.stderr.on('data', (data) => {
  console.error(`Frontend build error: ${data}`);
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Frontend build process exited with code ${code}`);
    process.exit(code);
  }

  console.log('Frontend build completed successfully');
  startServers();
});

function startServers() {
  if (isWindows) {
    console.log('Starting servers using Windows commands...');
    
    const backendProcess = exec('start cmd /c "cd backend && npm run start:prod"', 
      { cwd: path.join(__dirname, '..') });

    setTimeout(() => {
      const frontendProcess = exec('start cmd /c "cd frontend && npx serve -s build"', 
        { cwd: path.join(__dirname, '..') });
      
      console.log('Both servers should now be running in separate windows');
    }, 1000);
    
  } else {
    console.log('Starting servers on Unix-like system...');
    const backendProcess = spawn('npm', ['run', 'start:prod'], { 
      cwd: backendDir,
      stdio: 'inherit',
      shell: true
    });

    const frontendProcess = spawn('npx', ['serve', '-s', 'build'], { 
      cwd: frontendDir,
      stdio: 'inherit',
      shell: true
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      frontendProcess.kill();
    });

    frontendProcess.on('close', (code) => {
      console.log(`Frontend process exited with code ${code}`);
      backendProcess.kill();
    });

    process.on('SIGINT', () => {
      console.log('Stopping all servers...');
      backendProcess.kill();
      frontendProcess.kill();
    });
  }
} 