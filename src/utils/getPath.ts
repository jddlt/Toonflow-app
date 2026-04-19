import path from "path";
import isPathInside from "is-path-inside";

function getBasePath() {
  if (typeof process.versions?.electron !== "undefined") {
    const { app } = require("electron");
    if (app.isPackaged) {
      const userDataDir: string = app.getPath("userData");
      return path.join(userDataDir, "data");
    }
  }
  return path.join(process.cwd(), "data");
}

export default (fileName?: string[] | string) => {
  const basePath = getBasePath();
  if (fileName) {
    let dbPath: string;
    if (Array.isArray(fileName)) {
      dbPath = path.resolve(basePath, ...fileName);
    } else {
      dbPath = path.resolve(basePath, fileName);
    }
    if (!isPathInside(dbPath, basePath) && dbPath !== basePath) {
      throw new Error("路径逃逸错误，路径必须在数据目录内");
    }
    return dbPath;
  }
  return basePath;
};

export function isEletron() {
  return typeof process.versions?.electron !== "undefined";
}
