const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname);

// Check .env
if (!fs.existsSync(path.join(root, '.env'))) {
    console.error('ERROR: File .env tidak ditemukan di root project!');
    console.error('Salin .env.example ke .env dan isi dengan API key yang benar.');
    process.exit(1);
}

// Copy .env to backend-api if not exists
const backendEnv = path.join(root, 'backend-api', '.env');
if (!fs.existsSync(backendEnv)) {
    console.log('Menyalin .env ke backend-api...');
    fs.copyFileSync(path.join(root, '.env'), backendEnv);
}

const isWin = process.platform === 'win32';

function run(name, command, args, cwd) {
    let child;
    if (isWin) {
        // Windows: gunakan cmd.exe untuk menghindari PowerShell execution policy
        // dan memastikan PATH (termasuk pnpm) ter-load dengan benar
        child = spawn('cmd.exe', ['/c', command, ...args], {
            cwd: path.join(root, cwd),
            stdio: 'inherit',
        });
    } else {
        child = spawn('bash', ['-c', command], {
            cwd: path.join(root, cwd),
            stdio: 'inherit',
        });
    }
    child.on('error', (err) => {
        console.error(`Failed to start ${name}:`, err.message);
    });
    return child;
}

console.log('===========================================');
console.log('  Starting AI Patient Navigator Pro...');
console.log('===========================================');
console.log('');

// Determine agent command based on platform
const agentCmd = isWin
    ? path.join(root, 'agents', '.venv', 'Scripts', 'python.exe')
    : 'uv run python triage_agent.py';

const backend = run('Backend (Express)', 'node', ['server.js'], 'backend-api');
const frontend = run('Frontend (Vite)', 'pnpm', ['run', 'dev'], 'frontend');
const agent = run('Agent (Python/Band SDK)', agentCmd, ['triage_agent.py'], 'agents');

console.log('');
console.log('===========================================');
console.log('  All services started!');
console.log('===========================================');
console.log('');
console.log('- Frontend: http://localhost:5173');
console.log('- Backend:  http://localhost:5000');
console.log('- Agent:    Running in background');
console.log('');
console.log('Press Ctrl+C to stop all services');
console.log('');

process.on('SIGINT', () => {
    console.log('\nStopping all services...');
    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');
    agent.kill('SIGTERM');
    process.exit(0);
});