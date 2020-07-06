// @ts-check
const path = require('path');
const { fork } = require('child_process');
const rimraf = require('rimraf');

/** @returns {Promise<import('child_process').ChildProcess>} */
function createServer({
  port = 8558
} = {}) {
  return new Promise((resolve, reject) => {
    try {
      let settled = false;
      rimraf.sync(path.resolve(__dirname, 'site/.cache'));
      const proc = fork(require.resolve('gatsby-cli'), ['develop', '-p', port.toString()], {
        cwd: path.resolve(__dirname, 'site'),
        stdio: 'pipe',
        execArgv: [],
        env: {
          PATH: process.env.PATH,
          USER: process.env.USER,
          SHELL: process.env.SHELL,
          PWD: process.env.PWD,
          HOME: process.env.HOME,
          LOGNAME: process.env.LOGNAME
        },
        detached: false,
      });

      process.on('exit', code => proc.kill(code));

      const stdout = [];
      proc.stdout.on('data', chunk => {
        const msg = Buffer.from(chunk, 'utf-8').toString();
        stdout.push(msg);

        if (msg.includes('You can now view graphql-test in the browser.')) {
          settled = true;
          resolve(proc);
        }
      });

      proc.stderr.once('data', chunk => {
        const msg = Buffer.from(chunk, 'utf-8').toString();
        // CI logs this error but it doesn’t matter
        if (msg.includes(`can't open terminal /dev/tty`)) {
          return;
        }
        
        console.error(msg);
        if (!settled) {
          settled = true;
          proc.kill();
          reject(new Error(msg));
        }
      });

      proc.once('error', err => {
        if (!settled) {
          settled = true;
          proc.kill();
          reject(err);
        }
      });

      setTimeout(() => {
        if (!settled) {
          settled = true;
          proc.kill();
          console.log('Process STDOUT:', '\n\n', stdout.join(''));
          reject(new Error('Timeout: server did not start within 10 seconds.'));
        }
      }, 20e3);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = createServer;
