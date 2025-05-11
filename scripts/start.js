const { spawn } = require('child_process');
const path = require('path');

function startProcess(command, args, cwd) {
  const options = {
    cwd: path.resolve(__dirname, '..', cwd),
    shell: true,
    stdio: 'inherit'
  };

  const process = spawn(command, args, options);
  
  process.on('error', (error) => {
    console.error(`Error starting ${cwd}:`, error);
  });

  return process;
}

const backend = startProcess('npm', ['run', 'dev'], 'backend');

const frontend = startProcess('npm', ['start'], 'frontend');

process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
}); 