import * as path from 'path';

export class FilePathsConfig {
  userConfigFile: string;
  busybeeDir: string;

  constructor(cmdOpts: any) {
    let dir = cmdOpts.directory ? cmdOpts.directory : 'busybee';
    let cFile = cmdOpts.config ? cmdOpts.config : 'config.json';
    this.busybeeDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    this.userConfigFile = path.join(this.busybeeDir, cFile);
  }
}
