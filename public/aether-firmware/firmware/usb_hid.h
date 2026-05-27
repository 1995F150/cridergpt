#ifndef AETHER_USB_HID_H
#define AETHER_USB_HID_H

#include <stdint.h>

/* Presents the device as a composite HID keyboard + mouse to the host PC. */
void usb_hid_init(void);

/* Send a single keypress (down+up). keycode = USB HID usage ID. */
void usb_hid_send(uint8_t keycode, uint8_t modifiers);

/* Trackpad zone reports relative mouse motion. */
void usb_hid_mouse_move(int8_t dx, int8_t dy);
void usb_hid_mouse_click(uint8_t button);

#endif
