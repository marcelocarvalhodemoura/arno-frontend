const IDENTIFY_FLAG = "arno.identify";

export function readIdentifyFlag() {
  try {
    return sessionStorage.getItem(IDENTIFY_FLAG) === "1";
  } catch {
    return false;
  }
}

export function writeIdentifyFlag() {
  try {
    sessionStorage.setItem(IDENTIFY_FLAG, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearIdentifyFlag() {
  try {
    sessionStorage.removeItem(IDENTIFY_FLAG);
  } catch {
    /* ignore */
  }
}
