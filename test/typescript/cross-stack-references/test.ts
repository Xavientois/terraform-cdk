import * as fs from "fs-extra";
import * as path from "path";
import { TestDriver } from "../../test-helper";

describe("cross stack references", () => {
  let driver: TestDriver;

  function readLocalFile(fileName: string): string {
    return fs.readFileSync(
      path.join(driver.workingDirectory, fileName),
      "utf8"
    );
  }

  beforeAll(async () => {
    driver = new TestDriver(__dirname);
    await driver.setupTypescriptProject();
    console.log(driver.workingDirectory);
    await driver.synth();
  });

  test("synth generates JSON", () => {
    expect(driver.manifest()).toMatchSnapshot();
  });

  describe("deployed", () => {
    beforeAll(async () => {
      await driver.deploy("source");
      await driver.deploy("passthrough");
      await driver.deploy("sink");
      await driver.deploy("fns");
      await driver.deploy("functionOutput");
    });

    it("references primitive values", () => {
      expect(readLocalFile("originNum")).toBe(readLocalFile("passthroughNum"));
      expect(readLocalFile("originStr")).toBe(readLocalFile("passthroughStr"));
    });

    it("references can be passed through stacks", () => {
      expect(readLocalFile("originNum")).toBe(readLocalFile("sinkNum"));
      expect(readLocalFile("originStr")).toBe(readLocalFile("sinkStr"));
    });

    it("can use reference in terraform function", () => {
      // num: Fn.sum([src.num, src.num]),
      const originNum = parseInt(readLocalFile("originNum"), 10);
      const result = parseInt(readLocalFile("fnsNum"), 10);

      expect(originNum * 2).toBe(result);
    });

    it("can use references from two stacks", () => {
      // str: Fn.join(",", [src.str, passthrough.str]),
      const originStr = readLocalFile("originStr");
      const passthroughStr = readLocalFile("passthroughStr");

      const result = readLocalFile("fnsStr");
      expect(`${originStr},${passthroughStr}`).toBe(result);
    });

    it("references terraform function output", () => {
      const originNum = parseInt(readLocalFile("originNum"), 10);
      const result = parseInt(readLocalFile("functionOutputNum"), 10);

      expect(originNum * 2).toBe(result);
    });

    it("references complex values", () => {
      expect(readLocalFile("originList")).toBe(
        readLocalFile("passthroughList")
      );
    });

    it.todo("references nested values");
  });
});
