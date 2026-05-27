/*
 * AETHER firmware — LVGL skeleton.
 *
 * This is a scaffold only. Wire it up to your target board's LVGL port
 * (Raspberry Pi: lv_drivers fbdev + evdev; ESP32-S3: esp_lvgl_port).
 *
 * Boot order:
 *   1. lv_init + display/input driver init
 *   2. keyboard_ui_init() -> draws current layout from current_layout.json
 *   3. haptic_init()      -> DRV2605L over I2C
 *   4. usb_hid_init()     -> presents as composite HID keyboard+mouse
 *   5. main loop: lv_task_handler() every 5ms
 *
 * Layout file format (written by bridge.py):
 *   { "id": "...", "name": "...", "keys": [ { id, label, row, col, w, h } ] }
 */
#include "keyboard_ui.h"
#include "haptic.h"
#include "usb_hid.h"

/* extern from your board's port */
extern void board_lvgl_init(void);
extern void board_lvgl_tick(void);

int main(void) {
    board_lvgl_init();
    haptic_init();
    usb_hid_init();
    keyboard_ui_init("current_layout.json");

    for (;;) {
        board_lvgl_tick();
    }
    return 0;
}
