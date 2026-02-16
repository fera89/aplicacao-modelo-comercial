import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../theme/Theme';

export const Typography = ({ variant = 'body', children, style, ...props }) => {
    return (
        <Text style={[styles[variant], style]} {...props}>
            {children}
        </Text>
    );
};

const styles = StyleSheet.create({
    h1: theme.typography.h1,
    h2: theme.typography.h2,
    h3: theme.typography.h3,
    body: theme.typography.body,
    caption: theme.typography.caption,
});
