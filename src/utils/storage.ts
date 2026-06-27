export function setCookie(name: string, value: string, days = 365) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = "; expires=" + date.toUTCString();
  // Safe default SameSite policy for standard browsers
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

export function saveState(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("localStorage not available, writing to cookie instead");
  }
  setCookie(key, value);
}

export function loadState(key: string): string | null {
  let val = null;
  try {
    val = localStorage.getItem(key);
  } catch (e) {}
  if (!val) {
    val = getCookie(key);
  }
  return val;
}
