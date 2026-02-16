import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, Animated, Easing } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Line, Defs, ClipPath, Image as SvgImage, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Animated SVG Components
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedG = Animated.createAnimatedComponent(G);

const MOCK_AVATARS = [
    'https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-person-with-pink-hair_23-2149436186.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-business-man-with-glasses_23-2149436194.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-person-with-long-hair_23-2149436197.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-person-with-glasses_23-2149436190.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-business-woman-with-glasses_23-2149436193.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-teenager-with-funny-face-glasses_23-2149436185.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-bald-person_23-2149436183.jpg'
];

export const NetworkingScreen = ({ navigation }) => {
    const { user } = useApp();
    const [nodes, setNodes] = useState([]);

    // Animation Values
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const dashAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        generateHive();
        startAnimations();
    }, []);

    const startAnimations = () => {
        // Dashed Line Flow
        Animated.loop(
            Animated.timing(dashAnim, {
                toValue: -20, // Move dash pattern
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: false, // SVG props often need JS driver
            })
        ).start();
    };

    const generateHive = () => {
        const newNodes = [];
        const TOTAL_NODES = 25;

        // Ring Configuration
        const RING_CONFIG = [
            { count: 10, radius: 110 },
            { count: 15, radius: 200 }, // +5 capacity implied by larger circumference
        ];

        let currentNodeIndex = 0;

        RING_CONFIG.forEach((ring, ringIndex) => {
            const angleStep = (2 * Math.PI) / ring.count;

            for (let i = 0; i < ring.count; i++) {
                if (currentNodeIndex >= TOTAL_NODES) break;

                const angle = i * angleStep;
                // Add some randomness to position
                const randomOffset = (Math.random() - 0.5) * 20;
                const x = width / 2 + (ring.radius + randomOffset) * Math.cos(angle);
                const y = 200 + (ring.radius + randomOffset) * Math.sin(angle); // Center Y at 200

                newNodes.push({
                    id: `node-${ringIndex}-${i}`,
                    x,
                    y,
                    r: 20, // Avatar radius
                    avatar: MOCK_AVATARS[Math.floor(Math.random() * MOCK_AVATARS.length)],
                    color: i % 2 === 0 ? theme.colors.primary : theme.colors.secondary,
                });
                currentNodeIndex++;
            }
        });

        setNodes(newNodes);
    };

    const centralNode = {
        x: width / 2,
        y: 200,
        r: 35,
        avatar: user?.photoURL || MOCK_AVATARS[0]
    };

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Typography variant="h2">Sua Rede</Typography>
                    <Typography variant="body" style={styles.subtitle}>25 Conexões Ativas</Typography>
                </View>

                {/* THE HIVE */}
                <View style={styles.hiveContainer}>
                    <Svg height="400" width={width} viewBox={`0 0 ${width} 400`}>
                        <Defs>
                            <ClipPath id="clip">
                                <Circle cx={centralNode.x} cy={centralNode.y} r={centralNode.r} />
                            </ClipPath>
                            {nodes.map((node, i) => (
                                <ClipPath key={`clip-${i}`} id={`clip-${i}`}>
                                    <Circle cx={node.x} cy={node.y} r={node.r} />
                                </ClipPath>
                            ))}
                        </Defs>

                        {/* Connection Lines with Animation */}
                        {nodes.map((node, index) => (
                            <AnimatedLine
                                key={`line-${index}`}
                                x1={centralNode.x}
                                y1={centralNode.y}
                                x2={node.x}
                                y2={node.y}
                                stroke={theme.colors.primary}
                                strokeWidth="1"
                                strokeDasharray="5, 5"
                                strokeDashoffset={dashAnim}
                                strokeOpacity={0.3}
                            />
                        ))}

                        {/* Central Node Pulse (Ring) */}
                        <AnimatedCircle
                            cx={centralNode.x}
                            cy={centralNode.y}
                            r={centralNode.r + 10}
                            fill="none"
                            stroke={theme.colors.primary}
                            strokeWidth="2"
                            opacity={0.2}
                            transform={[
                                { scale: pulseAnim }
                            ]}
                        />
                        <AnimatedCircle
                            cx={centralNode.x}
                            cy={centralNode.y}
                            r={centralNode.r + 25}
                            fill="none"
                            stroke={theme.colors.primary}
                            strokeWidth="1"
                            opacity={0.1}
                            transform={[
                                { scale: pulseAnim }
                            ]}
                        />

                        {/* Satellite Nodes Pulse */}
                        {nodes.map((node, index) => (
                            <AnimatedCircle
                                key={`pulse-${index}`}
                                cx={node.x}
                                cy={node.y}
                                r={node.r + 5}
                                fill={theme.colors.secondary}
                                opacity={0.2}
                                transform={[
                                    { scale: pulseAnim }
                                ]}
                            />
                        ))}

                        {/* Nodes Images */}
                        {/* Central User */}
                        <SvgImage
                            x={centralNode.x - centralNode.r}
                            y={centralNode.y - centralNode.r}
                            width={centralNode.r * 2}
                            height={centralNode.r * 2}
                            href={{ uri: centralNode.avatar }}
                            clipPath="url(#clip)"
                        />
                        <Circle
                            cx={centralNode.x}
                            cy={centralNode.y}
                            r={centralNode.r}
                            fill="none"
                            stroke={theme.colors.primary}
                            strokeWidth="3"
                        />

                        {/* Satellites */}
                        {nodes.map((node, index) => (
                            <G key={`node-g-${index}`}>
                                <SvgImage
                                    x={node.x - node.r}
                                    y={node.y - node.r}
                                    width={node.r * 2}
                                    height={node.r * 2}
                                    href={{ uri: node.avatar }}
                                    clipPath={`url(#clip-${index})`}
                                />
                                <Circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={node.r}
                                    fill="none"
                                    stroke="#FFF"
                                    strokeWidth="2"
                                />
                            </G>
                        ))}
                    </Svg>

                    <TouchableOpacity style={styles.scanButton} onPress={() => { }}>
                        <Ionicons name="qr-code-outline" size={24} color="#FFF" />
                        <Typography variant="body" style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 8 }}>
                            Escanear
                        </Typography>
                    </TouchableOpacity>
                </View>

                {/* List of Connections Placeholder */}
                <View style={styles.section}>
                    <Typography variant="h3">Conexões Recentes</Typography>
                    {nodes.slice(0, 5).map((node, i) => (
                        <View key={i} style={styles.connectionItem}>
                            <Image source={{ uri: node.avatar }} style={styles.connectionAvatar} />
                            <View style={styles.connectionInfo}>
                                <Typography variant="body" style={styles.connectionName}>Participante {i + 1}</Typography>
                                <Typography variant="caption" style={styles.connectionRole}>Developer</Typography>
                            </View>
                            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
                        </View>
                    ))}
                </View>

            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scroll: {
        paddingBottom: theme.spacing.xl,
    },
    header: {
        marginBottom: theme.spacing.m,
        alignItems: 'center',
    },
    subtitle: {
        color: theme.colors.textSecondary,
    },
    hiveContainer: {
        height: 400,
        backgroundColor: '#f8f9fa', // Lighter background for better contrast
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.l,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    scanButton: {
        position: 'absolute',
        bottom: 20,
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    section: {
        paddingHorizontal: theme.spacing.m,
    },
    connectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    connectionAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    connectionInfo: {
        flex: 1,
    },
    connectionName: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    connectionRole: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    }
});
