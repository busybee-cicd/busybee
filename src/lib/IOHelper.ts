export class IOHelper {
  constructor() {}

  static parseDataBuffer(dataBuffer: string | Buffer) {
    let dataStr = dataBuffer.toString();
    dataStr = IOHelper.trimChars(dataStr, '\n');

    return dataStr.split('\n');
  }

  static trimChars(s, c): string {
    if (c === "]") c = "\\]";
    if (c === "\\") c = "\\\\";
    return s.replace(new RegExp(
      "^[" + c + "]+|[" + c + "]+$", "g"
    ), "");
  }
}
