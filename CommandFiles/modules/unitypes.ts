export type SplitDotRecursive<S extends string> =
  S extends `${infer Head}.${infer Tail}`
    ? [Head, ...SplitDotRecursive<Tail>, ...string[]]
    : [S, ...string[]];

export type SplitPipeRecursive<S extends string> =
  S extends `${infer Head}|${infer Tail}`
    ? [Head, ...SplitPipeRecursive<Tail>, ...string[]]
    : [S, ...string[]];

export type SplitRecursive<
  Sep extends string,
  Str extends string
> = Str extends `${infer Head}${Sep}${infer Tail}`
  ? [Head, ...SplitRecursive<Sep, Tail>, ...string[]]
  : [Str, ...string[]];

export function splitDot<S extends string>(str: S): SplitDotRecursive<S> {
  return str.split(".") as SplitDotRecursive<S>;
}

export function splitPipe<S extends string>(str: S): SplitPipeRecursive<S> {
  return str.split("|") as SplitPipeRecursive<S>;
}

export function splitStr<Sep extends string, Str extends string>(
  separator: Sep,
  str: Str
): SplitRecursive<Sep, Str> {
  return str.split(separator) as SplitRecursive<Sep, Str>;
}

const result = splitStr(".", process.version);
