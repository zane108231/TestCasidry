import * as fs from "fs-extra";

export namespace Files {
  export async function read(
    path: string,
    encoding: BufferEncoding = "utf8"
  ): Promise<string> {
    try {
      return await fs.readFile(path, encoding);
    } catch (err) {
      throw new Error(`Read failed: ${err.message}`);
    }
  }

  export async function write(
    path: string,
    data: string,
    encoding: BufferEncoding = "utf8"
  ): Promise<void> {
    try {
      await fs.writeFile(path, data, { encoding });
    } catch (err) {
      throw new Error(`Write failed: ${err.message}`);
    }
  }

  export async function json<T>(path: string): Promise<T> {
    try {
      return await fs.readJson(path);
    } catch (err) {
      throw new Error(`JSON read failed: ${err.message}`);
    }
  }

  export async function writeJson<T>(
    path: string,
    data: T,
    spaces: number = 2
  ): Promise<void> {
    try {
      await fs.writeJson(path, data, { spaces });
    } catch (err) {
      throw new Error(`JSON write failed: ${err.message}`);
    }
  }
}
