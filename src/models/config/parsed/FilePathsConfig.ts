import * as path from 'path';

export class FilePathsConfig {
  userConfigFile: string;
  busybeeDir: string;

  constructor(cmdOpts: any) {
    const opts = Object.assign({}, cmdOpts);
    let dir = opts.directory ? opts.directory : 'busybee';
    let cFile = opts.config ? opts.config : 'config.js';
    this.busybeeDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    this.userConfigFile = path.join(this.busybeeDir, cFile);
  }
}
