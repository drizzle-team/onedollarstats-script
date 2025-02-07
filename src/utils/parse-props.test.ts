import { expect, test } from "vitest";
import { parseProps } from "./props-parser";

// Semicolon symbol errors
test("Semicolon case-1: 'key1=value1'", () => {
  expect(parseProps("key1=value1")).toEqual({
    key1: "value1",
  });
});

test("Semicolon case-2: 'key1;=value1'", () => {
  expect(parseProps("key1;=value1")).toEqual(undefined);
});

test("Semicolon case-3: 'key1=value1;'", () => {
  expect(parseProps("key1=value1;")).toEqual({
    key1: "value1",
  });
});

test("Semicolon case-4: 'key1=value1;;'", () => {
  expect(parseProps("key1=value1;;")).toEqual({
    key1: "value1",
  });
});

// Equal symbol errors
test("Equal symbol case-1: 'key1==value1'", () => {
  expect(parseProps("key1==value1")).toEqual(undefined);
});

test("Equal symbol case-2: 'key1=value=1'", () => {
  expect(parseProps("key1=value=1")).toEqual(undefined);
});
test("Equal symbol case-3: 'key1=value1='", () => {
  expect(parseProps("key1=value1=")).toEqual(undefined);
});
test("Equal symbol case-4: 'key1=value1;key2=value=2'", () => {
  expect(parseProps("key1=value1;key2=value=2")).toEqual({
    key1: "value1",
  });
});

// Spaces
test("Spaces case-1: 'key1 = value1 '", () => {
  expect(parseProps(" key1 = value1 ")).toEqual({
    key1: "value1",
  });
});
test("Spaces case-2: 'key1=value1;  key2 = value2 '", () => {
  expect(parseProps("key1=value1;  key2 = value2 ")).toEqual({
    key1: "value1",
    key2: "value2",
  });
});
test("Spaces case-3: ' key1 = value1 ;  key2 = value2 '", () => {
  expect(parseProps(" key1 = value1 ;  key2 = value2 ")).toEqual({
    key1: "value1",
    key2: "value2",
  });
});

// Combined
// "key1 ;=value1"
// " key1 = value1 ;"
// " key1 = value1 ;  key2 = value2 ;"
// " key1 = value1 ;  key2 == value2 ;"
// "  =value1"
// "  =value1;"
// "key1=  "
// "key1=value1;key1=value2"
test("Combined case-1: 'key1 ;=value1'", () => {
  expect(parseProps("key1 ;=value1")).toEqual(undefined);
});
test("Combined case-2: ' key1 = value1 ;'", () => {
  expect(parseProps(" key1 = value1 ;")).toEqual({
    key1: "value1",
  });
});
test("Combined case-3: ' key1 = value1 ;  key2 = value2 ;'", () => {
  expect(parseProps(" key1 = value1 ;  key2 = value2 ;")).toEqual({
    key1: "value1",
    key2: "value2",
  });
});

test("Combined case-4: 'key1 = value1 ;  key2 == value2 ;'", () => {
  expect(parseProps("key1 = value1 ;  key2 == value2 ;")).toEqual({
    key1: "value1",
  });
});

test("Combined case-5: '  =value1'", () => {
  expect(parseProps("  =value1")).toEqual(undefined);
});

test("Combined case-6: '  =value1;'", () => {
  expect(parseProps("  =value1;")).toEqual(undefined);
});

test("Combined case-7: 'key1=  '", () => {
  expect(parseProps("key1=  ")).toEqual(undefined);
});

test("Combined case-8: 'key1=value1;key1=value2'", () => {
  expect(parseProps("key1=value1;key1=value2")).toEqual({
    key1: "value2",
  });
});
