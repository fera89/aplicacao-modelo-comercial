import React from 'react';
import { View, StyleSheet, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/Theme';

export const ScreenWrapper = ({ children, style, edges, disableKeyboardAvoid = false }) => {
    return (
        <SafeAreaView style={[styles.container, style]} edges={edges}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                enabled={!disableKeyboardAvoid}
            >
                {children}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        padding: theme.spacing.m,
    },
});
