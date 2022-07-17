export interface CalProperty {
  name: string; // upper-case
  value: string;
  parameters?: Record<string, string>; // upper-case keys
}

export function parseProperty(line: string): CalProperty {
  const match = /^([A-Z]+)(?:;(.*))?:(.*)$/i.exec(line);
  if (!match) {
    throw new Error(`Invalid recurrence property syntax: ${line}`);
  }
  const [, name, params, value] = match;
  const result: CalProperty = { name: name.toUpperCase(), value };
  if (params) {
    result.parameters = {};
    for (const param of params.split(';')) {
      const match = /([A-Z]+)=(.*)/i.exec(param);
      if (!match) {
        throw new Error(`Invalid recurrence property parameter syntax: ${line}`);
      }
      const [, paramKey, paramValue] = match;
      result.parameters[paramKey.toUpperCase()] = paramValue;
    }
  }
  return result;
}

export function validatePropertyParameters(prop: CalProperty, allowed?: string[]): (string | undefined)[] {
  const values = [];
  if (prop.parameters) {
    for (const [key, value] of Object.entries(prop.parameters)) {
      let index: number;
      if (!allowed || (index = allowed.indexOf(key)) < 0) {
        throw new Error(`Unexpected parameter ${key} for property ${prop.name}`);
      }
      values[index] = value;
    }
  }
  return values;
}
