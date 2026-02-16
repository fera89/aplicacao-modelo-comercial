import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Typography } from './Typography';
import { theme } from '../theme/Theme';

export const Button = ({ title, onPress, variant = 'primary', loading = false, style }) => {
    const isPrimary = variant === 'primary';
    const containerStyle = isPrimary ? styles.primaryContainer : styles.secondaryContainer;
    const textStyle = isPrimary ? styles.primaryText : styles.secondaryText;

    return (
        <TouchableOpacity
            style={[styles.container, containerStyle, style]}
            onPress={onPress}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator color={isPrimary ? '#FFF' : theme.colors.primary} />
            ) : (
                <Typography variant="body" style={[styles.text, textStyle]}>
                    {title}
                </Typography>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: theme.spacing.m,
        paddingHorizontal: theme.spacing.l,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    primaryContainer: {
        backgroundColor: theme.colors.primary,
    },
    secondaryContainer: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    text: {
        fontWeight: 'bold',
    },
    primaryText: {
        color: '#FFF',
    },
    secondaryText: {
        color: theme.colors.primary,
    },
});
