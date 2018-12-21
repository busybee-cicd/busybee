import { OPEN, Server } from 'ws';
import { Logger, LoggerConf } from 'busybee-util';

export class WebSocketServer {
  protected wss: Server;
  protected logger: Logger;

  constructor(conf: any) {
    const loggerConf = new LoggerConf(this, conf.logLevel, null);
    this.logger = new Logger(loggerConf);
    this.wss = new Server({ port: conf.port });

    this.logger.info(`wss running at ${conf.port}`);

    this.wss.on('connection', ws => {
      this.logger.info('client connected!');
    });
  }

  broadcast(data) {
    this.logger.info('broadcasting...');
    this.wss.clients.forEach(function each(client) {
      if (client.readyState === OPEN) {
        client.send(data);
      }
    });
  }
}
