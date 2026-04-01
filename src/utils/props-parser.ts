export const parseProps = (propsString: string): Record<string, string> | undefined => {
  if (!propsString) return undefined;
  // "key1=value1;key2=value2"

  const splittedProps = propsString.split(";");
  const propsObj: Record<string, string> = {};

  for (const keyValueString of splittedProps) {
    const keyValuePair = keyValueString.split("=").map((el) => el.trim());
    if (keyValuePair.length !== 2 || keyValuePair[0] === "" || keyValuePair[1] === "") continue;
    // @ts-ignore
    propsObj[keyValuePair[0]] = keyValuePair[1];
  }

  return Object.keys(propsObj).length === 0 ? undefined : propsObj;
};
