#ifndef AETHER_HAPTIC_H
#define AETHER_HAPTIC_H

#include <stdint.h>

/* DRV2605L over I2C. strength 0-100. */
void haptic_init(void);
void haptic_pulse(uint8_t strength);
void haptic_set_enabled(int enabled);

#endif
