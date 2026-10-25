/**
 * Detects if the current web app is running inside a native webwrapper APK
 * (Android WebView, React Native WebView, Cordova/Capacitor, standalone PWA, etc.)
 * versus a standard mobile/desktop web browser.
 */
export const isWebWrapperApp = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Session or local storage flag previously set
  if (
    sessionStorage.getItem('is_app_wrapper') === 'true' ||
    localStorage.getItem('is_app_wrapper') === 'true'
  ) {
    return true;
  }

  // 2. URL params commonly passed by web wrappers
  const search = window.location.search.toLowerCase();
  if (
    search.includes('app=true') ||
    search.includes('app=1') ||
    search.includes('apk=true') ||
    search.includes('source=app') ||
    search.includes('source=apk') ||
    search.includes('isapp=true') ||
    search.includes('webview=true') ||
    search.includes('platform=android') ||
    search.includes('mode=app')
  ) {
    sessionStorage.setItem('is_app_wrapper', 'true');
    return true;
  }

  // 3. Injected Javascript bridges in webview wrappers
  const win = window as any;
  if (
    win.Android ||
    win.AndroidBridge ||
    win.ReactNativeWebView ||
    win.flutter_inappwebview ||
    win.JSBridge ||
    win.WebViewJavascriptBridge ||
    win.cordova ||
    win.Capacitor
  ) {
    sessionStorage.setItem('is_app_wrapper', 'true');
    return true;
  }

  // 4. Standalone / Fullscreen PWA mode
  if (
    (win.navigator && win.navigator.standalone) ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  ) {
    sessionStorage.setItem('is_app_wrapper', 'true');
    return true;
  }

  // 5. User-Agent detection for Android System WebView
  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  const isWebView =
    /\bwv\b/i.test(ua) || // Android WebView token "; wv)"
    (isAndroid && /Version\/[0-9.]+\s+Chrome/i.test(ua)) || // Chrome inside Android WebView
    /\b(WebView|AndroidWebview|InAppBrowser|Crosswalk)\b/i.test(ua);

  if (isWebView) {
    sessionStorage.setItem('is_app_wrapper', 'true');
    return true;
  }

  return false;
};
