export const extractNumbersFromString = (str: string) => {
  const numberRegex = /[-+]?\d+(\.\d+)?/g;
  return str.match(numberRegex)?.map(Number) || [];
};
