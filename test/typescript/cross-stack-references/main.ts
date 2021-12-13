import { Construct } from "constructs";
import { App, Fn, TerraformStack, Testing } from "cdktf";
import {
  RandomProvider,
  Integer,
  Password,
  Shuffle,
} from "./.gen/providers/random";
import { LocalProvider, File } from "./.gen/providers/local";

function writeToFile(scope: Construct, name: string, value: any) {
  const filename = `../../../${name}`;
  if (Array.isArray(value)) {
    new File(scope, name, {
      filename,
      content: JSON.stringify(value, null, 2),
    });
  } else {
    new File(scope, name, {
      filename,
      content: value,
    });
  }
}

export class SourceStack extends TerraformStack {
  public num: number;
  public str: string;
  public list: string[];

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new RandomProvider(this, "random");
    new LocalProvider(this, "local");

    const int = new Integer(this, "int", {
      min: 0,
      max: 6,
    });

    this.num = int.result;

    const str = new Password(this, "str", {
      length: 32,
    });
    this.str = str.result;

    const list = new Shuffle(this, "list", {
      input: ["a", "b", "c", "d", "e", "f"],
    });
    this.list = list.result;

    writeToFile(this, "originNum", this.num);
    writeToFile(this, "originStr", this.str);
    writeToFile(this, "originList", this.list);
  }
}

export class ConsumerStack extends TerraformStack {
  public num?: number;
  public str?: string;
  public list?: string[];

  constructor(
    scope: Construct,
    id: string,
    inputs: { num?: number; str?: string; list?: string[] }
  ) {
    super(scope, id);

    new RandomProvider(this, "random");
    new LocalProvider(this, "local");

    if (inputs.num) {
      writeToFile(this, `${id}Num`, inputs.num);
      this.num = inputs.num;
    }

    if (inputs.str) {
      writeToFile(this, `${id}Str`, inputs.str);
      this.str = inputs.str;
    }

    if (inputs.list) {
      writeToFile(this, `${id}List`, inputs.list);
      this.list = inputs.list;
    }
  }
}

const app = Testing.stubVersion(new App({ stackTraces: false }));
const src = new SourceStack(app, "source");
const passthrough = new ConsumerStack(app, "passthrough", {
  num: src.num,
  str: src.str,
  list: src.list,
});

new ConsumerStack(app, "sink", {
  num: passthrough.num,
  str: passthrough.str,
});

const fns = new ConsumerStack(app, "fns", {
  // From one stack
  num: Fn.sum([src.num, src.num]),
  // From two stacks
  str: Fn.join(",", [src.str, passthrough.str!]),
});

new ConsumerStack(app, "functionOutput", {
  // From function output
  num: fns.num!,
});

app.synth();
