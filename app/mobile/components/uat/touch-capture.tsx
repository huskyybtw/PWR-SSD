import React from "react";
import { GestureResponderEvent, View, ViewProps } from "react-native";

import * as uat from "@/shared/uat/recorder";

/**
 * Passive touch logger for UAT sessions. Touch events bubble up to this view,
 * so every tap inside it is seen without blocking or changing any handler.
 * In release builds it is a plain View.
 */
export function TouchCapture({ children, style, ...rest }: ViewProps) {
  if (!__DEV__) {
    return (
      <View style={style} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <View
      style={style}
      {...rest}
      onTouchStart={(e: GestureResponderEvent) =>
        uat.onTouchStart(e.nativeEvent.pageX, e.nativeEvent.pageY)
      }
      onTouchEnd={(e: GestureResponderEvent) =>
        uat.onTouchEnd(e.nativeEvent.pageX, e.nativeEvent.pageY)
      }
    >
      {children}
    </View>
  );
}
