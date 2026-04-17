import { Alert, Platform } from "react-native";

/**
 * React Native Web does NOT implement Alert.alert (renders no-op + warning).
 * We monkey-patch it on web startup so every `Alert.alert(title, msg, buttons)`
 * call across the app (onboarding, paywall, report sheet, chat, etc.) shows a
 * real browser dialog with clickable options. Call once from the root layout.
 */
export function installWebAlertShim(): void {
  if (Platform.OS !== "web") {
    return;
  }
  if ((Alert as unknown as { __synoraShimmed?: boolean }).__synoraShimmed) {
    return;
  }

  const original = Alert.alert.bind(Alert);

  type ButtonLike = {
    text?: string;
    style?: string;
    onPress?: () => void | Promise<void>;
  };

  (Alert as unknown as { alert: typeof Alert.alert }).alert = (
    title?: string,
    message?: string,
    buttons?: ButtonLike[],
  ) => {
    const header = title?.trim() ? title.trim() : "Synora";
    const body = message?.trim() ? `${header}\n\n${message.trim()}` : header;

    // No buttons OR single OK-style button: use window.alert.
    if (!buttons || buttons.length === 0 || buttons.length === 1) {
      try {
        window.alert(body);
      } catch {
        /* ignore */
      }
      const single = buttons?.[0];
      if (single?.onPress) {
        void single.onPress();
      }
      return;
    }

    // Two buttons: destructive/cancel pattern -> use window.confirm
    if (buttons.length === 2) {
      const cancelBtn = buttons.find((b) => b.style === "cancel") ?? buttons[0];
      const actionBtn = buttons.find((b) => b !== cancelBtn) ?? buttons[1];
      let confirmed = false;
      try {
        confirmed = window.confirm(body);
      } catch {
        confirmed = false;
      }
      const chosen = confirmed ? actionBtn : cancelBtn;
      if (chosen?.onPress) {
        void chosen.onPress();
      }
      return;
    }

    // 3+ buttons: fall back to window.alert (best we can do without a modal lib)
    try {
      window.alert(body);
    } catch {
      /* ignore */
    }
    // Fire first non-cancel button by default
    const first = buttons.find((b) => b.style !== "cancel") ?? buttons[0];
    if (first?.onPress) {
      void first.onPress();
    }
    // prevent lint on unused var
    void original;
  };

  (Alert as unknown as { __synoraShimmed?: boolean }).__synoraShimmed = true;
}
