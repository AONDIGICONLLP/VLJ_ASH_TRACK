import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View, useWindowDimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type DustSpec = {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
  warm: boolean;
};

type Bubble = {
  top: number;
  left?: number;
  right?: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  size: number;
};

const BUBBLES: Bubble[] = [
  { top: 70, left: 18, icon: "truck-outline", size: 30 },
  { top: 130, right: 22, icon: "map-marker-radius-outline", size: 26 },
  { top: 260, left: 26, icon: "radar", size: 24 },
  { top: 330, right: 34, icon: "barcode-scan", size: 22 },
  { top: 440, left: 14, icon: "factory", size: 28 },
  { top: 500, right: 16, icon: "satellite-variant", size: 24 },
];

function AshDust({ spec, height }: { spec: DustSpec; height: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delay),
        Animated.timing(progress, { toValue: 1, duration: spec.duration, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, spec.delay, spec.duration]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, height + 20],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, spec.drift, 0],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.92, 1],
    outputRange: [0, spec.opacity, spec.opacity, 0],
  });

  return (
    <Animated.View
      style={[
        styles.dust,
        {
          left: `${spec.left}%`,
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          opacity,
          backgroundColor: spec.warm ? "rgba(255,158,66,0.9)" : "rgba(255,255,255,0.9)",
          transform: [{ translateY }, { translateX }],
        },
      ]}
    />
  );
}

type Props = {
  intense?: boolean;
};

export function AshBackground({ intense = false }: Props = {}) {
  const { height } = useWindowDimensions();

  const dust = useMemo<DustSpec[]>(
    () =>
      Array.from({ length: intense ? 48 : 28 }, () => ({
        left: Math.random() * 100,
        size: intense ? 3 + Math.random() * 7 : 2 + Math.random() * 4,
        duration: intense ? 3800 + Math.random() * 5000 : 6000 + Math.random() * 7000,
        delay: Math.random() * (intense ? 3500 : 6000),
        drift: Math.random() * (intense ? 46 : 30) - (intense ? 23 : 15),
        opacity: intense ? 0.32 + Math.random() * 0.45 : 0.2 + Math.random() * 0.35,
        warm: intense && Math.random() < 0.3,
      })),
    [intense]
  );

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      <View style={[styles.orb, styles.orb3]} />

      {BUBBLES.map((bubble, index) => (
        <View
          key={index}
          style={[
            styles.bubble,
            {
              top: bubble.top,
              left: bubble.left,
              right: bubble.right,
              width: bubble.size * 1.8,
              height: bubble.size * 1.8,
              borderRadius: bubble.size * 0.9,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={bubble.icon}
            size={bubble.size * 0.6}
            color="rgba(255,255,255,0.4)"
          />
        </View>
      ))}

      {dust.map((spec, index) => (
        <AshDust key={index} spec={spec} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orb1: {
    top: -100,
    left: -80,
    width: 300,
    height: 300,
    backgroundColor: "rgba(113,179,47,0.08)",
  },
  orb2: {
    top: 220,
    right: -100,
    width: 260,
    height: 260,
    backgroundColor: "rgba(0,82,152,0.1)",
  },
  orb3: {
    bottom: 40,
    left: -60,
    width: 220,
    height: 220,
    backgroundColor: "rgba(113,179,47,0.07)",
  },
  bubble: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  dust: {
    position: "absolute",
    top: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
});
