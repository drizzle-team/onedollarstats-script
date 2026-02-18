import { expect, test } from "vitest";
import { parseUtmParams } from "./parse-utm-params";

test("utm_source", () => {
  const urlParams = new URLSearchParams("?utm_source=source");

  expect(parseUtmParams(urlParams)).toEqual({
    utm_source: "source"
  });
});
test("utm_medium", () => {
  const urlParams = new URLSearchParams("?utm_medium=medium");

  expect(parseUtmParams(urlParams)).toEqual({
    utm_medium: "medium"
  });
});

test("utm_campaign", () => {
  const urlParams = new URLSearchParams("?utm_campaign=campaign");

  expect(parseUtmParams(urlParams)).toEqual({
    utm_campaign: "campaign"
  });
});

test("utm_term", () => {
  const urlParams = new URLSearchParams("?utm_term=term");

  expect(parseUtmParams(urlParams)).toEqual({
    utm_term: "term"
  });
});

test("utm_content", () => {
  const urlParams = new URLSearchParams("?utm_content=content");

  expect(parseUtmParams(urlParams)).toEqual({
    utm_content: "content"
  });
});

test("Full list of parameters", () => {
  const urlParams = new URLSearchParams("?utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_term=term&utm_content=content");

  expect(parseUtmParams(urlParams)).toEqual({
    utm_source: "source",
    utm_medium: "medium",
    utm_campaign: "campaign",
    utm_term: "term",
    utm_content: "content"
  });
});

test("Parameter duplicate", () => {
  const urlParams = new URLSearchParams("?utm_source=source&utm_source=source2");

  expect(parseUtmParams(urlParams)).toEqual({
    utm_source: "source"
  });
});

test("UTM trim test", () => {
  const urlParams = new URLSearchParams("?utm_source=&utm_source=source2");

  expect(parseUtmParams(urlParams)).toEqual({});
});

test("UTM trim test 2", () => {
  const urlParams = new URLSearchParams("?utm_source= source &utm_medium=    ");

  expect(parseUtmParams(urlParams)).toEqual({
    utm_source: "source"
  });
});

test("UTM trim test 3", () => {
  const urlParams = new URLSearchParams("?utm_source=%20source");

  expect(parseUtmParams(urlParams)).toEqual({
    utm_source: "source"
  });
});
