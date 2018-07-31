import { WebSocketServer } from './WebSocketServer';
import { EnvManager } from '../managers/EnvManager';
import { Logger, LoggerConf } from 'busybee-util';
import { MessageTypes } from './MessageTypes';

export class TestWebSocketServer extends WebSocketServer {
  private envManager:EnvManager;

  constructor(conf:any, envManager:EnvManager) {
    super(conf);
    this.envManager = envManager;
    const loggerConf = new LoggerConf(this, conf.logLevel, null);
    this.logger = new Logger(loggerConf);

    setInterval(this.emitStatus.bind(this), 5000);
  }

  emitStatus() {
    this.logger.debug('emitStatus');
    let msg = {
      type: MessageTypes.TEST_RUN_STATUS,
      data: {
        envs: this.envManager.getCurrentEnvs(),
        hosts: this.envManager.getCurrentHosts()
      }
    };
    this.logger.trace(msg);
    this.broadcast(JSON.stringify(msg));
  }

}
