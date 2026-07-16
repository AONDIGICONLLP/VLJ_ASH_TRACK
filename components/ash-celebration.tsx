import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View, useWindowDimensions } from "react-native";

type Props = {
  active: boolean;
};

type Spark = {
  startXPct: number;
  driftX: number;
  riseTo: number;
  size: number;
  delay: number;
  duration: number;
  warm: boolean;
};

function SparkParticle({ spark, height }: { spark: Spark; height: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: spark.duration,
      delay: spark.delay,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(height * spark.riseTo)],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, spark.driftX * 0.6, spark.driftX],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.7, 1],
    outputRange: [0, 1, 0.7, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0.4, 1, 0.5],
  });

  return (
    <Animated.View
      style={[
        styles.spark,
        {
          left: `${spark.startXPct}%`,
          width: spark.size,
          height: spark.size,
          borderRadius: spark.size / 2,
          backgroundColor: spark.warm ? "rgba(255,158,66,0.95)" : "rgba(255,255,255,0.95)",
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    />
  );
}

export function AshCelebration({ active }: Props) {
  const { height } = useWindowDimensions();

  const sparks = useMemo<Spark[]>(
    () =>
      Array.from({ length: 46 }, () => ({
        startXPct: 10 + Math.random() * 80,
        driftX: Math.random() * 90 - 45,
        riseTo: 0.35 + Math.random() * 0.45,
        size: 3 + Math.random() * 6,
        delay: Math.random() * 350,
        duration: 900 + Math.random() * 700,
        warm: Math.random() < 0.35,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active]
  );

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {sparks.map((spark, index) => (
        <SparkParticle key={index} spark={spark} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  spark: {
    position: "absolute",
    bottom: 0,
  },
});
