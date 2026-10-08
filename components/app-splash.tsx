import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as SplashScreen from "expo-splash-screen";
import { Colors, Gradients, Radius, Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";

// One ash-dust particle puffed out when the truck arrives — a static
// horizontal offset (spread) plus a driving 0→1 progress value that's
// interpolated into scale/opacity/drift, so each particle only needs one
// Animated.Value instead of three.
const PARTICLES = [
  { x: -26, drift: -30, color: "#E7ECF2" },
  { x: -12, drift: -40, color: "#C9D1DC" },
  { x: 2, drift: -46, color: "#FFC247" },
  { x: 16, drift: -38, color: "#BCC5D1" },
  { x: 28, drift: -28, color: "#E7ECF2" },
] as const;

// Covers the native splash's brand-colored background with this JS screen
// as soon as the app mounts, then fades into the real app once auth state
// has resolved AND the intro animation has had time to play — no gap, no
// flash of a mismatched placeholder image, and no cutting the intro short.
export function AppSplashGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const [visible, setVisible] = useState(true);
  const [introDone, setIntroDone] = useState(false);
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const truckX = useRef(new Animated.Value(-160)).current;
  const truckSquash = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(0.5)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const groundOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkY = useRef(new Animated.Value(14)).current;
  const underlineScale = useRef(new Animated.Value(0)).current;
  const particleProgress = useRef(PARTICLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // The one-time entrance sequence: drive in, arrive with a puff of ash,
  // then the wordmark writes in underneath.
  useEffect(() => {
    Animated.sequence([
      Animated.timing(truckX, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(truckSquash, {
            toValue: 0.88,
            duration: 90,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(truckSquash, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(badgeScale, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(groundOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.stagger(
          45,
          particleProgress.map((value) =>
            Animated.timing(value, {
              toValue: 1,
              duration: 620,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            })
          )
        ),
      ]),
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkY, {
          toValue: 0,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(underlineScale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setIntroDone(true));
  }, [
    badgeOpacity,
    badgeScale,
    groundOpacity,
    particleProgress,
    truckSquash,
    truckX,
    underlineScale,
    wordmarkOpacity,
    wordmarkY,
  ]);

  useEffect(() => {
    if (loading || !introDone) return;
    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [loading, introDone, screenOpacity]);

  return (
    <View style={styles.fill}>
      {children}
      {visible && (
        <Animated.View style={[styles.overlay, { opacity: screenOpacity }]} pointerEvents="none">
          <LinearGradient
            colors={Gradients.splash}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.stage}>
            {PARTICLES.map((particle, index) => {
              const progress = particleProgress[index];
              return (
                <Animated.View
                  key={index}
                  pointerEvents="none"
                  style={[
                    styles.particle,
                    {
                      backgroundColor: particle.color,
                      transform: [
                        { translateX: particle.x },
                        {
                          translateY: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, particle.drift],
                          }),
                        },
                        {
                          scale: progress.interpolate({
                            inputRange: [0, 0.3, 1],
                            outputRange: [0, 1, 0.55],
                          }),
                        },
                      ],
                      opacity: progress.interpolate({
                        inputRange: [0, 0.15, 0.7, 1],
                        outputRange: [0, 1, 1, 0],
                      }),
                    },
                  ]}
                />
              );
            })}

            <Animated.View
              style={[styles.ground, { opacity: groundOpacity, transform: [{ translateX: truckX }] }]}
            />

            <Animated.View
              style={[
                styles.badge,
                {
                  opacity: badgeOpacity,
                  transform: [{ translateX: truckX }, { scale: badgeScale }],
                },
              ]}
            >
              <Animated.View style={{ transform: [{ scaleY: truckSquash }] }}>
                <MaterialCommunityIcons name="truck-fast-outline" size={40} color={Colors.white} />
              </Animated.View>
            </Animated.View>
          </View>

          <Animated.Text
            style={[styles.wordmark, { opacity: wordmarkOpacity, transform: [{ translateY: wordmarkY }] }]}
          >
            ASH TRACK
          </Animated.Text>
          <Animated.View style={[styles.underline, { transform: [{ scaleX: underlineScale }] }]} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  stage: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  particle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    top: 30,
    left: "50%",
    marginLeft: -5,
  },
  ground: {
    position: "absolute",
    bottom: -4,
    left: "50%",
    marginLeft: -30,
    width: 60,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    fontSize: 27,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: 3,
  },
  underline: {
    width: 44,
    height: 3,
    borderRadius: Radius.pill,
    backgroundColor: "#FFC247",
    marginTop: Spacing.sm,
  },
});
