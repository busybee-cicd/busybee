import test from 'ava';
import {deserialize} from 'json-typescript-mapper';
import * as fs from 'fs';
import * as path from 'path';
import { BusybeeUserConfig, BusybeeParsedConfig } from '../../src/config';

let userConfig = deserialize(BusybeeUserConfig, JSON.parse(fs.readFileSync(path.join(process.cwd(), 'test/config/config.json'), 'utf8')));
let testFilesDir = path.join(process.cwd(), 'test/config/busybeeTests');

test(async (t) => {
    t.is(userConfig.constructor.name, 'BusybeeUserConfig');

    let cmdOpts = {
        directory: testFilesDir
    }
    let parsedConfig = new BusybeeParsedConfig(userConfig, cmdOpts, 'test');

    console.log(JSON.stringify(parsedConfig.getEnv2TestSuiteMap(), null, '\t'));
    console.log(JSON.stringify(parsedConfig.getTestSet2EnvMap(), null, '\t'));
});