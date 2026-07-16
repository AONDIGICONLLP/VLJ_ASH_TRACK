import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Portal, Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Gradients, Radius, Spacing } from "@/constants/theme";
import { AshCelebration } from "@/components/ash-celebration";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

type Particle = {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
};

function AshParticle({ particle }: { particle: Particle }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: particle.duration,
          useNativeDriver: true,
        }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, particle.delay, particle.duration]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-10, 170] });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, particle.drift, 0],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 0.8, 0.5, 0],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: `${particle.left}%`,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    />
  );
}

export function AshSuccessDialog({ visible, title, message, onClose }: Props) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [celebrate, setCelebrate] = useState(false);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 16 }, () => ({
        left: Math.random() * 100,
        size: 3 + Math.random() * 5,
        duration: 2600 + Math.random() * 2200,
        delay: Math.random() * 2000,
        drift: Math.random() * 24 - 12,
      })),
    []
  );

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.85);
    fade.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 14 }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setCelebrate(true);
    const timer = setTimeout(() => setCelebrate(false), 1400);
    return () => clearTimeout(timer);
  }, [visible, scale, fade]);

  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.overlay}>
        <AshCelebration active={celebrate} />
        <Animated.View style={[styles.card, { opacity: fade, transform: [{ scale }] }]}>
          <LinearGradient
            colors={Gradients.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.particlesLayer} pointerEvents="none">
              {particles.map((particle, index) => (
                <AshParticle key={index} particle={particle} />
              ))}
            </View>
            <View style={styles.tickCircle}>
              <MaterialCommunityIcons name="check-bold" size={34} color={Colors.secondary} />
            </View>
          </LinearGradient>

          <View style={styles.body}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <Pressable onPress={onClose} style={styles.button}>
              <LinearGradient
                colors={Gradients.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <MaterialCommunityIcons name="check" size={17} color={Colors.white} />
                <Text style={styles.buttonText}>Done</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    elevation: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
  },
  banner: {
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  particlesLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: "absolute",
    top: 0,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  tickCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  body: {
    padding: Spacing.lg,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  button: {
    width: "100%",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    borderRadius: Radius.md,
    paddingVertical: 14,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
