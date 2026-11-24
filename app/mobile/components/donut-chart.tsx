import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Colors } from "@/constants/colors";

export type DonutSegment = { value: number; color: string };

export function DonutChart({
  data,
  size = 130,
  strokeWidth = 16,
  centerLabel,
  centerSubLabel,
}: {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel: string;
  centerSubLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Small gap between segments when there is more than one.
  const gap = data.length > 1 ? 2 : 0;
  let offset = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.surfaceHighlight}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {total > 0 &&
          data.map((segment, i) => {
            const length = (segment.value / total) * circumference;
            const visible = Math.max(length - gap, 0.5);
            const circle = (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${visible} ${circumference - visible}`}
                strokeDashoffset={-offset}
                rotation={-90}
                origin={`${size / 2}, ${size / 2}`}
              />
            );
            offset += length;
            return circle;
          })}
      </Svg>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: strokeWidth + 4,
        }}
      >
        <Text
          className="text-[15px] font-extrabold text-appText"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {centerLabel}
        </Text>
        {centerSubLabel && (
          <Text className="text-[10px] text-appText-muted">
            {centerSubLabel}
          </Text>
        )}
      </View>
    </View>
  );
}
