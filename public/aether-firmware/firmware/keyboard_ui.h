#ifndef AETHER_KEYBOARD_UI_H
#define AETHER_KEYBOARD_UI_H

/* Loads layout JSON from disk and draws keys + trackpad zone with LVGL.
 * Hooks every key's touch_down event to haptic_pulse() and usb_hid_send().
 */
void keyboard_ui_init(const char *layout_path);

/* Call when bridge.py writes a new current_layout.json — re-renders. */
void keyboard_ui_reload(void);

#endif
